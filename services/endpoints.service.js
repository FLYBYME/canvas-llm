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
                    throw new MoleculerClientError("Endpoint not found", 404, "ENDPOINT_NOT_FOUND", { id: ctx.params.id });
                }

                // 2. Resolve the workspace and validate it exists
                const workspace = await ctx.call("v1.workspaces.resolve", { id: endpoint.workspace });
                if (!workspace) {
                    throw new MoleculerClientError("Workspace not found", 404, "WORKSPACE_NOT_FOUND", { id: endpoint.workspace });
                }

                // 3. Prepare context content with template sections
                const content = await this.prepareEndpointContext(ctx, endpoint, workspace);

                // 4. Refine the implementation
                const refined = await this.refineImplementation(ctx, content, undefined, 1);

                return refined;
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
        /**
         * Format a section of content with a title and body
         * 
         * @param {String} title - Section title
         * @param {String} body - Section content
         * @returns {String} Formatted section
         */
        formatSection(title, body) {
            return `<${title}>\n${body}\n</${title}>`;
        },
        /**
         * Prepare context content with template sections
         * 
         * @param {Object} ctx - Context
         * @param {Object} endpoint - Endpoint object
         * @param {Object} workspace - Workspace object
         * @returns {Object} Context content with template sections
         */
        async prepareEndpointContext(ctx, endpoint, workspace) {
            // Gather related endpoints for context
            const relatedEndpoints = await this.findEntities(ctx, {
                query: {
                    workspace: workspace.id,
                    path: { $regex: new RegExp(endpoint.path.split('/').slice(0, 3).join('/')) }
                },
                limit: 5,
                sort: 'createdAt'
            });

            // Prepare model information if model is defined
            let modelDefinition = '';
            if (endpoint.model && endpoint.model.name) {
                try {
                    const model = await ctx.call("v1.endpoint-models.lookup", { name: endpoint.model.name });
                    if (model) {
                        modelDefinition = this.formatSection("model-definition",
                            JSON.stringify(model, null, 2)
                        );
                    }
                } catch (error) {
                    this.logger.warn(`Model '${endpoint.model.name}' not found for endpoint ${endpoint.id}`, error);
                }
            }

            // Format parameters and responses
            const parameters = endpoint.parameters || [];
            const responses = endpoint.responses || [];

            // Build endpoint definition
            const endpointDefinition = this.formatSection("endpoint-definition",
                JSON.stringify({
                    path: endpoint.path,
                    method: endpoint.method,
                    description: endpoint.description || '',
                    parameters: parameters,
                    responses: responses,
                    authentication: endpoint.authentication || false,
                    security: endpoint.security || [],
                    tags: endpoint.tags || []
                }, null, 2)
            );

            // Format workspace context
            const workspaceContext = this.formatSection("workspace-context",
                JSON.stringify({
                    id: workspace.id,
                    name: workspace.name,
                    description: workspace.description || '',
                    // Include other relevant workspace properties
                }, null, 2)
            );

            // Format related endpoints
            const formattedRelatedEndpoints = this.formatSection("related-endpoints",
                JSON.stringify(relatedEndpoints.map(e => ({
                    path: e.path,
                    method: e.method,
                    description: e.description || '',
                    id: e.id
                })), null, 2)
            );

            // Get context details and available methods
            const contextDetails = this.ctxDetails();
            const availableMethods = await this.availableMethods(ctx, endpoint);

            // Implementation template
            const implementationTemplate = this.formatSection("implementation-template",
                this.endpointImplementationTemplate()
            );

            // Return complete context object
            return {
                workspaceContext,
                endpointDefinitions: endpointDefinition,
                modelDefinitions: modelDefinition,
                contextDetails,
                availableMethods,
                relatedEndpoints: formattedRelatedEndpoints,
                implementationTemplate
            };
        },
        /**
         * Refine implementation through multiple iterations
         * 
         * @param {Object} ctx - Context
         * @param {Array} content - Content sections for context
         * @param {Object} initialResult - Initial generation result
         * @param {Number} iterations - Number of refinement iterations
         * @returns {Object} Refined artifact
         */
        async refineImplementation(ctx, content, initialResult, iterations) {
            let currentResult = initialResult;

            for (let i = 0; i < iterations; i++) {

                if (currentResult === undefined) {
                    this.logger.info(`No initial result provided for refinement. Generating new artifact.`);
                    currentResult = await ctx.call("v1.tools.invoke", {
                        name: "GenerateEndpointImplementation",
                        input: {
                            codeArtifact: "",
                            workspaceContext: content.workspaceContext,
                            endpointDefinitions: content.endpointDefinitions,
                            modelDefinitions: content.modelDefinitions,
                            contextDetails: content.contextDetails,
                            availableMethods: content.availableMethods,
                            relatedEndpoints: content.relatedEndpoints,
                        },
                        context: []
                    }).then((response) => {
                        return response.shift();
                    });
                }

                this.logger.info(`Refining implementation, iteration ${i + 1}`);
                const refinedResult = await ctx.call("v1.tools.invoke", {
                    name: "ValidateContextCompliance",
                    input: {
                        codeArtifact: currentResult.artifact,
                        workspaceContext: content.workspaceContext,
                        endpointDefinitions: content.endpointDefinitions,
                        modelDefinitions: content.modelDefinitions,
                        contextDetails: content.contextDetails,
                        availableMethods: content.availableMethods,
                        relatedEndpoints: content.relatedEndpoints,
                        iterationNumber: i + 1
                    },
                    context: []
                }).then((response) => {
                    return response.shift();
                });

                this.logger.info(`Validation result: ${refinedResult.iteration.required ? "Required" : "Not Required"}`);

                if (refinedResult.iteration.required) {
                    currentResult = await ctx.call("v1.tools.invoke", {
                        name: "GenerateEndpointImplementation",
                        input: {
                            codeArtifact: currentResult.artifact,
                            workspaceContext: content.workspaceContext,
                            endpointDefinitions: content.endpointDefinitions,
                            modelDefinitions: content.modelDefinitions,
                            contextDetails: content.contextDetails,
                            availableMethods: content.availableMethods,
                            relatedEndpoints: content.relatedEndpoints,
                        },
                        context: [JSON.stringify(refinedResult, null, 2), currentResult.artifact]
                    }).then((response) => {
                        return response.shift();
                    });

                    this.logger.info(`Refinement completed for iteration ${i + 1}`);
                } else {
                    break;
                }
            }
            return currentResult;
        },

        /**
         * Template for endpoint implementation examples
         * 
         * @returns {String} Example template
         */
        endpointImplementationTemplate() {
            return `Example implementations for REST endpoints in a Moleculer service:

\`\`\`javascript
const { MoleculerRetryableError, MoleculerClientError } = require("moleculer").Errors;

module.exports = {
    actions: {
        checkout: {
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
        }
    },

    methods: {
        // ALL methods should be placed here
    }
};
\`\`\``;
        },

        /**
         * Context details for implementation
         * 
         * @returns {String} Formatted context details
         */
        ctxDetails() {
            return `- \`ctx.params\` - Request params.
- \`ctx.meta.userID\` - Current user ID. Resolve user object from \`ctx.call("v1.users.resolve", { id: ctx.meta.userID })\`
- \`ctx.call()\` - Make nested-call. Same arguments like \`broker.call\`
- \`ctx.emit()\` - Emit an event, same as \`broker.emit\`
- \`ctx.broadcast()\` - Broadcast an event, same as \`broker.broadcast\`
- \`this.logger\` - Logger instance for the service
- \`ctx.meta\` - Additional metadata including headers, user information, etc.`;
        },

        /**
         * Available methods for implementation
         * 
         * @param {Object} ctx - Context
         * @param {Object} endpoint - Endpoint entity
         * @returns {String} Formatted available methods
         */
        async availableMethods(ctx, endpoint) {
            return `- \`await this.resolveEntities(ctx, { id: ... })\` - Resolve one or more entities by ID
- \`await this.findEntity(ctx, { query: { ... } })\` - Find a single entity by query
- \`await this.findEntities(ctx, { query: { ... }, limit: 10, offset: 0, sort: "-createdAt" })\` - Find multiple entities by query
- \`await this.countEntities(ctx, { query: { ... } })\` - Count entities matching a query
- \`await this.createEntity(ctx, { ... })\` - Create a new entity
- \`await this.updateEntity(ctx, { id: ..., ... })\` - Update an existing entity by ID
- \`await this.removeEntity(ctx, { id: ... })\` - Remove an existing entity by ID
- \`this.formattedResponse(ctx, response, code)\` - Format a response with status code
- \`this.formattedError(ctx, MoleculerClientError, code)\` - Format an error response with status code`;
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
