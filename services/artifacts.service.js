
const { generateArtifactTool } = require("../lib/helpers/artifact");
const z = require("zod");
const { zodToJsonSchema } = require("zod-to-json-schema");
const DbService = require("@moleculer/database").Service;
const { MoleculerRetryableError, MoleculerClientError } = require("moleculer").Errors;
const fs = require("fs").promises;
const path = require("path");

const PROGRAMMING_LANGUAGES = require("../lib/programming-languages.js");
const { title } = require("process");
const { type } = require("os");
const { dependencies } = require("./workspaces.service.js");

/**
 * Ollama workspace schema service
 */

module.exports = {
    name: "artifacts",
    version: 1,

    mixins: [
        DbService({
            adapter: {
                type: "NeDB",
                options: "./db/artifacts.db"
            }
        })
    ],

    /**
     * Service dependencies
     */
    dependencies: [
        {
            name: "tools",
            version: 1
        }
    ],

    /**
     * Service settings
     */
    settings: {
        rest: "/v1/artifacts",

        fields: {

            // Workspace
            workspace: {
                type: "string",
                required: true,
                empty: false,
                populate: {
                    action: "v1.workspaces.resolve"
                }
            },

            // Title
            title: {
                type: "string",
                required: false,
                default: "Title not set",
            },

            // Description
            description: {
                type: "string",
                required: false,
                default: "Description not set",
            },

            // File Name
            fileName: {
                type: "string",
                required: true,
                empty: false,
            },

            // File Path
            filePath: {
                type: "string",
                required: true,
                empty: false,
            },

            // File Type
            fileType: {
                type: "string",
                required: true,
                empty: false,
                enum: ["text", "code", "documentation", "test"],
            },

            // Language
            language: {
                type: "string",
                required: true,
                empty: false,
            },

            // Content
            content: {
                type: "string",
                required: true,
                empty: false,
            },

            // Context Documents
            contextDocuments: {
                type: "array",
                items: "string",
                required: false,
                default: [],
                populate: {
                    action: "v1.artifacts.resolve"
                }
            },

            // Summary
            summary: {
                type: "object",
                required: false,
                default: {},
            },

            // Metadata
            metadata: {
                type: "object",
                required: false,
                default: {},
            },

            // Dependencies
            dependencies: {
                type: "array",
                items: "object",
                required: false,
                default: [],
            },

            // issues
            issues: {
                type: "array",
                items: "object",
                required: false,
                default: [],
            },

            // functions
            functions: {
                type: "array",
                items: "object",
                required: false,
                default: [],
            },

            // runs
            runs: {
                type: "array",
                items: "string",
                required: false,
                default: [],
                populate: {
                    action: "v1.runs.resolve"
                }
            },

            id: {
                type: "string",
                primaryKey: true,
                secure: true,
                columnName: "_id"
            },
            createdAt: {
                type: "number",
                readonly: true,
                onCreate: () => Date.now(),
            },
            updatedAt: {
                type: "number",
                readonly: true,
                onUpdate: () => Date.now(),
            },
        },

        indexes: [

        ],

        defaultPopulates: [],

        scopes: {
            notDeleted: { deletedAt: null }
        },

        defaultScopes: [
            //   'notDeleted'
        ],

        // default init config settings
        config: {

        }
    },


    /**
     * Actions
     */
    actions: {

        detectLanguage: {
            rest: {
                method: "POST",
                path: "/detect-language"
            },
            params: {
                fileName: { type: "string" },
            },
            async handler(ctx) {
                const { fileName } = ctx.params;

                const extension = path.extname(fileName).slice(1);
                const foundLanguage = PROGRAMMING_LANGUAGES.find((lang) => lang.extension === extension);

                if (!foundLanguage) return { language: "unknown", extension };

                return { language: foundLanguage.language, extension };
            }
        },

        artifactSummary: {
            rest: "POST /:id/summary",
            params: {
                id: { type: "string" },
            },
            async handler(ctx) {
                const { id } = ctx.params;
                const artifact = await this.resolveEntities(ctx, { id });
                if (!artifact) throw new MoleculerClientError(`Artifact ${id} not found`, 404, "ARTIFACT_NOT_FOUND", { id });

                const response = await this.processToolCall(ctx, {
                    fileName: artifact.fileName,
                    filePath: artifact.filePath,
                    fileType: artifact.fileType,
                    language: artifact.language
                }, "FileSummary");

                console.log(response);

                return this.updateEntity(ctx, { id, summary: response });
            }
        },

        artifactMetadata: {
            rest: "POST /:id/metadata",
            params: {
                id: { type: "string" },
            },
            async handler(ctx) {
                const { id } = ctx.params;
                const artifact = await this.resolveEntities(ctx, { id });
                if (!artifact) throw new MoleculerClientError(`Artifact ${id} not found`, 404, "ARTIFACT_NOT_FOUND", { id });

                const [model, tool] = await Promise.all([
                    ctx.call("v1.models.lookup", { name: "gpt-4o-mini" }),
                    ctx.call("v1.tools.lookup", { name: 'ArtifactMeta' })
                ]);

                const run = await ctx.call("v1.runs.create", {
                    name: "test",
                    model: model.id,
                    tool: tool.id,
                    options: {}
                });

                await ctx.call("v1.messages.create", {
                    run: run.id,
                    role: "system",
                    content: tool.systemPrompt
                });

                await ctx.call("v1.messages.create", {
                    run: run.id,
                    role: "user",
                    content: this.formatArtifactContent(artifact, true)
                });

                const result = await ctx.call("v1.runs.invoke", { id: run.id });
                const message = await ctx.call("v1.messages.resolve", { id: result.response });

                const tool_call = message.tool_calls[0].args;

                return this.updateEntity(ctx, {
                    id,
                    title: tool_call.title,
                    description: tool_call.description,
                    type: tool_call.type,
                    language: tool_call.language
                });
            }
        },

        artifactDependencies: {
            rest: "POST /:id/dependencies",
            params: {
                id: { type: "string" },
            },
            async handler(ctx) {
                const { id } = ctx.params;
                const artifact = await this.resolveEntities(ctx, { id });
                if (!artifact) throw new MoleculerClientError(`Artifact ${id} not found`, 404, "ARTIFACT_NOT_FOUND", { id });
                const [model, tool] = await Promise.all([
                    ctx.call("v1.models.lookup", { name: "gpt-4o-mini" }),
                    ctx.call("v1.tools.lookup", { name: 'ArtifactDependencies' })
                ]);

                const run = await ctx.call("v1.runs.create", {
                    name: "test",
                    model: model.id,
                    tool: tool.id,
                    options: {}
                });

                await ctx.call("v1.messages.create", {
                    run: run.id,
                    role: "system",
                    content: tool.systemPrompt
                });

                await ctx.call("v1.messages.create", {
                    run: run.id,
                    role: "user",
                    content: this.formatArtifactContent(artifact)
                });

                const result = await ctx.call("v1.runs.invoke", { id: run.id });
                const message = await ctx.call("v1.messages.resolve", { id: result.response });

                const dependencies = message.tool_calls.map((tool_call) => {
                    return tool_call.args;
                });

                return this.updateEntity(ctx, { id, dependencies });
            }
        },

        codeQualityAnalysis: {
            rest: "POST /:id/quality",
            params: {
                id: { type: "string" },
            },
            async handler(ctx) {
                const { id } = ctx.params;
                const artifact = await this.resolveEntities(ctx, { id });
                if (!artifact) throw new MoleculerClientError(`Artifact ${id} not found`, 404, "ARTIFACT_NOT_FOUND", { id });

                const { issues } = await this.processToolCall(ctx, {
                    code: artifact.content,
                    language: artifact.language,
                }, "CodeQualityAnalysis");

                return this.updateEntity(ctx, { id, issues: issues });
            }
        },

        testCaseGenerator: {
            rest: "POST /:id/test-cases",
            params: {
                id: { type: "string" },
            },
            async handler(ctx) {
                const { id } = ctx.params;
                const artifact = await this.resolveEntities(ctx, { id });
                if (!artifact) throw new MoleculerClientError(`Artifact ${id} not found`, 404, "ARTIFACT_NOT_FOUND", { id });

                const [model, tool] = await Promise.all([
                    ctx.call("v1.models.lookup", { name: "gpt-4o-mini" }),
                    ctx.call("v1.tools.lookup", { name: 'GenerateNewArtifact' })
                ]);

                const run = await ctx.call("v1.runs.create", {
                    name: "test",
                    model: model.id,
                    tool: tool.id,
                    options: {}
                });

                await ctx.call("v1.messages.create", {
                    run: run.id,
                    role: "system",
                    content: tool.systemPrompt
                });

                await ctx.call("v1.messages.create", {
                    run: run.id,
                    role: "user",
                    content: this.formatArtifactContent(artifact)
                });

                await ctx.call("v1.messages.create", {
                    run: run.id,
                    role: "user",
                    content: `You are an AI assistant that generates test cases for a given function.

Analyze the following function and generate appropriate test cases.

Language: ${artifact.language}
Target file: ${artifact.fileName}

Generate a variety of test cases covering different edge cases and scenarios.`
                });


                const result = await ctx.call("v1.runs.invoke", { id: run.id });
                const message = await ctx.call("v1.messages.resolve", { id: result.response });
                const artifactConfigs = message.tool_calls.map((toolCall) => {
                    return toolCall.args;
                });
                const artifacts = [];
                const workspace = await ctx.call("v1.workspaces.resolve", { id: artifact.workspace });

                for (const artifactConfig of artifactConfigs) {

                    const filePath = path.join(workspace.workingDirectory, "test", artifactConfig.fileName);

                    const artifact = await ctx.call("v1.artifacts.create", {
                        workspace: workspace.id,
                        fileName: artifactConfig.fileName,
                        filePath: filePath,
                        language: artifactConfig.language,
                        content: artifactConfig.artifact,
                        fileType: "test"
                    });

                    artifacts.push(artifact);
                }

                return artifacts;
            }
        },

        extractTestableFunctions: {
            rest: "POST /:id/functions",
            params: {
                id: { type: "string" },
            },
            async handler(ctx) {
                const { id } = ctx.params;
                const artifact = await this.resolveEntities(ctx, { id });
                if (!artifact) throw new MoleculerClientError(`Artifact ${id} not found`, 404, "ARTIFACT_NOT_FOUND", { id });

                const { functions } = await this.processToolCall(ctx, {
                    content: artifact.content,
                    language: artifact.language,
                }, "ExtractTestableFunctions");

                console.log(functions)

                return this.updateEntity(ctx, { id, functions: functions });
            }
        },

        fixIssues: {
            rest: "POST /:id/fix",
            params: {
                id: { type: "string" },
            },
            async handler(ctx) {
                const { id } = ctx.params;
                const artifact = await this.resolveEntities(ctx, { id });
                if (!artifact) throw new MoleculerClientError(`Artifact ${id} not found`, 404, "ARTIFACT_NOT_FOUND", { id });

                const [model, tool, workspace] = await Promise.all([
                    ctx.call("v1.models.lookup", { name: "gpt-4o-mini" }),
                    ctx.call("v1.tools.lookup", { name: 'GenerateUpdatedArtifact' }),
                    ctx.call("v1.workspaces.resolve", { id: artifact.workspace })
                ]);

                const severitys = {
                    "low": 1,
                    "medium": 2,
                    "high": 3
                }
                const issue = artifact.issues.sort((a, b) => severitys[a.severity] - severitys[b.severity]).shift();

                const run = await ctx.call("v1.runs.create", {
                    name: "test",
                    model: model.id,
                    tool: tool.id,
                    options: {}
                });

                await ctx.call("v1.messages.create", {
                    run: run.id,
                    role: "system",
                    content: tool.systemPrompt.replace("{artifact}", this.formatArtifactContent(artifact))
                });

                await ctx.call("v1.messages.create", {
                    run: run.id,
                    role: "user",
                    content: `Type: ${issue.type}
Severity: ${issue.severity}
Description: ${issue.description}
Suggestions: ${issue.suggestion}`
                });

                const result = await ctx.call("v1.runs.invoke", { id: run.id });
                const message = await ctx.call("v1.messages.resolve", { id: result.response });
                const artifactConfig = message.tool_calls[0].args;




                return message.tool_calls
            }
        },

        splitArtifact: {
            rest: "POST /:id/split",
            params: {
                id: { type: "string" },
            },
            async handler(ctx) {
                const { id } = ctx.params;
                const artifact = await this.resolveEntities(ctx, { id });
                if (!artifact) throw new MoleculerClientError(`Artifact ${id} not found`, 404, "ARTIFACT_NOT_FOUND", { id });

                const [model, tool, workspace] = await Promise.all([
                    ctx.call("v1.models.lookup", { name: "gpt-4o-mini" }),
                    ctx.call("v1.tools.lookup", { name: 'GenerateNewArtifact' }),
                    ctx.call("v1.workspaces.resolve", { id: artifact.workspace })
                ]);

                const run = await ctx.call("v1.runs.create", {
                    name: "test",
                    model: model.id,
                    tool: tool.id,
                    options: {}
                });

                await ctx.call("v1.messages.create", {
                    run: run.id,
                    role: "system",
                    content: tool.systemPrompt.replace("{artifact}", this.formatArtifactContent(artifact))
                });

                await ctx.call("v1.messages.create", {
                    run: run.id,
                    role: "user",
                    content: this.formatArtifactContent(artifact)
                });

                await ctx.call("v1.messages.create", {
                    run: run.id,
                    role: "user",
                    content: "Please split the artifact into multiple files."
                })

                const result = await ctx.call("v1.runs.invoke", { id: run.id });
                const message = await ctx.call("v1.messages.resolve", { id: result.response });

                return message.tool_callsl
            }
        },

        clearDB: {
            rest: "POST /clear",
            handler(ctx) {
                return this.removeEntities(ctx, {});
            }
        },
    },

    /**
     * Events
     */
    events: {},

    /**
     * Methods
     */
    methods: {
        formatArtifactContent(artifact, shorten = false) {
            return `# ${artifact.filePath}\n\n\`\`\`${artifact.language}\n${shorten ? artifact.content.substring(0, 500) : artifact.content}\n\`\`\``
        },

        async processToolCall(ctx, data, toolName) {
            const [model, tool] = await Promise.all([
                ctx.call("v1.models.lookup", { name: "gpt-4o-mini" }),
                ctx.call("v1.tools.lookup", { name: toolName })
            ]);

            let fullPrompt = tool.systemPrompt;

            const inputKeys = Object.keys(tool.input);
            for (const inputKey of inputKeys) {
                fullPrompt = fullPrompt.replace(tool.input[inputKey], data[inputKey]);
            }

            const run = await ctx.call("v1.runs.create", {
                name: "test",
                model: model.id,
                tool: tool.id,
                options: {}
            });

            await ctx.call("v1.messages.create", {
                run: run.id,
                role: "system",
                content: fullPrompt
            });

            if (data.content) {
                await ctx.call("v1.messages.create", {
                    run: run.id,
                    role: "user",
                    content: data.content
                });
            }

            const result = await ctx.call("v1.runs.invoke", { id: run.id });

            const message = await ctx.call("v1.messages.resolve", { id: result.response });



            return message.tool_calls[0].args;
        }

    },

    /**
     * Service created lifecycle event handler
     */
    created() { },

    /**
     * Service started lifecycle event handler
     */
    async started() {

    },

    /**
     * Service stopped lifecycle event handler
     */
    async stopped() { }

};