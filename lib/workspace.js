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
import { console } from "inspector";

export default class Workspace {
    constructor(config) {
        this.artifacts = new Map();
        this.conversation = new Conversation(config.id);

        this.loaded = false;
        this.cwd = config.cwd;
        this.jsonDirectory = `${this.cwd}/json`;
        this.contextDocumentsDirectory = `${this.cwd}/context-documents`;
        this.contextDocuments = [];

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



        await fs.mkdir(this.cwd, { recursive: true });
        await fs.mkdir(this.jsonDirectory, { recursive: true });
        await fs.mkdir(this.contextDocumentsDirectory, { recursive: true });



        // load context documents
        const contextDocuments = await fs.readdir(this.contextDocumentsDirectory, { withFileTypes: true });
        for (const file of contextDocuments) {
            const content = await fs.readFile(`${this.contextDocumentsDirectory}/${file.name}`, "utf8");
            this.contextDocuments.push({
                name: file.name,
                type: 'text',
                data: content
            });
            process.stdout.write(`Loaded context document: ${file.name}\n`);
        }

        const files = await this.readFiles();
        process.stdout.write(`Files: ${JSON.stringify(files, null, 2)}\n`);


        for (const file of files) {
            const artifact = new Artifact({
                id: file,
                cwd: this.cwd,
                filename: `${this.cwd}/${file}`,
                metaFilename: `${this.jsonDirectory}/${file.split('/').join('-')}.meta.json`,
                commitsFilename: `${this.jsonDirectory}/${file.split('/').join('-')}.commits.json`,
                contextDocuments: this.contextDocuments
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

    async readFiles(cwd = this.cwd) {
        const result = [];

        const files = await fs.readdir(cwd, { withFileTypes: true });

        for (const file of files) {
            if (file.isDirectory()) {
                result.push(...await this.readFiles(`${cwd}/${file.name}`));
            } else {
                result.push(`${cwd}/${file.name}`);
            }
        }

        return result.filter((file) => !file.startsWith(`${this.cwd}/json`)
            && cwd !== this.contextDocumentsDirectory && !file.startsWith(`${this.contextDocumentsDirectory}/`))
            .map((file) => file.replace(`${this.cwd}/`, ''));
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
                metaFilename: `${this.jsonDirectory}/${name.split('/').join('-')}.meta.json`,
                commitsFilename: `${this.jsonDirectory}/${name.split('/').join('-')}.commits.json`,
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
console.log(task)
        console.log(`Performing task: ${task.type} ${task.filename}`);

        return artifact.chat(`${task.type} ${task.filename}
${task.description}
${task.details.join("\n")}`, task.references.map((ref) => {
            return this.getArtifact(ref);
        }))
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
                    role: "system",
                    content: reviewPrompt,
                });

                const contextDocumentMessages = await artifact.createContextDocumentMessages();

                messages.push(...contextDocumentMessages);

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


        const contextDocumentMessages = await artifact.createContextDocumentMessages();

        const result = await model.invoke([
            {
                role: "user",
                content: formattedSuggestedQuestionsPrompt,
            },
            ...contextDocumentMessages
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