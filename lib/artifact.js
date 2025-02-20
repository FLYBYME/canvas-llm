import Conversation from "./conversation.js";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import fs from "fs/promises";
import { createPatch } from "diff";
import path from "path";


import {
    NEW_ARTIFACT_PROMPT,
    UPDATE_ENTIRE_ARTIFACT_PROMPT,
    GET_TITLE_TYPE_REWRITE_ARTIFACT,
    OPTIONALLY_UPDATE_ARTIFACT_META_SCHEMA,
    PROGRAMMING_LANGUAGES,
    ARTIFACT_TOOL_SCHEMA,
    ROUTE_QUERY_PROMPT,
    ROUTE_QUERY_OPTIONS_HAS_ARTIFACTS,
    ROUTE_QUERY_OPTIONS_NO_ARTIFACTS,
    CURRENT_ARTIFACT_PROMPT,
    NO_ARTIFACT_PROMPT,
    FOLLOWUP_ARTIFACT_PROMPT,
    ADD_COMMENTS_TO_CODE_ARTIFACT_PROMPT,
    ADD_LOGS_TO_CODE_ARTIFACT_PROMPT,
    GIT_COMMIT_MESSAGE_WITH_REFLECTIONS_PROMPT,
    SUMMARIZER_PROMPT,

    GENERATE_FILE_TASKS_PROMPT,
    FileTaskSchema,

    ANALYZE_AND_IMPROVE_ARTIFACT_PROMPT,
    RECOMMENDATIONS_TOOL_SCHEMA,

    DESCRIBE_ARTIFACT_PROMPT,


    SUGGESTED_QUESTIONS_TOOL_SCHEMA,
    SUGGESTED_QUESTIONS_PROMPT,

    FIX_CODE_AND_RESOLVE_TASK_PROMPT,

    FIND_BUGS_IN_ARTIFACT_PROMPT,
    FindBugSchema
} from "../prompts/open-canvas.js";

import { REFLECT_SYSTEM_PROMPT, REFLECT_USER_PROMPT, generateReflectionTool } from "../prompts/reflection.js";

import { TITLE_SYSTEM_PROMPT, TITLE_USER_PROMPT } from "../prompts/thread-title.js";




export default class Artifact {
    constructor(config) {
        this.id = config.id;
        this.conversation = new Conversation(config.id);
        this.filename = config.filename;

        this.loaded = false;

        this.reflections = { styleRules: [], content: [] };
        this.commits = [];
        this.bugs = [];
        this.content = null;
        this.title = null;
        this.type = null;
        this.language = null;
        this.config = config;
        this.modelConfig = {
            model: "gpt-4o-mini",
            temperature: 0,
        };
    }

    getGitDiff() {
        return this.commits[this.commits.length - 1]?.differences;
    }

    isBlank() {
        return this.content === null;
    }

    async init() {
        if (this.loaded) {
            return;
        }

        const filename = this.config.filename;
        if (!filename) {
            throw new Error("No filename found in config.");
        }

        const exists = await fs.access(filename).then(() => true).catch(() => false);
        if (!exists) {
            return;
        }

        console.log(`Loading artifact from ${filename}`);

        const content = await fs.readFile(filename, "utf8");
        this.content = content;
        this.loaded = true;

        const jsonExists = await fs.access(this.config.metaFilename).then(() => true).catch(() => false);
        if (jsonExists) {
            const meta = JSON.parse(await fs.readFile(this.config.metaFilename, "utf8"));
            this.title = meta.title;
            this.type = meta.type;
            this.language = meta.language;
            this.conversation.messages = meta.messages;
            this.reflections = meta.reflections;
            this.bugs = meta.bugs || [];

        } else {
            console.log("Generating title and meta...");
            await Promise.all([
                this.generateTitle(),
                this.updateArtifactMeta(),
                this.generateReflections(),
            ])
        }

        const commitsJsonExists = await fs.access(this.config.commitsFilename).then(() => true).catch(() => false);
        if (commitsJsonExists) {
            this.commits = JSON.parse(await fs.readFile(this.config.commitsFilename, "utf8"));
        }
    }
    async saveContent(content) {
        this.content = content;
        await fs.writeFile(this.config.filename, content);
    }

