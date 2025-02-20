import Conversation from "./conversation.js";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import fs from "fs/promises";
import { createPatch } from "diff";
import { DynamicStructuredTool, Tool, tool } from "@langchain/core/tools";

import { REFLECT_SYSTEM_PROMPT, REFLECT_USER_PROMPT, generateReflectionTool } from "../prompts/reflection.js";

import {
    GENERATE_FILE_TASKS_PROMPT,
    FileTaskSchema,

    ANALYZE_AND_IMPROVE_ARTIFACT_PROMPT,
    RECOMMENDATIONS_TOOL_SCHEMA,

    SUGGESTED_QUESTIONS_TOOL_SCHEMA,
    SUGGESTED_QUESTIONS_PROMPT,

    TaskSchema,
    GENERATE_TASKS_PROMPT,

    USER_QUESTION_PROMPT,

    REVIEW_CHANGES_PROMPT,
    ReviewChangesSchema
} from "../prompts/open-canvas.js";

import Artifact from "./artifact.js";

export default class Workspace {
    constructor(config) {
        this.artifacts = new Map();
        this.conversation = new Conversation(config.id);

        this.loaded = false;
        this.cwd = config.cwd;
        this.jsonDirectory = `${this.cwd}/json`;

        this.reflections = {
            styleRules: [],
            content: []
        };
        this.tasks = [];
        this.recommendations = [];

        this.modelConfig = {
            model: "gpt-4o-mini",
            temperature: 0,
        };

        this.config = config;
    }

    async chat(description) {
        // first generate a task and then add it to the workspace
        const model = new ChatOpenAI(this.modelConfig)
            .withStructuredOutput(TaskSchema, {
                name: "generate_task",
            }).withConfig({ runName: "generate_task" });

        const messages = [];
        const userRequest = `Generate a task based on the description.\n\nDescription: ${description}`;

        for (const artifact of this.artifacts.values()) {

            const fullUserPrompt = GENERATE_TASKS_PROMPT
                .replace("{artifactContent}", artifact.formatArtifactContent(artifact.content))
                .replace("{reflections}", artifact.getFormattedReflections())
                .replace("{userRequest}", userRequest);

            messages.push({
                role: "user",
                content: fullUserPrompt,
            });
        }



        const task = await model.invoke(messages);

        process.stdout.write(`Task: ${JSON.stringify(task, null, 2)}\n`);

        const result = await this.performTask(task);

        return { task, result };
    }

    async saveWorkspace() {
        await fs.writeFile(`${this.jsonDirectory}/workspace.json`, JSON.stringify({
            tasks: this.tasks,
            reflections: this.reflections,
            recommendations: this.recommendations
        }, null, 2));
    }

    getFormattedReflections() {
        return this.reflections.content
            .map((reflection) => `- ${reflection}`)
            .join("\n");
    }

    async init() {
        if (this.loaded) {
            return;
        }



        await fs.mkdir(this.jsonDirectory, { recursive: true });

        const files = await this.readFiles();
        for (const file of files) {
            const artifact = new Artifact({
                id: file,
                cwd: this.cwd,
                filename: `${this.cwd}/${file}`,
                metaFilename: `${this.jsonDirectory}/${file}.meta.json`,
                commitsFilename: `${this.jsonDirectory}/${file}.commits.json`,
            });
            await artifact.init();
            this.artifacts.set(file, artifact);
        }

        const exists = await fs.access(`${this.jsonDirectory}/workspace.json`).then(() => true).catch(() => false);
        if (exists) {
            const workspace = JSON.parse(await fs.readFile(`${this.jsonDirectory}/workspace.json`, "utf8"));
            this.tasks = workspace.tasks;
            this.reflections = workspace.reflections;
            this.recommendations = workspace.recommendations;
        }

        this.loaded = true;
    }

