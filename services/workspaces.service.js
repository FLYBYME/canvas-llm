"use strict";

const DbService = require("@moleculer/database").Service;
const { MoleculerRetryableError, MoleculerClientError } = require("moleculer").Errors;
const fs = require("fs").promises;
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

            codeStyleGuide: {
                type: "string",
                required: false,
                default: null,
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

        getFileStructure: {
            rest: {
                method: "GET",
                path: "/:id/file-structure"
            },
            params: {
                id: { type: "string" }
            },
            async handler(ctx) {
                const workspace = await this.resolveEntities(ctx, { id: ctx.params.id });
                if (!workspace) throw new MoleculerClientError(`Workspace ${ctx.params.id} not found`, 404, "WORKSPACE_NOT_FOUND", { id: ctx.params.id });

                return ctx.call("v1.file-structures.find", { query: { workspace: workspace.id } });
            }
        },

        updateFileStructure: {
            rest: {
                method: "PUT",
                path: "/:id/file-structure"
            },
            params: {
                id: { type: "string" },
                fileStructure: { type: "object" }
            },
            async handler(ctx) {
                const workspace = await this.resolveEntities(ctx, { id: ctx.params.id });
                if (!workspace) throw new MoleculerClientError(`Workspace ${ctx.params.id} not found`, 404, "WORKSPACE_NOT_FOUND", { id: ctx.params.id });

                return ctx.call("v1.file-structures.update", { ...ctx.params.fileStructure });
            }
        },

        refineFileStructure: {
            rest: {
                method: "PUT",
                path: "/:id/refine-file-structure"
            },
            params: {
                id: { type: "string" },
                fileStructure: { type: "object" }
            },
            async handler(ctx) {
                const workspace = await this.resolveEntities(ctx, { id: ctx.params.id });
                if (!workspace) throw new MoleculerClientError(`Workspace ${ctx.params.id} not found`, 404, "WORKSPACE_NOT_FOUND", { id: ctx.params.id });

                const files = await ctx.call("v1.file-structures.find", { query: { workspace: workspace.id } })

                const [FileStructure] = await Promise.all([
                    ctx.call("v1.tools.lookup", { name: 'FileStructure' })
                ]);

                const fileStructure = await this.generateRun(ctx, {
                    content: [
                        `Improve, refine and optimize the file structure. Add any export function and dependinces if needed.
These are the other files:
${files.map(file => `${file.fileName}${file.fileName === ctx.params.fileStructure.fileName ? ' (current file)' : ''}`).join("\n")}

This is the current file structure:
${JSON.stringify(ctx.params.fileStructure, null, 2)}`
                    ],
                }, FileStructure);

                const result = await ctx.call("v1.messages.getResult", { id: fileStructure.message.id });

                return result[0];
            }
        },

        generateArtifactFromFileStructure: {
            rest: {
                method: "POST",
                path: "/:id/generate-artifact-from-file-structure"
            },
            params: {
                id: { type: "string" },
                fileStructure: { type: "string" }
            },
            async handler(ctx) {
                const workspace = await this.resolveEntities(ctx, { id: ctx.params.id });
                if (!workspace) throw new MoleculerClientError(`Workspace ${ctx.params.id} not found`, 404, "WORKSPACE_NOT_FOUND", { id: ctx.params.id });

                return ctx.call("v1.artifacts.generateArtifactFromFileStructure", { workspace: workspace.id, fileStructure: ctx.params.fileStructure });
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
                    ctx.call("v1.models.lookup", { name: "llama3.1:latest" }),
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
                console.log(result);

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
                id: { type: "string" },
                query: { type: "string" }
            },
            async handler(ctx) {
                const workspace = await this.resolveEntities(ctx, { id: ctx.params.id });
                if (!workspace) throw new MoleculerClientError(`Workspace ${ctx.params.id} not found`, 404, "WORKSPACE_NOT_FOUND", { id: ctx.params.id });

                const [GenerateInitialFileStructure] = await Promise.all([
                    ctx.call("v1.tools.lookup", { name: 'GenerateInitialFileStructure' })
                ]);

                if (!workspace.codeStyleGuide) {
                    throw new MoleculerClientError(`Workspace ${workspace.name} code style guide not found`, 404, "WORKSPACE_CODE_STYLE_GUIDE_NOT_FOUND", { id: ctx.params.id });
                }


                const fileStructure = await this.generateRun(ctx, {
                    content: [
                        workspace.codeStyleGuide,
                        ctx.params.query
                    ]
                }, GenerateInitialFileStructure);

                const { files } = fileStructure.message.tool_calls[0].args;

                console.log('files', files);

                const oldFiles = await ctx.call("v1.file-structures.getForWorkspace", { workspace: workspace.id });

                for (const file of oldFiles) {
                    await ctx.call("v1.file-structures.remove", { id: file.id });
                }

                for (const file of files) {
                    await ctx.call("v1.file-structures.create", { workspace: workspace.id, ...file });
                }

                return workspace;

            }
        },

        generateWorkspaceCodeStyleGuide: {
            rest: {
                method: "POST",
                path: "/:id/generate-workspace-code-style-guide"
            },
            params: {
                id: { type: "string" },
                query: { type: "string" }
            },
            async handler(ctx) {
                const workspace = await this.resolveEntities(ctx, { id: ctx.params.id });
                if (!workspace) throw new MoleculerClientError(`Workspace ${ctx.params.id} not found`, 404, "WORKSPACE_NOT_FOUND", { id: ctx.params.id });

                const [GenerateWorkspaceCodeStyleGuide] = await Promise.all([
                    ctx.call("v1.tools.lookup", { name: 'GenerateWorkspaceCodeStyleGuide' })
                ]);

                const styleGuide = await this.generateRun(ctx, {
                    content: ctx.params.query
                }, GenerateWorkspaceCodeStyleGuide)

                return this.updateEntity(ctx, { id: ctx.params.id, codeStyleGuide: styleGuide.message.content });
            }
        },

        javaScriptFileSpecification: {
            rest: {
                method: "POST",
                path: "/:id/java-script-file-specification"
            },
            params: {
                id: { type: "string" },
                specification: { type: "object" },
                styleGuide: { type: "string" },
            },
            async handler(ctx) {
                const workspace = await this.resolveEntities(ctx, { id: ctx.params.id });
                if (!workspace) throw new MoleculerClientError(`Workspace ${ctx.params.id} not found`, 404, "WORKSPACE_NOT_FOUND", { id: ctx.params.id });

                const [tool, artifactTool] = await Promise.all([
                    ctx.call("v1.tools.lookup", { name: 'JavaScriptFileSpecification' }),
                    ctx.call("v1.tools.lookup", { name: 'GenerateNewArtifact' })
                ]);

                const fileSpecification = await this.generateRun(ctx, {
                    content: [ctx.params.styleGuide, JSON.stringify(ctx.params.specification)]
                }, tool);

                const newArtifact = await this.generateRun(ctx, {
                    content: [ctx.params.styleGuide, JSON.stringify(fileSpecification.message.tool_calls[0].args)]
                }, artifactTool);


                return {
                    newArtifact,
                    fileSpecification
                }
            }
        },

        test: {
            rest: "GET /test",
            async handler(ctx) {
                const workspace = await this.resolveEntities(ctx, { id: 'knwQRN5091jXFICV' });


                const query = "Build an e-commerce landing page using AngularJS and Bootstrap v3. The site should include a homepage that showcases featured products, a product listing page with filtering options, and a product details page. The homepage should have a hero banner with promotional content, testimonials, and a newsletter subscription form. The product listing page should display products in a grid with search and category filters. The product details page should include an image, description, price, and an 'Add to Cart' button. The site should be mobile-friendly and use AngularJS for navigation and dynamic content."

                return this.actions.generateInitialFileStructure({ id: workspace.id, query })
                    .catch(err => {
                        return this.actions.generateWorkspaceCodeStyleGuide({ id: workspace.id, query })
                            .then(() => this.actions.generateInitialFileStructure({ id: workspace.id, query }))
                    })
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