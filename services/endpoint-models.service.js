"use strict";

const { description } = require("../prompts/js-class");

const DbService = require("@moleculer/database").Service;
const { MoleculerRetryableError, MoleculerClientError } = require("moleculer").Errors;

/**
 * endpoint models schema service
 */
module.exports = {
    name: "endpoint-models",
    version: 1,

    mixins: [
        DbService({
            adapter: {
                type: "NeDB",
                options: "./db/endpoint-models.db"
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
        rest: "/v1/endpoint-models",

        fields: {
            workspace: {
                type: "string",
                required: true,
                empty: false,
                populate: {
                    action: "v1.workspaces.resolve"
                }
            },

            name: {
                type: "string",
                required: true,
                empty: false,
            },

            description: {
                type: "string",
                required: false,
                empty: false,
            },

            fields: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
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
                            empty: true,
                        },
                        populates: {
                            type: "string",
                            required: false,
                            empty: true,
                        },
                        required: {
                            type: "boolean",
                            required: false,
                            default: false,
                        },
                    }
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
        lookup: {
            rest: {
                method: "GET",
                path: "/lookup/:name",
            },
            params: {
                name: {
                    type: "string",
                    optional: false,
                    empty: false,
                },
            },
            async handler(ctx) {
                return await this.findEntity(ctx, { query: { name: ctx.params.name } });
            }
        },

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

        generateListForWorkspace: {
            rest: {
                method: "POST",
                path: "/generate/workspace/:workspace/list",
            },
            async handler(ctx) {
                const workspace = await ctx.call("v1.workspaces.resolve", { id: ctx.params.workspace });
                if (!workspace) {
                    throw new Error("Workspace not found");
                }

                const result = await ctx.call("v1.tools.invoke", {
                    name: "EndpointModelSchemaList",
                    input: {},
                    context: [workspace.description, "Generate a list of endpoint models for the workspace. The fields that are automatically generated are id, createdAt, and updatedAt. Do not include these fields in the list."]
                }).then((response) => {
                    return response.shift();
                });

                for (const schema of result.models) {
                    schema.workspace = workspace.id;
                    const found = await this.findEntity(ctx, { query: { workspace: workspace.id, name: schema.name } });
                    if (!found) {
                        await this.createEntity(ctx, { ...schema });
                    } else {
                        await this.updateEntity(ctx, { id: found.id, ...schema });
                    }
                }

                return this.findEntities(ctx, { query: { workspace: workspace.id }, sort: 'createdAt' });
            }
        },

        refine: {
            rest: {
                method: "POST",
                path: "/:id/refine",
            },
            params: {
                id: {
                    type: "string",
                    optional: false,
                    empty: false,
                },
            },
            async handler(ctx) {
                const endpointModel = await this.resolveEntities(ctx, { id: ctx.params.id });
                if (!endpointModel) {
                    throw new Error("Endpoint model not found");
                }

                const endpointModels = await this.findEntities(ctx, { query: { workspace: endpointModel.workspace } });

                const result = await ctx.call("v1.tools.invoke", {
                    name: "EndpointModelSchema",
                    input: {},
                    context: [`These are the endpoint models for the workspace: \n${endpointModels.map((model) => `${model.name}${model.name === endpointModel.name ? ' (this is the model that needs to be refined)' : ''} - ${model.description}`).join('\n')}`,
                        `This is the endpoint model that needs to be refined: ${endpointModel.name} - ${endpointModel.description}`,
                        "Refine the endpoint model schema. The fields that are automatically generated are id, createdAt, and updatedAt. Do not include these fields in the list."]
                }).then((response) => {
                    return response.shift();
                });
                
                return this.updateEntity(ctx, { id: endpointModel.id, ...result });
            }
        },

        classSchemaToString: {
            rest: {
                method: "POST",
                path: "/:id/class-schema-to-string",
            },
            params: {
                id: {
                    type: "string",
                    optional: false,
                    empty: false,
                },
            },
            async handler(ctx) {
                const endpointModel = await this.resolveEntities(ctx, { id: ctx.params.id });
                if (!endpointModel) {
                    throw new Error("Endpoint model not found");
                }

                return this.classSchemaToString(ctx, endpointModel);
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
        async classSchemaToString(ctx, endpointModel) {
            const result = `Endpoint model ${endpointModel.name} - ${endpointModel.description}

Fields:
${endpointModel.fields.map((field) => `${field.name} - ${field.description}`).join('\n')}`

            return result;
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
