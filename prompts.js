const z = require("zod");
const { zodToJsonSchema } = require('zod-to-json-schema');

/**
 * Prompts for the tools service
 * Add your prompt definitions and management functions here
 */

const prompts = [
    require('./tools/GenerateArtifact.js'),
];

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