    async clearMessages() {
        this.conversation.messages = [];
        await this.saveArtifact();
    }

    async chat(message, references = []) {
        this.conversation.addMessage('human', message);
        return this.dynamicDeterminePathFunction()
            .then((res) => {
                if (res === "rewriteArtifact") {
                    return this.rewriteArtifact(references)
                        .then(() => this.generateFollowup());
                } else if (res === "generateArtifact") {
                    return this.generateNewArtifact(references)
                        .then(() => this.generateFollowup());
                } else if (res === "replyToGeneralInput") {
                    return this.generateFollowup();
                } else {
                    throw new Error(`Unknown route: ${res}`)
                }
            })
            .then(async (res) => {
                return this.generateReflections().then(() => res);
            })
    }

    async findBugs() {
        const model = new ChatOpenAI(this.modelConfig).bindTools([{
            name: "find_bugs",
            description: "Find bugs in the artifact based on the user's query.",
            schema: FindBugSchema
        }], {
            tool_choice: "find_bugs"
        }).withConfig({ runName: "find_bugs" });

        const memoriesAsString = await this.getFormattedReflections();

        const formattedFindBugsPrompt = FIND_BUGS_IN_ARTIFACT_PROMPT
            .replace("{artifactContent}", this.formatArtifactContent(this.content))
            .replace("{reflections}", memoriesAsString);

        const result = await model.invoke([
            {
                role: "user",
                content: formattedFindBugsPrompt,
            }
        ]);

        const args = result.tool_calls?.[0].args;
        if (!args) {
            throw new Error("No args found in response");
        }

        this.bugs.push(...args.bugs);
        await this.saveArtifact();

        return args;
    }


    async clearBugs() {
        this.bugs = [];
        await this.saveArtifact();
    }