    async readFiles() {
        const files = await fs.readdir(this.cwd, { withFileTypes: true });
        const fileNames = files
            .filter((file) => file.isFile() && file.name !== "json")
            .map((file) => file.name);

        const folderNames = files
            .filter((file) => file.isDirectory() && file.name !== "json")
            .map((file) => file.name);

        const recursiveFiles = await Promise.all(
            folderNames.map(async (folderName) => {
                const folderFiles = await fs.readdir(
                    `${this.cwd}/${folderName}`,
                    { withFileTypes: true }
                );
                return folderFiles
                    .filter((file) => file.isFile())
                    .map((file) => `${folderName}/${file.name}`);
            })
        );

        return [...fileNames, ...recursiveFiles.flat()];
    }

    async getArtifact(name) {

        if (name.startsWith(this.cwd)) {
            name = name.substring(this.cwd.length + 1);
        }

        if (!this.artifacts.has(name)) {
            const artifact = new Artifact({
                id: name,
                cwd: this.cwd,
                filename: `${this.cwd}/${name}`,
                metaFilename: `${this.jsonDirectory}/${name}.meta.json`,
                commitsFilename: `${this.jsonDirectory}/${name}.commits.json`,
            });
            await artifact.init();
            this.artifacts.set(name, artifact);
        }
        return this.artifacts.get(name);
    }

    async findBugs() {
        const bugs = [];
        for (const artifact of this.artifacts.values()) {
            const result = await artifact.findBugs();
            bugs.push(...result.bugs.map((bug) => {
                return {
                    artifact: artifact.id,
                    ...bug,
                };
            }));
        }

        return bugs;
    }



    async generateFileTasks(description) {
        const model = new ChatOpenAI(this.modelConfig)
            .withStructuredOutput(FileTaskSchema, {
                name: "generate_file_tasks",
            }).withConfig({ runName: "generate_file_tasks" });


        const messages = [];
        const userRequest = `Generate a task based on the description.\n\nDescription: ${description}`;

        const fullUserPrompt = GENERATE_TASKS_PROMPT.replace("{userRequest}", userRequest);

        messages.push({
            role: "system",
            content: fullUserPrompt,
        });

        for (const artifact of this.artifacts.values()) {
            messages.push({
                role: "user",
                content: artifact.formatArtifactContent(artifact.content),
            });
        }

        const tasks = await model.invoke(messages);

        return tasks;

    }

    async question(question) {
        const model = new ChatOpenAI(this.modelConfig).withConfig({ runName: "question" });

        const messages = [];
        const userRequest = `The user asks: ${question}`;

        const fullUserPrompt = USER_QUESTION_PROMPT
            .replace("{reflections}", this.getFormattedReflections())
            .replace("{userRequest}", userRequest);

        messages.push({
            role: "system",
            content: fullUserPrompt,
        });

        for (const artifact of this.artifacts.values()) {
            messages.push({
                role: "user",
                content: artifact.formatArtifactContent(artifact.content),
            });
        }

        const result = await model.invoke(messages);

        return result.content;
    }

    async performTask(task) {
        const artifact = await this.getArtifact(task.filename);

        if (!artifact) {
            throw new Error(`Artifact ${task.filename} not found`);
        }

        this.tasks.push(task);
        await this.saveWorkspace();

        return artifact.chat(`${task.type} ${task.filename}
${task.description}
${task.details.join("\n")}`)
            .then(async (response) => {

                task.response = response;
                await this.saveWorkspace();

                const model = new ChatOpenAI(this.modelConfig)
                    .withStructuredOutput(ReviewChangesSchema, { name: "review" }).withConfig({ runName: "review" });

                const messages = [];

                const reviewPrompt = REVIEW_CHANGES_PROMPT
                    .replace("{filename}", task.filename)
                    .replace("{description}", task.description)
                    .replace("{type}", task.type)
                    .replace("{details}", task.details.join("\n"))
                    .replace("{artifactContent}", artifact.formatArtifactContent(artifact.content))
                    .replace("{gitDiff}", artifact.getGitDiff());

                messages.push({
                    role: "user",
                    content: reviewPrompt,
                });

                const result = await model.invoke(messages);
                task.review = result;
                await this.saveWorkspace();

                if (!task.review.pass) {
                    const result = await artifact.fixReview(task);
                    task.resolution = result;
                    await this.saveWorkspace();
                }

                return task;
            })
    }


