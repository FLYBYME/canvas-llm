"use strict";

const DbService = require("@moleculer/database").Service;
const { MoleculerRetryableError, MoleculerClientError } = require("moleculer").Errors;

/**
 * Class schema service
 */
module.exports = {
    name: "class-schemas",
    version: 1,

    mixins: [
        DbService({
            adapter: {
                type: "NeDB",
                options: "./db/class-schemas.db"
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
        rest: "/v1/class-schemas",

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

            className: {
                type: "string",
                required: true,
                empty: false,
            },

            description: {
                type: "string",
                required: false,
                empty: false,
            },

            inheritance: {
                type: "string",
                required: false,
                empty: true,
                populate: {
                    action: "v1.class-schemas.resolve"
                }
            },

            parameters: {
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
                            required: true,
                            empty: false,
                        }
                    }
                },
                required: false,
                default: [],
            },

            properties: {
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
                            required: true,
                            empty: false,
                        },
                    }
                },
                required: false,
                default: [],
            },

            methods: {
                type: "array",
                items: {
                    type: "object",
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
                        returnType: {
                            type: "string",
                            required: true,
                            empty: false,
                        },
                        parameters: {
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
                                        required: true,
                                        empty: false,
                                    }
                                }
                            },
                            required: false,
                            default: [],
                        },
                        exceptions: {
                            type: "array",
                            items: {
                                type: "object",
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
                                    }
                                }
                            },
                            required: false,
                            default: [],
                        }
                    }
                },
                required: false,
                default: [],
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

        getForArtifact: {
            rest: {
                method: "GET",
                path: "/artifact/:artifact",
            },
            params: {
                artifact: {
                    type: "string",
                    optional: false,
                    empty: false,
                },
            },
            async handler(ctx) {
                const artifact = await ctx.call("v1.artifacts.resolve", { id: ctx.params.artifact });
                if (!artifact) {
                    throw new MoleculerClientError("Artifact not found", 404);
                }

                return this.resolveEntities(ctx, { id: artifact.classes });
            }
        },

        generateDocumentation: {
            rest: {
                method: "POST",
                path: "/:id/generate-documentation",
            },
            params: {
                id: {
                    type: "string",
                    optional: false,
                    empty: false,
                },
            },
            async handler(ctx) {
                const classSchema = await this.resolveEntities(ctx, { id: ctx.params.id });
                if (!classSchema) {
                    throw new MoleculerClientError("Class schema not found", 404);
                }
                const toolName = "ClassSchemaDocumentation";
                const result = await ctx.call("v1.tools.invoke", {
                    name: toolName,
                    input: {},
                    context: [await this.classSchemaToString(ctx, classSchema, false)]
                });

                return this.updateEntity(ctx, {
                    id: classSchema.id,
                    documentation: result,
                });
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
                const classSchema = await this.resolveEntities(ctx, { id: ctx.params.id });
                if (!classSchema) {
                    throw new MoleculerClientError("Class schema not found", 404);
                }

                const classSchemas = await this.findEntities(ctx, { query: { workspace: classSchema.workspace } });

                const toolName = "ClassSchema";
                const context = [];

                context.push(`Please enhance the latest version by adding features and ensuring it is adaptable and future-proof.

These are the other class definitions:
${classSchemas.filter((cs) => classSchema.className !== cs.className).map((cs) => `- ${cs.className}: ${cs.description}`).join('\n')}

If a class definition should be used as a parameter or property type, use the name of the class definition.`);

                if (classSchema.inheritance && classSchema.inheritance !== '') {
                    const parent = await this.resolveEntities(ctx, { id: classSchema.inheritance });
                    if (parent) {
                        context.push(`This is the parent class definition:
${await this.classSchemaToString(ctx, parent)}`);
                    }
                }

                context.push(`This is the current class definition:
${await this.classSchemaToString(ctx, classSchema)}`);

                const result = await ctx.call("v1.tools.invoke", {
                    name: toolName,
                    input: {},
                    context
                }).then(res => res.shift());



                return this.updateEntity(ctx, {
                    id: classSchema.id,
                    className: result.className,
                    description: result.description,
                    parameters: result.parameters,
                    properties: result.properties,
                    methods: result.methods,
                });
            }
        },

        generateArtifact: {
            rest: {
                method: "POST",
                path: "/:id/generate-artifact",
            },
            params: {
                id: {
                    type: "string",
                    optional: false,
                    empty: false,
                },
            },
            async handler(ctx) {
                const classSchema = await this.resolveEntities(ctx, { id: ctx.params.id });
                if (!classSchema) {
                    throw new MoleculerClientError("Class schema not found", 404);
                }

                const schemas = await this.findEntities(ctx, { query: { workspace: classSchema.workspace } })
                    .then(res => res.filter((cs) => classSchema.className !== cs.className && classSchema.inheritance !== cs.id));

                const context = await this.getContext(ctx, classSchema, schemas);

                const result = await ctx.call("v1.tools.invoke", {
                    name: "GenerateArtifact",
                    input: {},
                    context: context
                });

                return result.shift();
            }
        },

        schemaToString: {
            rest: {
                method: "POST",
                path: "/:id/schema-to-string",
            },
            params: {
                id: {
                    type: "string",
                    optional: false,
                    empty: false,
                },
            },
            async handler(ctx) {
                const classSchema = await this.resolveEntities(ctx, { id: ctx.params.id });
                if (!classSchema) {
                    throw new MoleculerClientError("Class schema not found", 404);
                }

                return this.classSchemaToString(ctx, classSchema);
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

        async getContext(ctx, classSchema, schemas) {
            const context = [];
            const definitions = [];
            for (const schema of schemas) {
                definitions.push(`Class name: ${schema.className} - ${schema.description}
<class-definitions>
${await this.classSchemaToString(ctx, schema)}
</class-definitions>`);
            }

            context.push(`These are the class definitions:
${definitions.join('\n')}`);


            if (classSchema.inheritance && classSchema.inheritance !== '') {
                const parent = await this.resolveEntities(ctx, { id: classSchema.inheritance });
                if (parent) {
                    context.push(`This is the parent class definition:
<parent-class-definitions>
${await this.classSchemaToString(ctx, parent)}
</parent-class-definitions>

Use the parent class definition as a reference for the current class definition.`);
                }
            }

            context.push(`Class name: ${classSchema.className} - ${classSchema.description}
The language is JavaScript, ES6.

This is the class definition:
<current-class-definitions>
${await this.classSchemaToString(ctx, classSchema)}
</current-class-definitions>

You are required to implement the methods and properties in the class definition and refer to the parent class definition as needed.`);
            return context;
        },

        async classSchemaToString(ctx, classSchema, shorten = true) {
            let inheritance = '';
            if (classSchema.inheritance && classSchema.inheritance !== '') {
                const parent = await this.resolveEntities(ctx, { id: classSchema.inheritance });
                inheritance = `extends ${parent.className}`;
            }

            const full = `    constructor({${classSchema.parameters?.map((parameter) => `${parameter.name}: ${parameter.type}`).join(', ')}}) {}
    ${classSchema.properties?.map((property) => `${property.name}: ${property.type}(${property.description})`).join('\n    ')}`;

            return `class ${classSchema.className} ${inheritance} {
${shorten ? '' : full}

    ${classSchema.methods?.map((method) => {
                return `${method.name}(${(method.parameters || []).map((parameter) => `${parameter.name}: ${parameter.type}`).join(', ')}): ${method.returnType} {} - ${method.description}
        ${method.exceptions?.map((exception) => `Throws: ${exception.name} - ${exception.description}`).join('\n        ')}`;
            }).join('\n    ')}
}`
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