    async getSuggestedQuestions() {
        const model = new ChatOpenAI(this.modelConfig).bindTools([{
            name: "generate_suggested_questions",
            description: "Generate suggested questions based on the user's query.",
            schema: SUGGESTED_QUESTIONS_TOOL_SCHEMA
        }], {
            tool_choice: "generate_suggested_questions"
        }).withConfig({ runName: "generate_suggested_questions" });

        const memoriesAsString = await this.getFormattedReflections();

        const formattedSuggestedQuestionsPrompt = SUGGESTED_QUESTIONS_PROMPT
            .replace("{artifactContent}", this.formatArtifactContent(this.content))
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

    async generateDescription() {
        const model = new ChatOpenAI(this.modelConfig).withStructuredOutput(
            z.object({
                description: z.string(),
            }),
            {
                name: "generate_description",
            }
        ).withConfig({ runName: "generate_description" });

        const memoriesAsString = await this.getFormattedReflections();

        const formattedSystemPrompt = DESCRIBE_ARTIFACT_PROMPT
            .replace("{artifactContent}", this.formatArtifactContent(this.content))
            .replace("{reflections}", memoriesAsString)
            .replace("{updateMetaPrompt}", "");

        const result = await model.invoke([
            {
                role: "user",
                content: formattedSystemPrompt,
            }
        ]);

        return result.description;
    }

    async generateFileTasks(title, description, files = []) {
        const model = new ChatOpenAI(this.modelConfig).withStructuredOutput(
            FileTaskSchema,
            {
                name: "generate_file_tasks",
            }
        ).withConfig({ runName: "generate_file_tasks" });

        const userRequest = `Generate a structured list of tasks per file based on the description.\n\nTitle: ${title}\n\nDescription: ${description}\n\nFiles: ${files.map((file) => `- ${file}`).join("\n")}`;

        const fullSystemPrompt = GENERATE_FILE_TASKS_PROMPT.replace("{userRequest}", userRequest);

        const contextDocumentMessages = await this.createContextDocumentMessages();

        const result = await model.invoke([
            {
                role: "system",
                content: fullSystemPrompt,
            },
            ...contextDocumentMessages,
            {
                role: "user",
                content: userRequest,
            }
        ]);

        return result;
    }

    async summarizer() {
        const model = new ChatOpenAI(this.modelConfig).withConfig({ runName: "summarizer" });

        const messagesToSummarize = this.conversation.formatMessages()
            .map((message) => `${message.role}: ${message.content}`).join("\n");

        const result = await model.invoke([
            {
                role: "system",
                content: SUMMARIZER_PROMPT,
            },
            {
                role: "user",
                content: `Here are the messages to summarize:\n${messagesToSummarize}`,
            }
        ]);

        const newMessageContent = `The below content is a summary of past messages between the AI assistant and the user.
Do NOT acknowledge the existence of this summary.
Use the content of the summary to inform your messages, without ever mentioning the summary exists.
The user should NOT know that a summary exists.
Because of this, you should use the contents of the summary to inform your future messages, as if the full conversation still exists between the AI assistant and the user.

Here is the summary:
${result.content}`;

        // clear the conversation and add the new message
        this.conversation.clear();
        this.conversation.addMessage('assistant', newMessageContent);

        return this.saveArtifact();
    }

    async generateTitle() {
        const generateTitleTool = {
            name: "generate_title",
            description: "Generate a concise title for the conversation.",
            schema: z.object({
                title: z.string().describe("The generated title for the conversation."),
            }),
        };

        const model = new ChatOpenAI(this.modelConfig).bindTools([generateTitleTool], {
            tool_choice: "generate_title",
        }).withConfig({ runName: "generate_title" });
        const formattedUserPrompt = TITLE_USER_PROMPT.replace(
            "{conversation}",
            this.conversation.formatMessages().map((message) => `${message.role}: ${message.content}`).join("\n")
        ).replace("{artifact_context}", this.content ?? "No artifact found.");

        const result = await model.invoke([
            {
                role: "system",
                content: TITLE_SYSTEM_PROMPT,
            },
            {
                role: "user",
                content: formattedUserPrompt,
            },
        ]);

        const titleToolCall = result.tool_calls?.[0];
        if (!titleToolCall) {
            console.error("FAILED TO GENERATE TOOL CALL", result);
            throw new Error("Title generation tool call failed.");
        }

        const args = titleToolCall.args;
        if (!args) {
            throw new Error("No args found in response");
        }

        console.log("GENERATED TITLE", args.title);

        this.title = args.title;

        await this.saveArtifact();

        return args;
    }

    async fixReview(task) {
        if (!task.review) {
            return;
        }
        console.log("FIXING REVIEW");
        const model = new ChatOpenAI(this.modelConfig).bindTools([{
            name: "rewrite_artifact",
            description: "Rewrite the artifact based on the user's query.",
            schema: ARTIFACT_TOOL_SCHEMA
        }], {
            tool_choice: "rewrite_artifact"
        }).withConfig({ runName: "rewrite_artifact" });

        const memoriesAsString = await this.getFormattedReflections();

        const fixCodeAndResolveTaskPrompt = FIX_CODE_AND_RESOLVE_TASK_PROMPT
            .replace("{filename}", task.filename)
            .replace("{description}", task.description)
            .replace("{type}", task.type)
            .replace("{details}", task.details.join("\n"))
            .replace("{pass}", task.review.pass ? "true" : "false")
            .replace("{suggestions}", task.review.suggestions.join("\n"))
            .replace("{artifactContent}", this.formatArtifactContent(this.content))
            .replace("{reflections}", memoriesAsString);

        const result = await model.invoke([
            {
                role: "user",
                content: fixCodeAndResolveTaskPrompt,
            }
        ]);


        const args = result.tool_calls?.[0].args;
        if (!args) {
            throw new Error("No args found in response");
        }

        this.content = args.artifact;
        await this.saveArtifact();

        return args;
    }

    async rewriteCodeArtifactTheme(action) {
        const model = new ChatOpenAI(this.modelConfig).withConfig({ runName: "rewrite_artifact" });

        const currentArtifactContent = this.content;


        let formattedPrompt = "";

        if (action === "addComments") {
            formattedPrompt = ADD_COMMENTS_TO_CODE_ARTIFACT_PROMPT;
        } else if (action === "addLogs") {
            formattedPrompt = ADD_LOGS_TO_CODE_ARTIFACT_PROMPT;
        } else {
            throw new Error("Invalid action");
        }

        formattedPrompt = formattedPrompt
            .replace("{artifactContent}", this.formatArtifactContent(currentArtifactContent))
            .replace("{reflections}", await this.getFormattedReflections())
            .replace("{conversation}",
                this.conversation.formatMessages().map((message) => `${message.role}: ${message.content}`).join("\n")
            );

        const result = await model.invoke([
            {
                role: "user",
                content: formattedPrompt,
            }
        ]);

        return result

    }

    async generageCommitMessage(oldFile, newFile) {
        console.log("Generating commit message...");

        // Generate the diff
        const differences = createPatch(this.config.filename, oldFile || "", newFile);

        const model = new ChatOpenAI(this.modelConfig).withConfig({ runName: "generate_commit_message" });

        const formattedPrompt = GIT_COMMIT_MESSAGE_WITH_REFLECTIONS_PROMPT
            .replace("{differences}", differences)
            .replace("{reflections}", await this.getFormattedReflections())
            .replace("{conversation}",
                this.conversation.formatMessages().map((message) => `${message.role}: ${message.content}`).join("\n")
            );

        const result = await model.invoke([
            {
                role: "user",
                content: formattedPrompt,
            }
        ]);

        console.log(differences, oldFile || "", newFile)

        this.commits.push({
            message: result.content,
            date: new Date().toISOString(),
            differences
        });

        await fs.writeFile(this.config.commitsFilename, JSON.stringify(this.commits, null, 2));

        return result
    }

    async generateFollowup() {
        console.log("Generating followup...");

        const model = new ChatOpenAI(this.modelConfig).withConfig({ runName: "generate_followup" });

        const artifactContent = this.formatArtifactContent(this.content);

        const memoriesAsString = await this.getFormattedReflections();

        const formattedPrompt = FOLLOWUP_ARTIFACT_PROMPT.replace(
            "{artifactContent}",
            artifactContent || "No artifacts generated yet."
        )
            .replace("{reflections}", memoriesAsString)
            .replace("{conversation}",
                this.conversation.formatMessages().map((message) => `${message.role}: ${message.content}`).join("\n")
            );

        const result = await model.invoke([
            {
                role: "user",
                content: formattedPrompt,
            }
        ]);

        this.conversation.addMessage('assistant', result.content);

        if (this.conversation.messages.length > 10) {
            await this.summarizer();
        } else {
            await this.saveArtifact();
        }
        await this.generateReflections();

        return result.content;
    }

    async dynamicDeterminePathFunction() {
        console.log("Determining route...");

        const currentArtifactContent = this.content;

        const formattedPrompt = ROUTE_QUERY_PROMPT.replace(
            "{artifactOptions}",
            currentArtifactContent
                ? ROUTE_QUERY_OPTIONS_HAS_ARTIFACTS
                : ROUTE_QUERY_OPTIONS_NO_ARTIFACTS
        )
            .replace("{recentMessages}",
                this.conversation.formatMessages().slice(-3).map((message) => `${message.role}: ${message.content}`).join("\n")
            )
            .replace("{currentArtifactPrompt}",
                this.formatArtifactContent(currentArtifactContent, true)
            );
        const artifactRoute = currentArtifactContent
            ? "rewriteArtifact"
            : "generateArtifact";

        const schema = z.object({
            route: z
                .enum(["replyToGeneralInput", artifactRoute])
                .describe("The route to take based on the user's query."),
        });

        const model = new ChatOpenAI(this.modelConfig).bindTools([{
            name: "route_query",
            description: "Determine the route to take based on the user's query.",
            schema: schema
        }], {
            tool_choice: "route_query"
        }).withConfig({ runName: "route_query" });

        const result = await model.invoke([
            {
                role: "user",
                content: formattedPrompt,
            }
        ]);

        const args = result.tool_calls?.[0].args;
        if (!args) {
            throw new Error("No args found in response");
        }

        return args.route;
    }

    async generateReflections() {
        console.log("Generating reflections...");

        const model = new ChatOpenAI(this.modelConfig).bindTools([generateReflectionTool], {
            tool_choice: "generate_reflections",
        }).withConfig({ runName: "generate_reflections" });

        const memoriesAsString = await this.getFormattedReflections();

        const formattedSystemPrompt = REFLECT_SYSTEM_PROMPT.replace(
            "{artifact}",
            this.content ?? "No artifact found."
        ).replace("{reflections}", memoriesAsString);

        const formattedUserPrompt = REFLECT_USER_PROMPT.replace(
            "{conversation}",
            this.conversation.formatMessages().map((message) => `${message.role}: ${message.content}`).join("\n")
        );

        const result = await model.invoke([
            {
                role: "system",
                content: formattedSystemPrompt,
            },
            {
                role: "user",
                content: formattedUserPrompt,
            }
        ]);

        const args = result.tool_calls?.[0].args;
        if (!args) {
            throw new Error("No args found in response");
        }

        console.log(`Reflections generated`);

        this.reflections = args;

        await this.saveArtifact();

        return args;
    }

    async rewriteArtifact(references = []) {
        console.log("Rewriting artifact...");
        const model = new ChatOpenAI(this.modelConfig).bindTools([{
            name: "rewrite_artifact",
            description: "Rewrite the artifact based on the user's query.",
            schema: ARTIFACT_TOOL_SCHEMA
        }], {
            tool_choice: "rewrite_artifact"
        }).withConfig({ runName: "rewrite_artifact" });

        const memoriesAsString = await this.getFormattedReflections();

        const currentArtifactContent = this.getArtifactContent();
        if (!currentArtifactContent) {
            throw new Error("No artifact found");
        }

        const formattedRewriteArtifactPrompt = UPDATE_ENTIRE_ARTIFACT_PROMPT
            .replace("{artifactContent}", this.formatArtifactContent(currentArtifactContent))
            .replace("{reflections}", memoriesAsString)
            .replace("{updateMetaPrompt}", "");

        const messages = [
            {
                role: "system",
                content: formattedRewriteArtifactPrompt,
            },
        ];

        const contextDocumentMessages = await this.createContextDocumentMessages();
        if (contextDocumentMessages?.length) {
            messages.push(...contextDocumentMessages);
        }

        if (references.length > 0) {
            const contextDocumentMessages = await this.createContextDocumentMessagesOpenAI(
                references.map((reference) => ({
                    type: "text",
                    data: this.formatArtifactContent(reference.content),
                }))
            );
            let contextMessages = [];
            if (contextDocumentMessages?.length) {
                contextMessages = [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: "Use the file(s) and/or text below as context when generating your response.",
                            },
                            ...contextDocumentMessages,
                        ],
                    },
                ];
            }

