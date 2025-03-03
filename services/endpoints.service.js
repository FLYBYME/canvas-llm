"use strict";

const DbService = require("@moleculer/database").Service;
const { MoleculerRetryableError, MoleculerClientError } = require("moleculer").Errors;

/**
 * endpoints schema service
 */
module.exports = {
    name: "endpoints",
    version: 1,

    mixins: [
        DbService({
            adapter: {
                type: "NeDB",
                options: "./db/endpoints.db"
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
        rest: "/v1/endpoints",

        fields: {
            workspace: {
                type: "string",
                required: true,
                empty: false,
                populate: {
                    action: "v1.workspaces.resolve"
                }
            },
            path: {
                type: "string",
                required: true,
                empty: false,
                description: "The path of the endpoint, e.g. '/api/v1/resource'"
            },
            method: {
                type: "string",
                required: true,
                empty: false,
                enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
                description: "The HTTP method of the endpoint"
            },
            description: {
                type: "string",
                required: false,
                empty: false,
                description: "A brief description of what the endpoint does"
            },

            model: {
                type: "object",
                required: false,
                empty: false,
                properties: {
                    name: {
                        type: "string",
                        required: false,
                        empty: false,
                        description: "The name of the model"
                    },
                    action: {
                        type: "string",
                        required: false,
                        empty: false,
                        enum: ["create", "read", "update", "delete"],
                        description: "The action performed by the endpoint"
                    }
                }
            },


            parameters: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        name: {
                            type: "string",
                            required: true,
                            empty: false,
                            description: "The name of the parameter"
                        },
                        in: {
                            type: "string",
                            required: true,
                            empty: false,
                            enum: ["query", "header", "path", "cookie", "body"],
                            description: "The location of the parameter"
                        },
                        required: {
                            type: "boolean",
                            required: true,
                            default: false,
                            description: "Whether the parameter is required"
                        },
                        type: {
                            type: "string",
                            required: true,
                            empty: false,
                            description: "The data type of the parameter"
                        },
                        description: {
                            type: "string",
                            required: false,
                            empty: true,
                            description: "A brief description of the parameter"
                        }
                    }
                },
                required: false,
                default: [],
                description: "A list of parameters for the endpoint"
            },

            responses: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        code: {
                            type: "number",
                            required: true,
                            empty: false,
                            description: "The HTTP status code of the response"
                        },
                        type: {
                            type: "string",
                            required: true,
                            empty: false,
                            description: "The data type of the response"
                        },
                        description: {
                            type: "string",
                            required: false,
                            empty: true,
                            description: "A brief description of the response"
                        }
                    }
                },
                required: false,
                default: [],
                description: "A list of responses for the endpoint"
            },

            authentication: {
                type: "boolean",
                required: false,
                default: false,
                description: "Whether the endpoint requires authentication"
            },

            security: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        type: {
                            type: "string",
                            required: true,
                            empty: false,
                            description: "The type of security (e.g., 'apiKey', 'oauth2')"
                        },
                        name: {
                            type: "string",
                            required: true,
                            empty: false,
                            description: "The name of the security scheme"
                        },
                        location: {
                            type: "string",
                            required: true,
                            enum: ["query", "header", "cookie"],
                            empty: false,
                            description: "The location of the security scheme (e.g., 'header')"
                        }
                    }
                },
                required: false,
                default: [],
                description: "A list of security schemes for the endpoint"
            },
            tags: {
                type: "array",
                items: {
                    type: "string",
                    required: false,
                    empty: false,
                    description: "Tags for categorizing the endpoint"
                },
                required: false,
                default: [],
                description: "A list of tags for the endpoint"
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

        generateRestEndpoint: {
            rest: {
                method: "POST",
                path: "/generate/:id/rest",
            },
            params: {
                id: {
                    type: "string",
                    optional: false,
                    empty: false,
                },
            },
            async handler(ctx) {
                const endpoint = await this.resolveEntities(ctx, { id: ctx.params.id });
                if (!endpoint) {
                    throw new Error("Endpoint not found");
                }

                const workspace = await ctx.call("v1.workspaces.resolve", { id: endpoint.workspace });
                if (!workspace) {
                    throw new Error("Workspace not found");
                }

                const content = [];

                if (endpoint.model) {
                    const endpointModel = await ctx.call("v1.endpoint-models.lookup", { name: endpoint.model.name });
                    const endpointModelString = await ctx.call("v1.endpoint-models.classSchemaToString", { id: endpointModel.id });
                    content.push(`This is the endpoint model class definition:
<endpoint-model-definitions>
${endpointModelString}
</endpoint-model-definitions>`);
                }

                content.push(`This is the endpoint definition:
<endpoint-definition>
${endpoint.method} ${endpoint.path}

Parameters:
${endpoint.parameters.map((param) => `${param.name} (${param.in}) - ${param.description}`).join("\n")}

Responses:
${endpoint.responses.map((response) => `${response.code} (${response.type}) - ${response.description}`).join("\n")}
</endpoint-definition>`);

                content.push(this.ctxDetails());

                content.push(await this.availableMethods(ctx, endpoint));


                const result = await ctx.call("v1.tools.invoke", {
                    name: "GenerateArtifact",
                    input: {},
                    context: [this.exampleEndpoint(endpoint), content.join("\n\n")],
                }).then((response) => {
                    return response.shift();
                });

                const review = await ctx.call("v1.tools.invoke", {
                    name: "ReviewArtifact",
                    input: {},
                    context: [content.join("\n\n"), result.artifact],
                }).then((response) => {
                    return response.shift();
                })
                const updated = await ctx.call("v1.tools.invoke", {
                    name: "GenerateUpdatedArtifact",
                    input: {
                        artifact: result.artifact,
                    },
                    context: [review.suggestions.join("\n\n")],
                }).then((response) => {
                    return response.shift();
                });
                console.log(review)

                return updated;
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

                const endpointModels = await ctx.call("v1.endpoint-models.getForWorkspace", { workspace: workspace.id });

                const result = await ctx.call("v1.tools.invoke", {
                    name: "EndpointSchemaList",
                    input: {},
                    context: [workspace.description, `These routes hae already been created.
<existing-routes>
${endpointModels.map((model) => {
                        return `- GET /api/v1/${model.name.toLowerCase()} - Get a list of ${model.name.toLowerCase()}
- GET /api/v1/${model.name.toLowerCase()}/:id - Retrieve a specific ${model.name.toLowerCase()} by ID
- POST /api/v1/${model.name.toLowerCase()} - Create a new ${model.name.toLowerCase()}
- PATCH /api/v1/${model.name.toLowerCase()}/:id - Update a specific ${model.name.toLowerCase()} by ID
- DELETE /api/v1/${model.name.toLowerCase()}/:id - Delete a specific ${model.name.toLowerCase()} by ID`;
                    }).join("\n")}
</existing-routes>

DO NOT create these routes.`, `Generate a list of endpoints for the workspace. The path should be compatible with the Express.js router. Think about what other endpoint might be needed for the workspace.`],
                }).then((response) => {
                    return response.shift();
                });

                const endpoints = result.endpoints;

                for (const endpoint of endpoints) {
                    const found = await this.findEntity(ctx, { query: { workspace: workspace.id, path: endpoint.path, method: endpoint.method } });
                    if (!found) {
                        await this.createEntity(ctx, { workspace: workspace.id, ...endpoint });
                    } else {
                        await this.updateEntity(ctx, { id: found.id, ...endpoint });
                    }
                }

                return this.findEntities(ctx, { query: { workspace: workspace.id }, sort: 'createdAt' });
            }
        },

        refine: {
            rest: "POST /:id/refine",
            params: {
                id: { type: "string" },
            },
            async handler(ctx) {
                const endpointModel = await this.resolveEntities(ctx, { id: ctx.params.id });
                if (!endpointModel) {
                    throw new Error("Endpoint model not found");
                }

                const result = await ctx.call("v1.tools.invoke", {
                    name: "EndpointSchema",
                    input: {},
                    context: [JSON.stringify(endpointModel), `You are a software engineer. You are given an endpoint model. Refine the endpoint model to be more complete and accurate.`],
                }).then((response) => {
                    return response.shift();
                });

                return this.updateEntity(ctx, { id: endpointModel.id, ...result });
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
        ctxDetails() {
            return `<context-details>
ctx.params	Object	Request params. Second argument from broker.call.
ctx.meta	Object	Request metadata. It will be also transferred to nested-calls.
ctx.meta.userID    String	Current user ID. Resolve user object from ctx.call("v1.users.resolve", { id: ctx.meta.userID })
ctx.call()	Promise	Make nested-call. Same arguments like in broker.call
ctx.emit()	void	Emit an event, same as broker.emit
ctx.broadcast()	void	Broadcast an event, same as broker.broadcast
</context-details>`;
        },
        async availableMethods(ctx, endpoint) {
            return `Available methods:
<available-methods>
- \`await this.resolveEntities(ctx, { id: ... })\` - Resolve one or more entities by ID, Do not use findEntity or findEntities if you know the ID
- \`await this.findEntity(ctx, { query: { ... } })\` - Find a single entity by query
- \`await this.findEntities(ctx, { query: { ... } })\` - Find multiple entities by query
- \`await this.createEntity(ctx, { ... })\` - Create a new entity
- \`await this.updateEntity(ctx, { id: ..., ... })\` - Update an existing entity by ID
- \`await this.removeEntity(ctx, { id: ... })\` - Remove an existing entity by ID
- \`this.formattedResponse(ctx, response, code)\` - Format a response
- \`this.formattedError(ctx, MoleculerClientError, code)\` - Format an error

</available-methods>
`;
        },
        exampleEndpoint(endpoint) {
            return `Example implementation of a checkout endpoint in a REST API:
\`\`\`javascript
const { MoleculerRetryableError, MoleculerClientError } = require("moleculer").Errors;

module.exports = {
    rest: {
        method: "POST",
        path: "/api/v1/checkout",
    },
    params: {
        cartId: { type: "string", required: true, description: "The ID of the shopping cart to checkout"},
        paymentMethod: { type: "string", required: true, description: "The payment method to be used for the checkout (e.g., credit card, PayPal)"},
        shippingAddress: { type: "object", required: true, description: "The shipping address for the order, including street, city, state, zip code, and country"},
        promoCode: { type: "string", required: false, description: "Optional promo code for discounts"}
    },
    async handler(ctx) {
        try {
            const { cartId, paymentMethod, shippingAddress, promoCode } = ctx.params;

            // 1. Validate cart existence and get cart details
            const cartDetails = await this.resolveEntities(ctx, { id: cartId });
            if (!cartDetails) {
                return this.formattedError(ctx, new MoleculerClientError("Cart not found", "CART_NOT_FOUND", { id: cartId }), 404);
            }

            // 2. Validate user authentication
            const userId = ctx.meta.userID;
            if (!userId) {
                return this.formattedError(ctx, new MoleculerClientError("Unauthorized access", "UNAUTHORIZED_ACCESS", { id: cartId }), 401);
            }

            // 3. Calculate total amount (including potential promo code discounts)
            let totalAmount = cartDetails.total; // Assuming cartDetails has a total field
            if (promoCode) {
                const discount = await this.validatePromoCode(ctx, promoCode, totalAmount);
                totalAmount -= discount;
            }

            // 4. Create checkout entity
            const checkoutData = {
                userId: userId,
                cartId: cartId,
                totalAmount: totalAmount,
                paymentMethod: paymentMethod,
                shippingAddress: shippingAddress,
                billingAddress: shippingAddress, // Assuming billing address is the same for now
                status: "pending",
            };

            const checkout = await this.createEntity(ctx, checkoutData);

            // 5. Process payment 
            const paymentResult = await this.processPayment(ctx, paymentMethod, totalAmount);
            if (paymentResult.success) {
                checkout.status = "completed";
                await this.updateEntity(ctx, { id: checkout.id, ...checkout });
            } else {
                checkout.status = "failed";
                await this.updateEntity(ctx, { id: checkout.id, ...checkout });
                return this.formattedError(ctx, new MoleculerClientError("Payment failed", "PAYMENT_FAILED", { id: checkout.id }), 400);
            }
            checkout.status = "completed";
            const updated = await this.updateEntity(ctx, {id: checkout.id, ...checkout});

            this.logger.info("Checkout successful:", updated);

            return this.formattedResponse(ctx, updated, 200);
        } catch (error) {
            this.logger.error("Checkout error:", error);
            return this.formattedError(ctx, error, 500);
        }
    }
};
\`\`\``;
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
