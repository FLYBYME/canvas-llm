"use strict";
const { PROGRAMMING_LANGUAGES } = require("../lib/constants.js");
const DbService = require("@moleculer/database").Service;
const { MoleculerRetryableError, MoleculerClientError } = require("moleculer").Errors;

/**
 * File structure service
 */
module.exports = {
    name: "file-structures",
    version: 1,

    mixins: [
        DbService({
            adapter: {
                type: "NeDB",
                options: "./db/file-structure.db"
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
        rest: "/v1/file-structures",

        fields: {

            workspace: {
                type: "string",
                required: true,
                empty: false,
                populate: {
                    action: "v1.workspaces.resolve"
                }
            },

            fileName: {
                type: "string",
                required: true,
                empty: false,
            },
            filePath: {
                type: "string",
                required: true,
                empty: false,
            },
            type: {
                type: "string",
                required: true,
                empty: false,
            },
            language: {
                type: "string",
                required: true,
                empty: false,
            },
            description: {
                type: "string",
                required: true,
                empty: false,
            },

            isClassDefinition: {
                type: "boolean",
                required: false,
                default: false,
            },
            className: {
                type: "string",
                required: false,
                default: "",
            },

            isModuleDefinition: {
                type: "boolean",
                required: false,
                default: false,
            },
            moduleName: {
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
                return this.findEntities(ctx, { query: { workspace: ctx.params.workspace } });
            }
        },

        generateFileStructures: {
            rest: {
                method: "GET",
                path: "/generate/:workspace",
            },
            params: {
                workspace: {
                    type: "string",
                    optional: false,
                    empty: false,
                },
            },
            async handler(ctx) {
                const workspace = await ctx.call("v1.workspaces.resolve", { id: ctx.params.workspace });
                if (!workspace) throw new MoleculerClientError(`Workspace ${ctx.params.workspace} not found`, 404, "WORKSPACE_NOT_FOUND", { id: ctx.params.workspace });

                const files = await this.findEntities(ctx, { query: { workspace: ctx.params.workspace } });

                const result = await ctx.call("v1.tools.invoke", {
                    name: "FileStructureBlueprint",
                    input: {},
                    context: [
                        JSON.stringify(files),
                        JSON.stringify(workspace.requirements),
                    ]
                });

                return result[0].files;
            }
        },

        refineFileStructure: {
            rest: "POST /:id/refine",
            params: {
                id: {
                    type: "string",
                    optional: false,
                    empty: false,
                },
            },
            async handler(ctx) {

                const file = await this.resolveEntities(ctx, { id: ctx.params.id });
                if (!file) throw new MoleculerClientError(`File structure ${ctx.params.id} not found`, 404, "FILE_STRUCTURE_NOT_FOUND", { id: ctx.params.id });

                const workspace = await ctx.call("v1.workspaces.resolve", { id: file.workspace });
                if (!workspace) throw new MoleculerClientError(`Workspace ${file.workspace} not found`, 404, "WORKSPACE_NOT_FOUND", { id: file.workspace });

                const result = await ctx.call("v1.tools.invoke", {
                    name: "FileStructureRefinement",
                    input: {},
                    context: [
                        JSON.stringify(workspace.requirements),
                        JSON.stringify(file),
                    ]
                });

                return result[0];
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
