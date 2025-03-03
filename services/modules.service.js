"use strict";
const DbService = require("@moleculer/database").Service;
const { MoleculerRetryableError, MoleculerClientError } = require("moleculer").Errors;

/**
 * File structure service
 */
module.exports = {
    name: "modules",
    version: 1,

    mixins: [
        DbService({
            adapter: {
                type: "NeDB",
                options: "./db/modules.db"
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
        rest: "/v1/modules",

        fields: {
            workspace: {
                type: "string",
                required: true,
                empty: false,
                populate: {
                    action: "v1.workspaces.resolve"
                }
            },

            fileStructure: {
                type: "string",
                required: false,
                empty: false,
                populate: {
                    action: "v1.file-structures.resolve"
                }
            },

            moduleName: {
                type: "string",
                required: true,
                empty: false,
            },

            description: {
                type: "string",
                required: false,
                empty: false,
            },

            dependencies: {
                type: "array",
                items: {
                    type: "object",
                    fields: {
                        name: {
                            type: "string",
                            required: true,
                            empty: false,
                        },
                        version: {
                            type: "string",
                            required: true,
                            empty: false,
                        },
                        source: {
                            type: "string",
                            required: false,
                            empty: false,
                        },
                    }
                },
                required: false,
                default: [],
            },

            exports: {
                type: "array",
                items: {
                    type: "object",
                    fields: {
                        name: {
                            type: "string",
                            required: true,
                            empty: false,
                        },
                        type: {
                            type: "string",
                            required: true,
                            empty: false,
                        },
                        description: {
                            type: "string",
                            required: false,
                            empty: false,
                        }
                    }
                },
                required: false,
                default: [],
            },

            classes: {
                type: "array",
                items: {
                    type: "string",
                    required: true,
                    empty: false
                },
                required: false,
                default: [],
                populate: {
                    action: "v1.classes.resolve"
                }
            },

            documentation: {
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
        },

        indexes: [],

        defaultPopulates: [],

        scopes: {
            //notDeleted: { deletedAt: null }
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
        getForWorkspace: {
            rest: {
                method: "GET",
                path: "/workspace/:workspace",
            },
            params: {
                workspace: {
                    type: "string",
                    optional: false,
                    empty: false,
                },
            },
            async handler(ctx) {
                return await this.findEntities(ctx, { query: { workspace: ctx.params.workspace }, sort: 'createdAt' });
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
