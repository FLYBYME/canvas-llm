const z = require("zod");

const Schema = z.object({
    review: z.string().describe("The review of the artifact"),
    suggestions: z.array(z.string()).describe("Suggestions for how to improve the artifact"),
    feedback: z.string().describe("Feedback on the artifact"),
});

module.exports = {
    name: "ReviewArtifact",
    description: "Review an artifact and provide feedback on how to improve it.",
    schema: Schema,
    input: {
        artifact: '{artifact}'
    },
    systemPrompt: `You are an AI assistant that reviews code artifacts and provides feedback on how to improve them.`,
    output: {
        
    },
    conversation: true
};