
const { generateArtifactTool } = require("../lib/helpers/artifact");
const z = require("zod");
const { zodToJsonSchema } = require("zod-to-json-schema");
const DbService = require("@moleculer/database").Service;
const { MoleculerRetryableError, MoleculerClientError } = require("moleculer").Errors;
const fs = require("fs").promises;
const path = require("path");

const PROGRAMMING_LANGUAGES = require("../lib/programming-languages.js");
const diff = require("diff");
const { input } = require("../prompts/js-class.js");

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

            fileStructure: {
                type: "string",
                required: false,
                populate: {
                    action: "v1.file-structures.resolve"
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

        defaultPopulates: [
            "fileStructure",
        ],

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

        getProgrammingLanguages: {
            rest: {
                method: "GET",
                path: "/programming-languages"
            },
            async handler(ctx) {
                return PROGRAMMING_LANGUAGES;
            }
        },

        generateArtifactFromFileStructure: {
            rest: {
                method: "POST",
                path: "/generate-artifact-from-file-structure"
            },
            params: {
                workspace: { type: "string" },
                fileStructure: { type: "string" }
            },
            async handler(ctx) {
                const workspace = await ctx.call("v1.workspaces.resolve", { id: ctx.params.workspace });
                if (!workspace) throw new MoleculerClientError(`Workspace ${ctx.params.workspace} not found`, 404, "WORKSPACE_NOT_FOUND", { id: ctx.params.workspace });
                const fileStructure = await ctx.call("v1.file-structures.resolve", { id: ctx.params.fileStructure });
                if (!fileStructure) throw new MoleculerClientError(`File structure ${ctx.params.fileStructure} not found`, 404, "FILE_STRUCTURE_NOT_FOUND", { id: ctx.params.fileStructure });


                const [model, GenerateNewArtifact] = await Promise.all([
                    ctx.call("v1.models.lookup", { name: "gpt-4o-mini" }),
                    ctx.call("v1.tools.lookup", { name: 'GenerateNewArtifact' })
                ]);

                const run = await this.generateRun(ctx, {
                    content: [
                        workspace.codeStyleGuide,
                        JSON.stringify(fileStructure)
                    ]
                }, GenerateNewArtifact);

                const result = await ctx.call("v1.messages.getResult", { id: run.message.id })
                    .then((result) => result.shift());
                const filePath = path.join(workspace.workingDirectory, result.fileName);

                const artifact = await ctx.call("v1.artifacts.create", {
                    workspace: workspace.id,
                    title: result.title,
                    fileName: result.fileName,
                    filePath: filePath,
                    language: result.language,
                    content: result.artifact,
                    fileType: result.fileName.includes(".md") ? "documentation" : "code",
                    fileStructure: fileStructure.id
                });
                return artifact;
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

                const result = await ctx.call("v1.tools.invoke", {
                    name: "ArtifactMeta",
                    input: {},
                    context: [
                        this.formatArtifactContent(artifact)
                    ]
                }).then((result) => result.shift());

                return this.updateEntity(ctx, {
                    id,
                    title: result.title,
                    description: result.description,
                    type: result.type,
                    language: result.language
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

                const result = await ctx.call("v1.tools.invoke", {
                    name: "ArtifactDependencies",
                    input: {},
                    context: [
                        this.formatArtifactContent(artifact)
                    ]
                });

                return this.updateEntity(ctx, { id, dependencies: result });
            }
        },

        artifactIssues: {
            rest: "POST /:id/issues",
            params: {
                id: { type: "string" },
            },
            async handler(ctx) {
                const { id } = ctx.params;
                const artifact = await this.resolveEntities(ctx, { id });
                if (!artifact) throw new MoleculerClientError(`Artifact ${id} not found`, 404, "ARTIFACT_NOT_FOUND", { id });

                const result = await ctx.call("v1.tools.invoke", {
                    name: "ArtifactIssuesAnalysis",
                    input: {
                        artifact: artifact.content,
                        language: artifact.language
                    },
                    context: [JSON.stringify(artifact.fileStructure)]
                }).then(response => response.shift());

                return this.updateEntity(ctx, { id, issues: result.issues });
            }
        },

        resolveIssue: {
            rest: "POST /:id/resolve-issue",
            params: {
                id: { type: "string" },
                issue: { type: "object" },
                review: { type: "object", optional: true }
            },
            async handler(ctx) {
                const { id } = ctx.params;
                const artifact = await this.resolveEntities(ctx, { id });
                if (!artifact) throw new MoleculerClientError(`Artifact ${id} not found`, 404, "ARTIFACT_NOT_FOUND", { id });

                const issue = ctx.params.issue;

                const proposedChanges = await ctx.call("v1.tools.invoke", {
                    name: "ArtifactIssueProposedChanges",
                    input: {
                        artifact: artifact.content,
                        language: artifact.language,
                        'issue.severity': issue.severity,
                        'issue.description': issue.description,
                        'issue.suggestion': issue.suggestion
                    },
                    context: [
                        
                    ]
                }).then(response => response.shift());


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
            return `${shorten ? artifact.content.substring(0, 500) : artifact.content}\n`
        },

        async generateRun(ctx, { content }, artifactTool) {
            const [model] = await Promise.all([
                ctx.call("v1.models.lookup", { name: "gpt-4o-mini" }),
            ]);
            const artifactRun = await ctx.call("v1.runs.create", {
                name: artifactTool.name,
                model: model.id,
                tool: artifactTool.id,
                options: {}
            });

            await ctx.call("v1.messages.create", {
                run: artifactRun.id,
                role: "system",
                content: artifactTool.systemPrompt
            });

            if (Array.isArray(content)) {
                for (const c of content) {
                    await ctx.call("v1.messages.create", {
                        run: artifactRun.id,
                        role: "user",
                        content: typeof c === "string" ? c : JSON.stringify(c)
                    });
                }
            } else {
                await ctx.call("v1.messages.create", {
                    run: artifactRun.id,
                    role: "user",
                    content: typeof content === "string" ? content : JSON.stringify(content)
                });
            }

            const updated = await ctx.call("v1.runs.invoke", { id: artifactRun.id });
            console.log(updated)
            const message = await ctx.call("v1.messages.resolve", { id: updated.response });

            return { message, run: updated };
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