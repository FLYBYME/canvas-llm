"use strict";

const DbService = require("@moleculer/database").Service;
const { MoleculerRetryableError, MoleculerClientError } = require("moleculer").Errors;
const fs = require("fs").promises;
const { query } = require("express");
const path = require("path");

/**
 * Ollama workspace schema service
 */

module.exports = {
    name: "workspaces",
    version: 1,

    mixins: [
        DbService({
            adapter: {
                type: "NeDB",
                options: "./db/workspaces.db"
            }
        })
    ],

    /**
     * Service dependencies
     */
    dependencies: [

    ],

    /**
     * Service settings
     */
    settings: {
        rest: "/v1/workspaces",

        fields: {


            name: {
                type: "string",
                required: true,
                empty: false,
            },

            description: {
                type: "string",
                required: true,
                empty: false,
            },

            artifacts: {
                type: "array",
                items: "string",
                required: false,
                default: [],
                populate: {
                    action: "v1.artifacts.resolve"
                }
            },

            workingDirectory: {
                type: "string",
                required: true,
                empty: false,
            },

            codeStructure: {
                type: "object",
                required: false,
                default: {},
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
        lookup: {
            rest: {
                method: "GET",
                path: "/lookup/:name"
            },
            params: {
                name: { type: "string" }
            },
            async handler(ctx) {
                const workspace = await this.resolveByName(ctx, ctx.params.name);
                return workspace;
            }
        },

        artifactFromSource: {
            rest: {
                method: "POST",
                path: "/:id/artifact-from-source"
            },
            params: {
                id: { type: "string" },
                fileName: { type: "string" }
            },
            async handler(ctx) {
                const workspace = await this.resolveEntities(ctx, { id: ctx.params.id });
                if (!workspace) throw new MoleculerClientError(`Workspace ${ctx.params.id} not found`, 404, "WORKSPACE_NOT_FOUND", { id: ctx.params.id });

                const exists = await fs.access(workspace.workingDirectory, fs.constants.F_OK).then(() => true).catch(() => false);
                if (!exists) throw new MoleculerClientError(`Workspace ${ctx.params.id} not found`, 404, "WORKSPACE_NOT_FOUND", { id: ctx.params.id });

                const filePath = path.join(workspace.workingDirectory, ctx.params.fileName);
                const fileContent = await fs.readFile(filePath, "utf-8");

                const { language } = await ctx.call("v1.artifacts.detectLanguage", { fileName: ctx.params.fileName });

                const artifact = await ctx.call("v1.artifacts.create", {
                    workspace: workspace.id,
                    fileName: ctx.params.fileName,
                    filePath: filePath,
                    language: language,
                    content: fileContent,
                    fileType: ctx.params.fileName.includes(".md") ? "documentation" : "code"
                });

                return artifact;
            }
        },

        loadAllArtifacts: {
            rest: {
                method: "POST",
                path: "/:id/load-all-artifacts"
            },
            params: {
                id: { type: "string" }
            },
            async handler(ctx) {
                const workspace = await this.resolveEntities(ctx, { id: ctx.params.id });
                if (!workspace) throw new MoleculerClientError(`Workspace ${ctx.params.id} not found`, 404, "WORKSPACE_NOT_FOUND", { id: ctx.params.id });

                const exists = await fs.access(workspace.workingDirectory, fs.constants.F_OK).then(() => true).catch(() => false);
                if (!exists) throw new MoleculerClientError(`Workspace ${ctx.params.id} not found`, 404, "WORKSPACE_NOT_FOUND", { id: ctx.params.id });

                const files = await this.recursiveFindFiles(ctx, workspace.workingDirectory);
                const artifacts = await Promise.all(files.map(async (file) => {

                    const found = await this.findEntity(ctx, { query: { workspace: workspace.id, filePath: file.path } });
                    if (found) return found;

                    return ctx.call("v1.artifacts.create", {
                        workspace: workspace.id,
                        fileName: file.name,
                        filePath: path.relative(workspace.workingDirectory, file.path),
                        language: file.language,
                        content: file.content,
                        fileType: file.name.includes(".md") ? "documentation" : "code"
                    })
                }));

                for (const artifact of artifacts) {
                    const promises = [
                        ctx.call("v1.artifacts.artifactSummary", { id: artifact.id }),
                        ctx.call("v1.artifacts.artifactMetadata", { id: artifact.id }),
                        ctx.call("v1.artifacts.artifactDependencies", { id: artifact.id })
                    ];
                    await Promise.all(promises);
                }

                return artifacts;
            }
        },

        updateArtifactsMetadata: {
            rest: {
                method: "POST",
                path: "/:id/update-artifacts-metadata"
            },
            params: {
                id: { type: "string" }
            },
            async handler(ctx) {
                const workspace = await this.resolveEntities(ctx, { id: ctx.params.id });
                if (!workspace) throw new MoleculerClientError(`Workspace ${ctx.params.id} not found`, 404, "WORKSPACE_NOT_FOUND", { id: ctx.params.id });

                const artifacts = await ctx.call("v1.artifacts.find", {
                    query: {
                        workspace: workspace.id,
                        //type: "code"
                    }
                });

                for (const artifact of artifacts) {
                    await ctx.call("v1.artifacts.artifactMetadata", { id: artifact.id })
                }

                return artifacts;

            }
        },

        identifyRelevantFiles: {
            rest: {
                method: "POST",
                path: "/:id/identify-relevant-files"
            },
            params: {
                id: { type: "string" },
                question: { type: "string" }
            },
            async handler(ctx) {
                const workspace = await this.resolveEntities(ctx, { id: ctx.params.id });
                if (!workspace) throw new MoleculerClientError(`Workspace ${ctx.params.id} not found`, 404, "WORKSPACE_NOT_FOUND", { id: ctx.params.id });

                const [model, tool, artifacts] = await Promise.all([
                    ctx.call("v1.models.lookup", { name: "gpt-4o-mini" }),
                    ctx.call("v1.tools.lookup", { name: 'IdentifyRelevantFiles' }),
                    ctx.call("v1.artifacts.find", {
                        query: {
                            workspace: workspace.id,
                            fileType: "code"
                        }
                    })
                ]);

                const run = await ctx.call("v1.runs.create", {
                    name: "test",
                    model: model.id,
                    tool: tool.id,
                    options: {}
                });

                await ctx.call("v1.messages.create", {
                    run: run.id,
                    role: "user",
                    content: tool.systemPrompt.replace("{question}", ctx.params.question)
                });

                await ctx.call("v1.messages.create", {
                    run: run.id,
                    role: "user",
                    content: `${artifacts.map((artifact) => `- ${artifact.filePath}: ${artifact.title}`).join("\n")}`
                });

                const result = await ctx.call("v1.runs.invoke", { id: run.id });
                const message = await ctx.call("v1.messages.resolve", { id: result.response });

                const tool_calls = message.tool_calls.map((tool_call) => {
                    return tool_call.args;
                });

                return tool_calls;
            }
        },

        workspaceCodeStructure: {
            rest: {
                method: "POST",
                path: "/:id/workspace-code-structure"
            },
            params: {
                id: { type: "string" }
            },
            async handler(ctx) {
                const workspace = await this.resolveEntities(ctx, { id: ctx.params.id });
                if (!workspace) throw new MoleculerClientError(`Workspace ${ctx.params.id} not found`, 404, "WORKSPACE_NOT_FOUND", { id: ctx.params.id });

                const [model, tool, artifacts] = await Promise.all([
                    ctx.call("v1.models.lookup", { name: "llama3.2:1b" }),
                    ctx.call("v1.tools.lookup", { name: 'WorkspaceCodeStructure' }),
                    ctx.call("v1.artifacts.find", {
                        query: {
                            workspace: workspace.id,
                            fileType: "code"
                        }
                    })
                ]);

                const run = await ctx.call("v1.runs.create", {
                    name: "WorkspaceCodeStructure",
                    model: model.id,
                    tool: tool.id,
                    options: {}
                });

                await ctx.call("v1.messages.create", {
                    run: run.id,
                    role: "user",
                    content: tool.systemPrompt
                });

                for (const artifact of artifacts) {
                    await ctx.call("v1.messages.create", {
                        run: run.id,
                        role: "user",
                        content: `- ${artifact.filePath}
title: ${artifact.title}
summary: ${artifact.summary.extractedSummarie}
keyDetails: 
 - ${artifact.summary.keyDetails.join("\n - ")}`
                    });
                }

                const updatedRun = await ctx.call("v1.runs.invoke", { id: run.id });
                const result = await ctx.call("v1.messages.getResult", { id: updatedRun.response });

                const updated = await this.updateEntity(ctx, { id: ctx.params.id, codeStructure: result });


                return result;
            }

        },

        generateProposedChanges: {
            rest: {
                method: "POST",
                path: "/:id/generate-proposed-changes"
            },
            params: {
                id: { type: "string" }
            },
            async handler(ctx) {
                const workspace = await this.resolveEntities(ctx, { id: ctx.params.id });
                if (!workspace) throw new MoleculerClientError(`Workspace ${ctx.params.id} not found`, 404, "WORKSPACE_NOT_FOUND", { id: ctx.params.id });

                const [model, tool] = await Promise.all([
                    ctx.call("v1.models.lookup", { name: "gpt-4o-mini" }),
                    ctx.call("v1.tools.lookup", { name: 'GenerateProposedChanges' })
                ]);

                const run = await ctx.call("v1.runs.create", {
                    name: "GenerateProposedChanges",
                    model: model.id,
                    tool: tool.id,
                    options: {}
                });

                await ctx.call("v1.messages.create", {
                    run: run.id,
                    role: "user",
                    content: tool.systemPrompt
                });

                await ctx.call("v1.messages.create", {
                    run: run.id,
                    role: "user",
                    content: JSON.stringify(workspace.codeStructure)
                });

                const result = await ctx.call("v1.runs.invoke", { id: run.id });
                const message = await ctx.call("v1.messages.resolve", { id: result.response });

                const args = message.tool_calls[0].args;

                const updated = await this.updateEntity(ctx, { id: ctx.params.id, proposedChanges: args });

                return updated;
            }
        },

        generateInitialFileStructure: {
            rest: {
                method: "POST",
                path: "/:id/generate-initial-file-structure"
            },
            params: {
                id: { type: "string" }
            },
            async handler(ctx) {
                const workspace = await this.resolveEntities(ctx, { id: ctx.params.id });
                if (!workspace) throw new MoleculerClientError(`Workspace ${ctx.params.id} not found`, 404, "WORKSPACE_NOT_FOUND", { id: ctx.params.id });

                const [model, tool] = await Promise.all([
                    ctx.call("v1.models.lookup", { name: "gpt-4o-mini" }),
                    ctx.call("v1.tools.lookup", { name: 'GenerateInitialFileStructure' })
                ]);

                const codeStyle = require('../style-guides/angularjs.json');

                const run = await ctx.call("v1.runs.create", {
                    name: "GenerateInitialFileStructure",
                    model: model.id,
                    tool: tool.id,
                    options: {}
                });

                await ctx.call("v1.messages.create", {
                    run: run.id,
                    role: "user",
                    content: tool.systemPrompt
                });

                await ctx.call("v1.messages.create", {
                    run: run.id,
                    role: "user",
                    content: codeStyle['Project Structure'].join("\n")
                });

                await ctx.call("v1.messages.create", {
                    run: run.id,
                    role: "user",
                    content: "Build an e-commerce landing page using AngularJS and Bootstrap v3. The site should include a homepage that showcases featured products, a product listing page with filtering options, and a product details page. The homepage should have a hero banner with promotional content, testimonials, and a newsletter subscription form. The product listing page should display products in a grid with search and category filters. The product details page should include an image, description, price, and an 'Add to Cart' button. The site should be mobile-friendly and use AngularJS for navigation and dynamic content."
                });

                const result = await ctx.call("v1.runs.invoke", { id: run.id });
                const message = await ctx.call("v1.messages.resolve", { id: result.response });

                const { files } = message.tool_calls[0].args;

                console.log(files)

                const specification = files.find(file => file.fileType === 'javascript');
                console.log(specification)
                const test = await this.actions.javaScriptFileSpecification({ id: ctx.params.id, specification: specification });

                return {
                    specification,
                    test
                }

            }
        },

        javaScriptFileSpecification: {
            rest: {
                method: "POST",
                path: "/:id/java-script-file-specification"
            },
            params: {
                id: { type: "string" },
                specification: { type: "object" }
            },
            async handler(ctx) {
                const workspace = await this.resolveEntities(ctx, { id: ctx.params.id });
                if (!workspace) throw new MoleculerClientError(`Workspace ${ctx.params.id} not found`, 404, "WORKSPACE_NOT_FOUND", { id: ctx.params.id });

                const [model, tool] = await Promise.all([
                    ctx.call("v1.models.lookup", { name: "gpt-4o-mini" }),
                    ctx.call("v1.tools.lookup", { name: 'JavaScriptFileSpecification' })
                ]);

                const run = await ctx.call("v1.runs.create", {
                    name: "JavaScriptFileSpecification",
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
                    content: JSON.stringify(ctx.params.specification)
                });

                const result = await ctx.call("v1.runs.invoke", { id: run.id });
                const message = await ctx.call("v1.messages.resolve", { id: result.response });

                return message.tool_calls[0].args;
            }
        },

        test: {
            rest: "GET /test",
            async handler(ctx) {
                const workspace = await this.createEntity(ctx, {
                    name: "test",
                    description: "test",
                    workingDirectory: "./workspace/workspace/code/"
                });
                return workspace;
            }
        },

        listAllFiles: {
            rest: "GET /:id/files",
            params: {
                id: { type: "string" }
            },
            async handler(ctx) {
                const { id } = ctx.params;
                const workspace = await this.resolveEntities(ctx, { id });
                if (!workspace) throw new MoleculerClientError(`Workspace ${id} not found`, 404, "WORKSPACE_NOT_FOUND", { id });
                const artifacts = await ctx.call("v1.artifacts.find", {
                    query: { workspace: workspace.id },
                    fields: ["id", "name", "filePath", "fileType"]
                });

                return artifacts;
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
        resolveByName(ctx, name) {
            return this.findEntity(ctx, { query: { name } });
        },

        async recursiveFindFiles(ctx, directory) {
            const ignoreList = [
                "node_modules",
                ".git",
                "package-lock.json",
                "yarn.lock"
            ];
            const files = await fs.readdir(directory);
            const filePaths = await Promise.all(files.map(async (file) => {
                if (ignoreList.includes(file)) {
                    return [];
                }
                const filePath = path.join(directory, file);
                const stats = await fs.stat(filePath);
                if (stats.isDirectory()) {
                    return this.recursiveFindFiles(ctx, filePath);
                } else {
                    const content = await fs.readFile(filePath, "utf-8");
                    const language = await ctx.call("v1.artifacts.detectLanguage", { fileName: file });
                    return { path: filePath, name: file, content, language: language.language };
                }
            }));
            return filePaths.flat();
        }
    },

    /**
     * Service created lifecycle event handler
     */
    created() { },

    /**
     * Service started lifecycle event handler
     */
    async started() { },

    /**
     * Service stopped lifecycle event handler
     */
    async stopped() { }

};