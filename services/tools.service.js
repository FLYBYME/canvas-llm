"use strict";

const DbService = require("@moleculer/database").Service;
const { MoleculerRetryableError, MoleculerClientError } = require("moleculer").Errors;
const prompts = require("../prompts.js");

/**
 * Ollama tool schema service
 */

module.exports = {
    name: "tools",
    version: 1,

    mixins: [
        DbService({
            adapter: {
                type: "NeDB",
                options: "./db/tools.db"
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
        rest: "/v1/tools",

        fields: {

            // name
            name: {
                type: "string",
                empty: false,
                required: true,
            },

            // description
            description: {
                type: "string",
                empty: false,
                required: true,
            },

            // schema
            schema: {
                type: "object",
                required: false,
                default: {},
            },

            // callback
            callback: {
                type: "string",
                required: false,
                empty: false,
            },

            // input
            input: {
                type: "object",
                required: false,
                default: {},
            },
            // systemPrompt
            systemPrompt: {
                type: "string",
                required: false,
                empty: false,
            },

            // userPrompt
            userPrompt: {
                type: "string",
                required: false,
                empty: false,
            },

            // conversation
            conversation: {
                type: "boolean",
                required: false,
                default: false
            },

            // options
            options: {
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

    hooks: {
        before: {
            create: [
                async (ctx) => {
                    delete ctx.params["'$schema'"];
                }
            ]
        },
        after: {
            create: [

            ]
        }
    },

    /**
     * Actions
     */
    actions: {
        lookup: {
            rest: "GET /lookup/:name",
            params: {
                name: { type: "string" }
            },
            async handler(ctx) {
                const tool = await this.resolveToolByName(ctx, ctx.params.name);
                return tool;
            }
        },
        invoke: {
            rest: "POST /invoke",
            params: {
                name: { type: "string" },
                input: { type: "object", optional: true, default: {} },
                context: { type: "array", optional: true, default: [] }
            },
            async handler(ctx) {
                const [model, tool] = await Promise.all([
                    ctx.call("v1.models.lookup", { name: "gpt-4o-mini" }),
                    ctx.call("v1.tools.lookup", { name: ctx.params.name })
                ]);
                return this.invokeTool(ctx, tool, ctx.params.input, ctx.params.context);
            }
        },


        seedDB: {
            rest: "POST /seed",
            async handler(ctx) {
                return this.loadPrompts();
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
        async resolveTool(ctx, id) {
            const tool = await this.resolveEntities(ctx, { id: id });
            return tool;
        },
        async resolveToolByName(ctx, name) {
            const tool = await this.findEntity(ctx, { query: { name } });
            return tool;
        },

        async getFullPrompt(ctx, tool, input, context) {
            let fullPrompt = tool.systemPrompt;
            const keys = Object.keys(input);
            for (const key of keys) {
                if (tool.input[key])
                    fullPrompt = fullPrompt.replace(tool.input[key], input[key]);
            }
            return fullPrompt;
        },

        async invokeTool(ctx, tool, input, context) {
            this.logger.info(`Invoking tool ${tool.name}`)
            const model = await ctx.call("v1.models.lookup", { name: "gpt-4o-mini" });
            const run = await ctx.call("v1.runs.create", {
                name: tool.name,
                model: model.id,
                tool: tool.id,
                options: {}
            });

            const fullPrompt = await this.getFullPrompt(ctx, tool, input, context);
            await ctx.call("v1.messages.create", {
                run: run.id,
                role: "system",
                content: fullPrompt
            });

            for (const prompt of context) {
                await ctx.call("v1.messages.create", {
                    run: run.id,
                    role: "user",
                    content: prompt
                });
            }

            const runUpdate = await ctx.call("v1.runs.invoke", { id: run.id });
            const result = await ctx.call("v1.messages.getResult", {
                id: runUpdate.response
            });

            return result;
        },

        async loadPrompts() {
            for (const tool of prompts) {
                const found = await this.resolveToolByName(this.broker, tool.name);
                if (!found) {
                    await this.createEntity(this.broker, tool);
                } else {
                    await this.updateEntity(this.broker, { id: found.id, ...tool });
                }
            }

            this.logger.info(`Loaded ${prompts.length} prompts`);
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
        await this.loadPrompts();
    },

    /**
     * Service stopped lifecycle event handler
     */
    async stopped() { }

};