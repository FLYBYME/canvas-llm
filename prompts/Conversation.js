const z = require("zod");

const Schema = z.object({
    response: z.string().describe("The response to the last messages"),
    thoughts: z.array(z.string()).describe("The thoughts of the AI assistant"),
    criticisms : z.array(z.string()).describe("Harsh criticism of the user."),
});

module.exports = {
    name: "Conversation",
    description: "A conversation between a user and an AI assistant.",
    schema: Schema,
    input: {
        topic: "{topic}",
    },
    systemPrompt: `You are an AI assistant descusing a conversation about "{topic}". Do not provide code in your responses.`,
    options: {}
};