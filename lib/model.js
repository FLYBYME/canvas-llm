import { ChatOllama } from "@langchain/ollama";
import { ChatOpenAI } from "@langchain/openai";

class Run {
    constructor(config) {
        this.messages = config.messages;
        this.tools = config.tools;
        this.structuredOutput = config.structuredOutput;
        this.format = config.format;
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
        const run = new Run(this.selectModel(tool), messages, [tool], false, null); // Select model here
        this.queue.push(run);
        this.processQueue();
        return run.promise; // Return the promise directly
    }


    selectModel(tool) {
        // Logic to select the appropriate model based on the tool or other criteria
        // Example:
        return this.openai; // Default to OpenAI
    }

    async processQueue() {
        while (this.active.size < this.maxConcurrentRuns && this.queue.length > 0) {
            const run = this.queue.shift();
            this.active.add(run);
            run.start();

            const tool = run.tools[0];
            let model = run.model; // Model is already selected

            if (tool) {
                model = model.withStructuredOutput(tool.schema, { name: tool.name }).withConfig({ runName: tool.name });
            }

            try {
                const response = await model.invoke(run.messages);
                run.finish(response);
                console.log(`Run finished in ${Date.now() - run.startTime}ms`);
            } catch (error) {
                run.finish(null, error);
                console.error("Run error:", error); // Log the error
            } finally {
                this.active.delete(run); // Use Set.delete
                this.processQueue(); // Process the queue after each run
            }
        }
    }
}

export const model = new Model();