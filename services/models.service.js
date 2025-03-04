"use strict";

const DbService = require("@moleculer/database").Service;

const { MoleculerRetryableError, MoleculerClientError } = require("moleculer").Errors;


const SeedModels = [
    {
        name: "deepseek-r1:7b",
        model: "deepseek-r1:7b",
        size: 7,
        type: "ollama",
    },
    {
        name: "llama3.2:1b",
        model: "llama3.2:1b",
        size: 1,
        type: "ollama",
    },
    {
        name: "gpt-4o-mini",
        model: "gpt-4o-mini",
        size: 400,
        type: "openai",
    },
];



/**
 * Ollama model schema service
 */

module.exports = {
    name: "models",
    version: 1,

    mixins: [
        DbService({
            adapter: {
                type: "NeDB",
                options: "./db/models.db"
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
        rest: "/v1/models",

        fields: {

            // name
            name: {
                type: "string",
                empty: false,
                required: true,
            },

            // model
            model: {
                type: "string",
                empty: false,
                required: true,
            },

            // size
            size: {
                type: "number",
                empty: false,
                required: true,
            },

            // type
            type: {
                type: "string",
                empty: false,
                required: true,
                enum: ["ollama", "openai"]
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
                path: "/lookup"
            },
            params: {
                name: { type: "string" }
            },
            async handler(ctx) {
                const { name } = ctx.params;
                return this.findEntity(ctx, { query: { name } });
            }
        },
        seedDB: {
            rest: {
                method: "POST",
                path: "/seed"
            },
            params: {},
            async handler(ctx) {
                const count = await this.countEntities(ctx, {});
                if (count > 0) {
                    return { message: "Models already exist." };
                }
                const models = [];
                for (const model of SeedModels) {
                    const newModel = await this.createEntity(ctx, model);
                    models.push(newModel);
                }

                return models;
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