            messages.push(...contextMessages);

        }

        const rewriteArtifactResponse = await model.invoke(messages);

        const args = rewriteArtifactResponse.tool_calls?.[0].args;
        if (!args) {
            throw new Error("No args found in response");
        }


        this.content = args.artifact;
        this.title = args.title;
        this.type = args.type;
        this.language = args.language;

        await this.saveArtifact();
        await this.generageCommitMessage(currentArtifactContent, args.artifact);
        //await this.generateReflections();

        return args;
    }

    async updateArtifactMeta() {
        console.log("Updating artifact meta...");
        const model = new ChatOpenAI(this.modelConfig).withStructuredOutput(
            OPTIONALLY_UPDATE_ARTIFACT_META_SCHEMA,
            {
                name: "optionallyUpdateArtifactMeta",
            }
        ).withConfig({ runName: "optionally_update_artifact_meta" });

        const memoriesAsString = this.getFormattedReflections();

        const currentArtifactContent = this.getArtifactContent();
        if (!currentArtifactContent) {
            throw new Error("No artifact found");
        }

        const recentHumanMessages = this.conversation.getRecentHumanMessages();

        if (!recentHumanMessages.length) {
            // throw new Error("No recent human messages found");
        }

        const optionallyUpdateArtifactMetaPrompt =
            GET_TITLE_TYPE_REWRITE_ARTIFACT.replace(
                "{artifact}",
                this.formatArtifactContent(currentArtifactContent, true)
            ).replace("{reflections}", memoriesAsString);

        const optionallyUpdateArtifactResponse = await model.invoke([
            {
                role: "system",
                content: optionallyUpdateArtifactMetaPrompt,
            },
            ...recentHumanMessages,
        ]);

        console.log(`Optionally updated artifact meta: ${JSON.stringify(optionallyUpdateArtifactResponse)}`);

        this.title = optionallyUpdateArtifactResponse.title;
        this.type = optionallyUpdateArtifactResponse.type;
        this.language = optionallyUpdateArtifactResponse.language;

        await this.saveArtifact();

        return optionallyUpdateArtifactResponse;
    }

    getArtifactContent() {
        return this.content ?? "No artifact found.";
    }

    formatArtifactContent(content, shortenContent) {
        content = this.getArtifactContent();
        return `Title: ${this.title}\nArtifact type: ${this.type}\n Artifact filename: ${this.filename}\nContent: ${shortenContent ? content.substring(0, 500) : content}`;
    }

    async generateNewArtifact(references = []) {
        console.log("Generating new artifact...");
        const model = new ChatOpenAI(this.modelConfig).bindTools([{
            name: "generate_artifact",
            description: "Generate a new artifact based on the user's query.",
            schema: ARTIFACT_TOOL_SCHEMA
        }], {
            tool_choice: "generate_artifact"
        }).withConfig({ runName: "generate_artifact" });

        const memoriesAsString = await this.getFormattedReflections();

        const formattedNewArtifactPrompt = NEW_ARTIFACT_PROMPT.replace("{reflections}", memoriesAsString).replace(
            "{disableChainOfThought}",
            // this.config.model.includes("claude")
            //    ? "\n\nIMPORTANT: Do NOT preform chain of thought beforehand. Instead, go STRAIGHT to generating the tool response. This is VERY important."
            ""
        );

        const userSystemPrompt = this.getUserSystemPrompt();
        const fullSystemPrompt = userSystemPrompt
            ? `${userSystemPrompt}\n${formattedNewArtifactPrompt}`
            : formattedNewArtifactPrompt;

        const messages = [
            {
                role: "system",
                content: fullSystemPrompt,
            },
        ];

        const contextDocumentMessages = await this.createContextDocumentMessages();
        if (contextDocumentMessages?.length) {
            messages.push(...contextDocumentMessages);
        }

        if (references.length > 0) {
            const contextDocumentMessages = await this.createContextDocumentMessagesOpenAI(
                references.map((reference) => ({
                    type: "text",
                    data: this.formatArtifactContent(reference.content),
                }))
            );
            let contextMessages = [];
            if (contextDocumentMessages?.length) {
                contextMessages = [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: "Use the file(s) and/or text below as context when generating your response.",
                            },
                            ...contextDocumentMessages,
                        ],
                    },
                ];
            }

            messages.push(...contextMessages);

        }

        const response = await model.invoke(messages);

        const args = response.tool_calls?.[0].args;
        if (!args) {
            throw new Error("No args found in response");
        }

        this.content = args.artifact;
        this.title = args.title;
        this.type = args.type;
        this.language = args.language;

        await this.saveArtifact();
        await this.generageCommitMessage(null, args.artifact);
        await this.generateReflections();

        return args;
    }

    toJSON() {
        return {
            id: this.id,
            filename: this.filename,
            title: this.title,
            type: this.type,
            language: this.language,
            messages: this.conversation.messages,
            reflections: this.reflections,
            bugs: this.bugs,
            content: this.content,
            commits: this.commits
        };
    }

    async saveArtifact() {

        await fs.mkdir(path.dirname(this.config.filename), { recursive: true });

        await fs.writeFile(this.config.filename, this.content ?? "", "utf8");
        const artifactMeta = JSON.stringify({
            title: this.title,
            type: this.type,
            language: this.language,
            messages: this.conversation.messages,
            reflections: this.reflections,
            bugs: this.bugs
        }, null, 2);
        await fs.writeFile(this.config.metaFilename, artifactMeta, "utf8");
    }

    async getFormattedReflections() {
        return this.reflections.content
            .map((reflection) => `- ${reflection}`)
            .join("\n");
    }

    getUserSystemPrompt() {
        return this.config.userSystemPrompt
            ? this.config.userSystemPrompt
            : null;
    }

    async getContextDocuments() {
        const docs = this.config.contextDocuments;
        if (docs && docs.length) {
            return docs;
        }
        return [];
    }

    async createContextDocumentMessages() {
        const docs = await this.getContextDocuments();

        const contextDocumentMessages = await this.createContextDocumentMessagesOpenAI(docs);
        let contextMessages = [];

        if (contextDocumentMessages?.length) {
            contextMessages = [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Use the file(s) and/or text below as context when generating your response.",
                        },
                        ...contextDocumentMessages,
                    ],
                },
            ];
        }

        return contextMessages;

    }

    async createContextDocumentMessagesOpenAI(documents) {
        const messagesPromises = documents.map(async (doc) => {
            let text = "";
            if (doc.type === "application/pdf") {
                text = await convertPDFToText(doc.data);
            } else if (doc.type.startsWith("text/")) {
                text = atob(cleanBase64(doc.data));
            } else if (doc.type === "text") {
                text = doc.data;
            }

            return {
                type: "text",
                text,
            };
        });

        return Promise.all(messagesPromises);
    }

    async generateRecommendations() {
        console.log("Generating recommendations...");
        const model = new ChatOpenAI(this.modelConfig).bindTools([{
            name: "generate_recommendations",
            description: "Generate recommendations based on the user's query.",
            schema: RECOMMENDATIONS_TOOL_SCHEMA
        }], {
            tool_choice: "generate_recommendations"
        }).withConfig({ runName: "generate_recommendations" });

        const memoriesAsString = await this.getFormattedReflections();

        const formattedRecommendationsPrompt = ANALYZE_AND_IMPROVE_ARTIFACT_PROMPT
            .replace("{artifactContent}", this.formatArtifactContent(this.content))
            .replace("{reflections}", memoriesAsString)
            .replace("{conversation}", this.conversation.formatMessages().map((message) => `${message.role}: ${message.content}`).join("\n"));

        const response = await model.invoke([
            {
                role: "user",
                content: formattedRecommendationsPrompt,
            },
        ]);

        const args = response.tool_calls?.[0].args;
        if (!args) {
            throw new Error("No args found in response");
        }

        return args;
    }

}