    async generateReflection() {

        const model = new ChatOpenAI(this.modelConfig).bindTools([generateReflectionTool], {
            tool_choice: "generate_reflections",
        });

        const messages = [];

        // Loop through the artifacts and generate reflections for each one
        for (const [artifactId, artifact] of this.artifacts.entries()) {
            const memoriesAsString = await artifact.getFormattedReflections();

            const formattedSystemPrompt = REFLECT_SYSTEM_PROMPT.replace(
                "{artifact}",
                artifact.content ?? "No artifact found."
            ).replace("{reflections}", memoriesAsString);
            const formattedUserPrompt = REFLECT_USER_PROMPT.replace(
                "{conversation}",
                artifact.conversation.formatMessages().map((message) => `${message.role}: ${message.content}`).join("\n")
            );

            messages.push({
                role: "system",
                content: formattedSystemPrompt,
            });
            messages.push({
                role: "user",
                content: formattedUserPrompt,
            });
        }

        const result = await model.invoke(messages);


        const args = result.tool_calls?.[0].args;
        if (!args) {
            throw new Error("No args found in response");
        }

        this.reflections = args;
        await this.saveWorkspace();

        return args;
    }

    async generateOverview() {
        const result = [];

        for (const [artifactId, artifact] of this.artifacts.entries()) {
            const description = await artifact.generateDescription();
            result.push({
                id: artifactId,
                filename: artifact.filename,
                description: description
            });
        }

        return result;
    }

    async getSuggestedQuestions() {
        const model = new ChatOpenAI(this.modelConfig).bindTools([{
            name: "generate_suggested_questions",
            description: "Generate suggested questions based on the user's query.",
            schema: SUGGESTED_QUESTIONS_TOOL_SCHEMA
        }], {
            tool_choice: "generate_suggested_questions"
        });

        const memoriesAsString = await this.getFormattedReflections();

        const formattedSuggestedQuestionsPrompt = SUGGESTED_QUESTIONS_PROMPT
            .replace("{overview}", JSON.stringify(await this.generateOverview()))
            .replace("{reflections}", memoriesAsString);

        const result = await model.invoke([
            {
                role: "user",
                content: formattedSuggestedQuestionsPrompt,
            }
        ]);

        const args = result.tool_calls?.[0].args;
        if (!args) {
            throw new Error("No args found in response");
        }

        return args;

    }


    async generateRecommendations() {
        const model = new ChatOpenAI(this.modelConfig).bindTools([{
            name: "generate_recommendations",
            description: "Generate recommendations based on the user's query.",
            schema: RECOMMENDATIONS_TOOL_SCHEMA
        }], {
            tool_choice: "generate_recommendations"
        });

        const messages = [];

        for (const [artifactId, artifact] of this.artifacts.entries()) {
            const memoriesAsString = await artifact.getFormattedReflections();

            const formattedRecommendationsPrompt = ANALYZE_AND_IMPROVE_ARTIFACT_PROMPT
                .replace("{artifactContent}", artifact.formatArtifactContent(artifact.content))
                .replace("{reflections}", memoriesAsString)
                .replace("{conversation}", artifact.conversation.formatMessages().map((message) => `${message.role}: ${message.content}`).join("\n"));

            messages.push({
                role: "user",
                content: formattedRecommendationsPrompt,
            });
        }

        messages.push({
            role: "user",
            content: `Current recommendations: ${JSON.stringify(this.recommendations)}`,
        });

        const result = await model.invoke(messages);

        const args = result.tool_calls?.[0].args;
        if (!args) {
            throw new Error("No args found in response");
        }

        this.recommendations = args.recommendations;
        await this.saveWorkspace();

        return args;
    }
}