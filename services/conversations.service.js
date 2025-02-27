"use strict";

const DbService = require("@moleculer/database").Service;

/**
 * Conversations service
 */
module.exports = {
    name: "conversations",
    version: 1,

    mixins: [
        DbService({
            adapter: {
                type: "NeDB",
                options: "./db/conversations.db"
            }
        })
    ],

    /**
     * Service dependencies
     */
    dependencies: [],

    /**
     * Service settings
     */
    settings: {
        rest: "/v1/conversations",

        fields: {
            // title
            title: {
                type: "string",
                required: true,
                empty: false,
            },

            // description
            description: {
                type: "string",
                required: false,
                default: "",
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
            deletedAt: {
                type: "number",
                readonly: true,
                hidden: "byDefault",
                onRemove: () => Date.now(),
            }
        },

        indexes: [],

        defaultPopulates: [],

        scopes: {
            notDeleted: { deletedAt: null }
        },

        defaultScopes: [
            // 'notDeleted'
        ],

        // default init config settings
        config: {}
    },

    /**
     * Actions
     */
    actions: {
        addMessage: {
            rest: {
                method: "POST",
                path: "/:id/messages"
            },
            params: {
                id: {
                    type: "string",
                    required: true
                },
                message: {
                    type: "string",
                    required: true
                }
            },
            async handler(ctx) {
                const { id, message } = ctx.params;
                const conversation = await this.resolveEntities(ctx, { id: id });
                if (!conversation) throw new MoleculerClientError(`Conversation ${id} not found`, 404, "CONVERSATION_NOT_FOUND", { id: id });

                const newMessage = await ctx.call("v1.messages.create", { run: id, role: "user", content: message });
                return newMessage;
            }
        },

        invoke: {
            rest: "POST /:id/invoke",
            params: {
                id: { type: "string" }
            },
            async handler(ctx) {
                const { id } = ctx.params;
                const conversation = await this.resolveEntities(ctx, { id: id });
                if (!conversation) throw new MoleculerClientError(`Conversation ${id} not found`, 404, "CONVERSATION_NOT_FOUND", { id: id });

                const [model, tool, messages] = await Promise.all([
                    ctx.call("v1.models.lookup", { name: "gpt-4o-mini" }),
                    ctx.call("v1.tools.lookup", { name: 'Conversation' }),
                    ctx.call("v1.messages.getConversation", { id: id })
                ]);

                const run = await ctx.call("v1.runs.create", {
                    name: "Conversation",
                    model: model.id,
                    tool: tool.id,
                    options: {}
                });
                await ctx.call("v1.messages.create", { 
                    run: run.id, 
                    role:"system",
                    content: tool.systemPrompt.replace("{topic}", conversation.description || "Conversation has no description") 
                });


                for (const message of messages) {
                    await ctx.call("v1.messages.create", { run: run.id, role: message.role, content: message.content });
                }

                const updated = await ctx.call("v1.runs.invoke", { id: run.id });
                const result = await ctx.call("v1.messages.getResult", { id: updated.response }).then(res => res.shift());
console.log(result)
                return ctx.call("v1.messages.create", { run: id, role: "assistant", content: result.response });

                return { message, run: updated };
            }
        },

        clearConversation: {
            rest: "DELETE /:id/clear",
            params: {
                id: { type: "string" }
            },
            async handler(ctx) {
                const { id } = ctx.params;
                const conversation = await this.resolveEntities(ctx, { id: id });
                if (!conversation) throw new MoleculerClientError(`Conversation ${id} not found`, 404, "CONVERSATION_NOT_FOUND", { id: id });
                const messages = await ctx.call("v1.messages.getConversation", { id: id });
                for (const message of messages) {
                    await ctx.call("v1.messages.remove", { id: message.id });
                }

                return true;
            }
        }
    },

    /**
     * Events
     */
    events: {},

    /**
     * Methods
     */
    methods: {},

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
