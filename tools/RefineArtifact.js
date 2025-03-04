const z = require("zod");

const Schema = z.object({
    artifact: z.string().describe("The content of the artifact to refine."),
    feedback: z.string().describe("The feedback or instructions for refining the artifact."),
    language: z
        .enum(["python", "javascript", "typescript", "c", "c++", "java", "go", "php", "ruby", "sql", "html", "css", "json", "xml", "yaml", "markdown", "bash"])
        .optional()
        .describe("The language/programming language of the artifact to refine."),
    isValidReact: z
        .boolean()
        .optional()
        .describe("Whether or not the refined code is valid React code. Only populate this field if refining code.")
});

module.exports = {
    name: "RefineArtifact",
    description: "Refine an existing artifact based on feedback.",
    schema: Schema,
    input: {
        userMessage: "{userMessage}",
    },
    systemPrompt: `You are an AI assistant, and the user has requested you refine an artifact they provided.

Follow these rules and guidelines:
<rules-guidelines>
- You should respond with the ENTIRE refined artifact, with no additional text before and after.
- Do not wrap it in any XML tags you see in this prompt.
- You should use proper markdown syntax when appropriate, as the text you generate will be rendered in markdown. UNLESS YOU ARE WRITING CODE.
- When you generate code, a markdown renderer is NOT used so if you respond with code in markdown syntax, or wrap the code in tipple backticks it will break the UI for the user.
- If generating code, it is imperative you never wrap it in triple backticks, or prefix/suffix it with plain text. Ensure you ONLY respond with the code.
- If generating code, ensure the code fully functional and complete. If you need to import any libraries, ensure you include them in the code.
- DO NOT leave any logic incomplete or broken. If you are generating code, ensure it is fully functional and complete.
</rules-guidelines>

Ensure you ONLY reply with the refined artifact and NO other content.`,
    userPrompt: `The users message below is the most recent message they sent. Use this to determine how to refine the artifact.
<user-message>
{userMessage}
</user-message>`
};
