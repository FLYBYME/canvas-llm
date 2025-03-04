"use strict";

const DbService = require("@moleculer/database").Service;
const { MoleculerRetryableError, MoleculerClientError } = require("moleculer").Errors;
const fs = require("fs").promises;
const path = require("path");
const { PROGRAMMING_LANGUAGES } = require("../constants.js");

/**
 * Ollama workspace schema service
 */

module.exports = {
    name: "workspaces",
    version: 1,

    mixins: [
        DbService({
            adapter: {
                type: "NeDB",
                options: "./db/workspaces.db"
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
        rest: "/v1/workspaces",

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

            workingDirectory: {
                type: "string",
                required: true,
                empty: false,
            },

            requirements: {
                type: "object",
                required: false,
                default: {},
            },

            conversation: {
                type: "string",
                required: false,
                empty: false,
                populate: {
                    action: "v1.conversations.resolve"
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
                path: "/lookup/:name"
            },
            params: {
                name: { type: "string" }
            },
            async handler(ctx) {
                const workspace = await this.resolveByName(ctx, ctx.params.name);
                return workspace;
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
        resolveByName(ctx, name) {
            return this.findEntity(ctx, { query: { name } });
        },

        async recursiveFindFiles(ctx, directory) {
            const ignoreList = [
                "node_modules",
                ".git",
                "package-lock.json",
                "yarn.lock"
            ];
            const files = await fs.readdir(directory);
            const filePaths = await Promise.all(files.map(async (file) => {
                if (ignoreList.includes(file)) {
                    return [];
                }
                const filePath = path.join(directory, file);
                const stats = await fs.stat(filePath);
                if (stats.isDirectory()) {
                    return this.recursiveFindFiles(ctx, filePath);
                } else {
                    const content = await fs.readFile(filePath, "utf-8");
                    const language = PROGRAMMING_LANGUAGES.find((lang) => lang.extensions.includes(file.split(".").pop()));
                    return { path: filePath, name: file, content, language: language.language };
                }
            }));
            return filePaths.flat();
        },
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