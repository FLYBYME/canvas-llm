import { ChatOllama } from "@langchain/ollama";
import { ChatOpenAI } from "@langchain/openai";

export class Run {
    constructor(config) {
        this.messages = config.messages;
        this.tool = config.tool;
        this.startTime = null;
        this.response = null;
        this.error = null;
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }

    start() {
        this.startTime = Date.now();
    }

    finish(response, error) {
        this.response = response;
        this.error = error;
        if (error) {
            this.reject(error);
        } else {
            this.resolve(response);
        }
    }

    getMessages() {
        return this.messages;
    }
}

class Model {
    constructor() {
        this.ollama = new ChatOllama({
            model: "llama3.2:1b",
            temperature: 0,
            baseUrl: "http://192.168.1.180:11434",
            numThread: 10,
            keepAlive: "1h",
            numCtx: 10 * 1024,
        });
        this.openai = new ChatOpenAI({
            model: "gpt-4o-mini",
            temperature: 0,
        });

        this.queue = [];
        this.active = new Set(); // Use a Set for faster removal
        this.maxConcurrentRuns = 2; // More descriptive name
    }

    async run(messages, tool) {
        const run = new Run({ messages, tool }); // Select model here
        this.queue.push(run);
        this.processQueue();
        return run.promise; // Return the promise directly
    }


    selectModel() {
        // Logic to select the appropriate model based on the tool or other criteria
        // Example:
        return this.openai; // Default to OpenAI
    }

    async processQueue() {
        while (this.active.size < this.maxConcurrentRuns && this.queue.length > 0) {
            const run = this.queue.shift();
            this.active.add(run);
            run.start();

            const tool = run.tool;
            if (!tool) {
                const result = await this.selectModel().invoke(run.getMessages());
                run.finish(result, null);
                this.active.delete(run);
                continue;
            }

            const model = this.selectModel().bindTools([tool], {
                tool_choice: tool.name
            }).withConfig({ runName: tool.name });

            const result = await model.invoke(run.getMessages());

            const args = result.tool_calls?.[0].args;
            if (!args) {
                const error = new Error("Tool call not found");
                run.finish(null, error);
                this.active.delete(run);
                continue;
            }

            run.finish(args, null);
            this.active.delete(run);
        }
    }
}

export const model = new Model();