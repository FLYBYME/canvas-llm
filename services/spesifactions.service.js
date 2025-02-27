"use strict";

const DbService = require("@moleculer/database").Service;
const { v4: uuidv4 } = require("uuid");

/**
 * specifications service
 */
module.exports = {
    name: "specifications",
    version: 1,

    mixins: [
        DbService({
            adapter: {
                type: "NeDB",
                options: "./db/specifications.db"
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
        rest: "/v1/specifications",

        fields: {

            conversation: {
                type: "string",
                required: true,
                empty: false,
                populate: {
                    action: "v1.conversations.resolve"
                }
            },

            proposal: {
                type: "object",
                properties: {
                    title: {
                        type: "string"
                    },
                    description: {
                        type: "string"
                    }
                },
                required: false
            },

            requirements: {
                type: "object",
                properties: {
                    projectName: {
                        type: "string"
                    },
                    projectDescription: {
                        type: "string"
                    },
                    objectives: {
                        type: "array",
                        items: "string"
                    },
                    technologies: {
                        type: "array",
                        items: "string"
                    },
                    stakeholders: {
                        type: "array",
                        items: "string"
                    },
                    requirements: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                title: {
                                    type: "string"
                                },
                                description: {
                                    type: "string"
                                },
                                priority: {
                                    type: "string"
                                },
                                status: {
                                    type: "string"
                                }
                            }
                        }
                    },
                },
                required: false
            },

            codingStandards: {
                type: "object",
                properties: {
                    rules: {
                        type: "array",
                        items: "string"
                    },
                    guidelines: {
                        type: "array",
                        items: "string"
                    },
                    documentation: {
                        type: "string"
                    }
                },
                required: false
            },

            fileStructure: {
                type: "object",
                properties: {
                    files: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                fileName: {
                                    type: "string"
                                },
                                filePath: {
                                    type: "string"
                                },
                                type: {
                                    type: "string"
                                },
                                language: {
                                    type: "string"
                                },
                                description: {
                                    type: "string"
                                },
                                isClassDefinition: {
                                    type: "boolean"
                                },
                                className: {
                                    type: "string",
                                    required: false
                                }
                            }
                        }
                    },
                    rationale: {
                        type: "string"
                    }
                },
                required: false
            },

            classSchemas: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        className: {
                            type: "string"
                        },
                        description: {
                            type: "string"
                        },
                        properties: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    name: {
                                        type: "string"
                                    },
                                    type: {
                                        type: "string"
                                    },
                                    description: {
                                        type: "string"
                                    }
                                }
                            }
                        },
                        methods: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    name: {
                                        type: "string"
                                    },
                                    returnType: {
                                        type: "string"
                                    },
                                    parameters: {
                                        type: "array",
                                        items: {
                                            type: "object",
                                            properties: {
                                                name: {
                                                    type: "string"
                                                },
                                                type: {
                                                    type: "string"
                                                }
                                            }
                                        }
                                    },
                                    description: {
                                        type: "string",
                                    }
                                }
                            }
                        },
                        documentation: {
                            type: "string",
                            required: false
                        }
                    }
                },
                required: false
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
