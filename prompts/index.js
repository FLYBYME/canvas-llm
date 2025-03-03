const { zodToJsonSchema } = require('zod-to-json-schema');

// Prompts 

const prompts = [
    require('./artifact-issues'),
    require('./artifact-meta'),
    require('./artifact-dependencies'),
    require('./GenerateInitialFileStructure'),
    require('./GenerateRulesGuidelines'),
    ...require('./ProjectProposal'),
    require('./Conversation'),
    require('./artifact-new'),
    require('./artifact-review'),
    require('./artifact-update'),
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
