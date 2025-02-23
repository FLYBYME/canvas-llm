"use strict";

const DbService = require("@moleculer/database").Service;
const { MoleculerRetryableError, MoleculerClientError } = require("moleculer").Errors;
const prompts = require("../prompts");

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
        call: {
            rest: "POST /:id/call/:member",
            params: {
                id: { type: "string" },
                member: { type: "string" },
                args: { type: "object" }
            },
            async handler(ctx) {
                const tool = await this.resolveTool(ctx, ctx.params.id);
                const data = {
                    ...ctx.params.args,
                    ...tool.options
                };
                console.log('data', data);
                return ctx.call(tool.action, data);
            }
        },


        seedDB: {
            rest: "POST /seed",
            async handler(ctx) {
                const count = await this.countEntities(null, {});
                if (count > 0) {
                    return;
                }
                const tools = [];
                for (const tool of SeedTools) {
                    tools.push(await this.createEntity(ctx, tool));
                }
                return tools;
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
        
        async loadPrompts() {
            for (const tool of prompts) {
                const found = await this.resolveToolByName(this.broker, tool.name);
                if (!found) {
                    await this.createEntity(this.broker, tool);
                }else{
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