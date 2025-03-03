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

            workingDirectory: {
                type: "string",
                required: true,
                empty: false,
            },

            requirements: {
                type: "object",
                required: false,
                default: {},
            },

            conversation: {
                type: "string",
                required: false,
                empty: false,
                populate: {
                    action: "v1.conversations.resolve"
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

        generateRequirements: {
            rest: "POST /:id/requirements",
            params: {
                id: { type: "string" },
            },
            async handler(ctx) {
                const workspace = await this.resolveEntities(ctx, { id: ctx.params.id });
                if (!workspace) throw new MoleculerClientError(`Workspace ${ctx.params.id} not found`, 404, "WORKSPACE_NOT_FOUND", { id: ctx.params.id });

                const messages = await ctx.call("v1.messages.getConversation", { id: workspace.conversation });

                const context = [];

                context.push(messages.map((message) => `${message.role}: ${message.content}`).join("\n"));

                const result = await ctx.call("v1.tools.invoke", {
                    name: "ProjectRequirementsDocument",
                    input: {},
                    context
                }).then(res => res.shift());

                return this.updateEntity(ctx, {
                    id: workspace.id,
                    requirements: result
                });
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