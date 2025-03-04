const z = require("zod");
const { zodToJsonSchema } = require('zod-to-json-schema');
const fs = require("fs");

/**
 * Prompts for the tools service
 * Add your prompt definitions and management functions here
 */

const prompts = [];

const remove$ = (obj) => {
    if (typeof obj === 'object' && obj !== null) {
        for (const key in obj) {
            if (key.startsWith('$')) {
                delete obj[key];
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                remove$(obj[key]);
            }
        }
    }
};

const promptFiles = fs.readdirSync("./tools");

for (const promptFile of promptFiles) {
    if (promptFile.endsWith(".js")) {
        const prompt = require(`./tools/${promptFile}`);
        prompts.push(prompt);
    }
}


for (const prompt of prompts) {
    if (!prompt.schema) {
        continue;
    }
    try {

        prompt.schema = zodToJsonSchema(prompt.schema);
    } catch (e) {

    }
    remove$(prompt.schema);
}

module.exports = prompts;
