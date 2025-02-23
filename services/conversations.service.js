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

            // reflections
            reflections: {
                type: "object",
                required: false,
                properties: {
                    styleRules: {
                        type: "array",
                        items: "string",
                        required: false,
                        default: [],
                    },
                    content: {
                        type: "array",
                        items: "string",
                        required: false,
                        default: [],
                    },
                    lastReflection: {
                        type: "number",
                        required: false,
                        default: 0
                    }
                },
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
            'notDeleted'
        ],

        // default init config settings
        config: {}
    },

    /**
     * Actions
     */
    actions: {
        // Define actions here if needed
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
