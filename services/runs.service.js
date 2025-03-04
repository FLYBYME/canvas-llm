"use strict";

const { ChatOllama } = require("@langchain/ollama");
const { ChatOpenAI } = require("@langchain/openai");
const DbService = require("@moleculer/database").Service;
const { MoleculerRetryableError, MoleculerClientError } = require("moleculer").Errors;
const { z } = require("zod");
const { zodToJsonSchema } = require("zod-to-json-schema");
const { jsonSchemaToZod } = require("json-schema-to-zod");

require('../env.js');

const SeedModels = [];



/**
 * Ollama model schema service
 */

module.exports = {
    name: "runs",
    version: 1,

    mixins: [
        DbService({
            adapter: {
                type: "NeDB",
                options: "./db/runs.db"
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
        rest: "/v1/runs",

        fields: {

            // name
            name: {
                type: "string",
                required: true,
                empty: false,
            },

            // model
            model: {
                type: "string",
                required: true,
                empty: false,
                populate: {
                    action: "v1.models.resolve"
                }
            },

            // tool
            tool: {
                type: "string",
                required: true,
                empty: false,
                populate: {
                    action: "v1.tools.resolve"
                }
            },

            // response
            response: {
                type: "string",
                required: false,
                empty: false,
                populate: {
                    action: "v1.messages.resolve"
                }
            },

            // error
            error: {
                type: "string",
                required: false,
                empty: false,
                populate: {
                    action: "v1.messages.resolve"
                }
            },

            // startTime
            startTime: {
                type: "number",
                required: false,
                empty: false,
            },

            // endTime
            endTime: {
                type: "number",
                required: false,
                empty: false,
            },

            // status
            status: {
                type: "string",
                required: false,
                default: "draft",
                empty: false,
                enum: ["pending", "running", "success", "error", "draft"],
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
            //'notDeleted'
        ],

        // default init config settings
        config: {
            "maxConcurrentRuns": 2
        }
    },

    /**
     * Actions
     */
    actions: {
        processQueue: {
            rest: "POST /process",
            params: {},
            async handler(ctx) {
                await this.processQueue(ctx);

                return {
                    active: this.active
                };
            }
        },

        queue: {
            rest: "POST /queue",
            params: {
                id: { type: "string" }
            },
            async handler(ctx) {
                return this.updateEntity(ctx, { id: ctx.params.id, status: "pending" });
            }
        },

        invoke: {
            rest: "POST /invoke",
            params: {
                id: { type: "string" }
            },
            async handler(ctx) {
                return this.invokeRun(ctx, ctx.params.id);
            }
        },

        test: {
            rest: "POST /test",
            params: {},
            async handler(ctx) {
                const model = await ctx.call("v1.models.lookup", { name: "gpt-4o-mini" });
                console.log(model);
                const schema = zodToJsonSchema(z.object({
                    fileName: z.string().describe("The name of the file."),
                    extractedSummarie: z.string().describe("The extracted summary of the files."),
                    keyDetails: z.array(z.string()).describe("List of key details extracted from the files."),
                    potentialNextSteps: z.array(z.string()).describe("List of potential next steps based on the key details."),
                    documentation: z.string().describe("Documentation in markdown format."),
                }));
                delete schema["$schema"];
                console.log(schema);
                const tool = await ctx.call("v1.tools.create", {
                    name: "FileSummary",
                    description: "Summarize files.",
                    schema: schema,
                    options: {}
                });
                console.log(tool);

                const run = await ctx.call("v1.runs.create", {
                    name: "test",
                    model: model.id,
                    tool: tool.id,
                    options: {}
                });
                console.log(run);
                const question = "What is the purpose of this file?";

                const message = await ctx.call("v1.messages.create", {
                    run: run.id,
                    role: "system",
                    content: `You are analyzing files to extract relevant information for the user’s question: "{question}". Summarize key details from each file.`
                        .replace("{question}", question)
                });
                console.log(message);

                return ctx.call("v1.runs.queue", {
                    id: run.id
                });
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
        async invokeRun(ctx, id) {
            const run = await this.resolveEntities(ctx, { id: id });
            if (!run) throw new MoleculerClientError(`Run ${id} not found`, 404, "RUN_NOT_FOUND", { id });

            await this.updateEntity(ctx, { id: run.id, status: "pending" });

            if (!this.waiting.has(run.id)) this.waiting.set(run.id, []);

            const queue = this.waiting.get(run.id);
            const promise = new Promise((resolve, reject) => queue.push({ resolve, reject }));

            return promise;
        },
        async selectModel(ctx, model) {
            return this.clients[model.type];
        },

        async getNextRun(ctx) {
            const run = await this.findEntity(ctx, {
                query: {
                    status: "pending"
                },
                sort: 'createdAt',
                limit: 1
            });

            return run;
        },

        async processQueue(ctx) {
            const maxConcurrentRuns = this.settings.config.maxConcurrentRuns;
            if (this.active < maxConcurrentRuns) {
                this.active++;

                const run = await this.getNextRun(ctx);
                if (!run) {
                    this.active--;
                    return;
                }

                await this.updateEntity(ctx, { id: run.id, status: "running" });

                this.logger.info(`Processing run ${run.id}: ${run.name}`);

                const modelConfig = await ctx.call("v1.models.resolve", { id: run.model });
                const model = await this.selectModel(ctx, modelConfig);
                const tool = await ctx.call("v1.tools.resolve", { id: run.tool });
                const messages = await ctx.call("v1.messages.getByRun", { id: run.id });

                const options = {};

                if (tool.options?.plainText) {

                    const result = await model.withConfig({ runName: tool.name }).invoke(messages);
                    const message = await ctx.call("v1.messages.create", {
                        run: run.id,
                        role: "assistant",
                        content: result.content || "No response from model",
                    });


                    await this.endRun(ctx, run, message);
                    return;
                }

                if (modelConfig.type === "openai") {
                    options.tool_choice = tool.name;
                }

                const result = await model.bindTools([{
                    name: tool.name,
                    description: tool.description,
                    schema: eval(jsonSchemaToZod(tool.schema)),
                }], options).withConfig({ runName: tool.name }).invoke(messages)
                    .catch((err) => {
                        this.logger.error(`Error processing run ${run.id}: ${run.name}`, err);
                        return this.endRun(ctx, run, message)
                            .then(() => {
                                throw err;
                            });
                    });


                const message = await ctx.call("v1.messages.create", {
                    run: run.id,
                    role: "assistant",
                    content: result.content,
                    tool_calls: result.tool_calls || []
                });

                await this.endRun(ctx, run, message);
            }
        },

        async endRun(ctx, run, message) {

            this.logger.info(`Processed run ${run.id}: ${run.name} - ${message.id} Took ${Date.now() - run.createdAt}ms`);

            ctx.emit("v1.runs.processed", { id: run.id });

            const updated = await this.updateEntity(ctx, {
                id: run.id,
                endTime: Date.now(),
                status: "success",
                response: message.id
            });


            this.active--;

            if (this.waiting.has(run.id)) {
                const queue = this.waiting.get(run.id);
                while (queue.length > 0) {
                    const { resolve } = queue.shift();
                    resolve(updated);
                }
            }

            setImmediate(() => {
                this.actions.processQueue({})
                    .catch((err) => {
                        this.logger.error(`Error processing queue: `, err);
                    })
            });
        }
    },

    /**
     * Service created lifecycle event handler
     */
    created() {
        this.clients = {
            ollama: new ChatOllama({
                model: "llama3.2:1b",
                temperature: 0,
                baseUrl: "http://192.168.1.180:11434",
                numThread: 10,
                keepAlive: "1h",
                numCtx: 10 * 1024,
            }),
            openai: new ChatOpenAI({
                model: "gpt-4o-mini",
                temperature: 0,
            }),
        };

        this.active = 0;
        this.waiting = new Map();

        this.timmer = null;
    },

    /**
     * Service started lifecycle event handler
     */
    async started() {
        this.timmer = setInterval(() => {
            this.actions.processQueue({})
                .catch((err) => {
                    this.logger.error(`Error processing queue: ${err.stack}`);
                })
        }, 1000);
    },

    /**
     * Service stopped lifecycle event handler
     */
    async stopped() {
        clearInterval(this.timmer);
    }

};