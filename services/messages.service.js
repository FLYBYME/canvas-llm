"use strict";

const DbService = require("@moleculer/database").Service;
const { MoleculerRetryableError, MoleculerClientError } = require("moleculer").Errors;


/**
 * Ollama agents messages service
 */
module.exports = {
    name: "messages",
    version: 1,

    mixins: [
        DbService({
            adapter: {
                type: "NeDB",
                options: "./db/messages.db"
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
        rest: "/v1/messages",

        fields: {

            // run
            run: {
                type: "string",
                required: true,
                empty: false,
                populate: {
                    action: "v1.runs.resolve"
                }
            },

            // role
            role: {
                type: "string",
                required: true,
                empty: false,
                enum: ["user", "assistant", "system", "tool"],
            },

            // content
            content: {
                type: "string",
                required: false,
                default: "",
            },

            tool: {
                type: "string",
                required: false,
                populate: {
                    action: "v1.tools.resolve"
                }
            },

            // tool_calls
            tool_calls: {
                type: "array",
                items: {
                    type: "object",
                },
                required: false,
                default: [],
            },

            id: {
                type: "string",
                primaryKey: true,
                secure: true,
                columnName: "_id"
            },
            options: { type: "object" },
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
        getByRun: {
            rest: "GET /run/:id",
            params: {
                id: { type: "string" }
            },
            async handler(ctx) {
                const messages = await this.findEntities(ctx, {
                    query: { run: ctx.params.id },
                    sort: 'createdAt'
                });

                return this.formatMessages(ctx, messages);
            }
        },

        getResult: {
            rest: "GET /:id/result",
            params: {
                id: { type: "string" }
            },
            async handler(ctx) {
                const message = await this.resolveEntities(ctx, { id: ctx.params.id });
                if (!message) throw new MoleculerClientError(`Message ${ctx.params.id} not found`, 404, "MESSAGE_NOT_FOUND", { id: ctx.params.id });

                if (message.tool_calls && message.tool_calls.length > 0) {
                    return message.tool_calls.map((tool_call) => {
                        return tool_call.args;
                    });
                }

                try {
                    return JSON.parse(message.content);
                } catch (e) {
                    console.log(e);
                    console.log(message.content);
                    return message.content;
                }
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
    events: {

    },

    /**
     * Methods
     */
    methods: {
        formatMessages(ctx, messages) {
            return messages.map((message) => {
                const formattedMessage = {
                    role: message.role,
                    content: message.content
                };

                if (message.tool_calls && message.tool_calls.length > 0) {
                    formattedMessage.tool_calls = message.tool_calls;
                }

                return formattedMessage;
            });
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