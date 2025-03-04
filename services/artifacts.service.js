
const { generateArtifactTool } = require("../lib/helpers/artifact");
const z = require("zod");
const { zodToJsonSchema } = require("zod-to-json-schema");
const DbService = require("@moleculer/database").Service;
const { MoleculerRetryableError, MoleculerClientError } = require("moleculer").Errors;
const fs = require("fs").promises;
const path = require("path");

const PROGRAMMING_LANGUAGES = require("../lib/programming-languages.js");
const diff = require("diff");
const { input } = require("../prompts/js-class.js");

/**
 * Ollama workspace schema service
 */

module.exports = {
    name: "artifacts",
    version: 1,

    mixins: [
        DbService({
            adapter: {
                type: "NeDB",
                options: "./db/artifacts.db"
            }
        })
    ],

    /**
     * Service dependencies
     */
    dependencies: [
        {
            name: "tools",
            version: 1
        }
    ],

    /**
     * Service settings
     */
    settings: {
        rest: "/v1/artifacts",

        fields: {

            // Workspace
            workspace: {
                type: "string",
                required: true,
                empty: false,
                populate: {
                    action: "v1.workspaces.resolve"
                }
            },

            // Title
            title: {
                type: "string",
                required: false,
                default: "Title not set",
            },

            // Description
            description: {
                type: "string",
                required: false,
                default: "Description not set",
            },

            // File Name
            fileName: {
                type: "string",
                required: true,
                empty: false,
            },

            // File Path
            filePath: {
                type: "string",
                required: true,
                empty: false,
            },

            // File Type
            fileType: {
                type: "string",
                required: true,
                empty: false,
                enum: ["text", "code", "documentation", "test"],
            },

            // Language
            language: {
                type: "string",
                required: true,
                empty: false,
            },

            // Content
            content: {
                type: "string",
                required: true,
            },

            // Context Documents
            contextDocuments: {
                type: "array",
                items: "string",
                required: false,
                default: [],
                populate: {
                    action: "v1.artifacts.resolve"
                }
            },

            fileStructure: {
                type: "string",
                required: false,
                populate: {
                    action: "v1.file-structures.resolve"
                }
            },

            module: {
                type: "string",
                required: false,
                populate: {
                    action: "v1.modules.resolve"
                }
            },

            classes: {
                type: "array",
                items: "string",
                required: false,
                default: [],
                populate: {
                    action: "v1.class-schemas.resolve"
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

        indexes: [

        ],

        defaultPopulates: [
            "fileStructure",
        ],

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
        formatArtifactContent(artifact, shorten = false) {
            return `${shorten ? artifact.content.substring(0, 500) : artifact.content}\n`
        },

    },

    /**
     * Service created lifecycle event handler
     */
    created() { },

    /**
     * Service started lifecycle event handler
     */
    async started() {

    },

    /**
     * Service stopped lifecycle event handler
     */
    async stopped() { }

};