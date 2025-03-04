const z = require("zod");

const { PROGRAMMING_LANGUAGES } = require("../constants");

const Schema = z.object({
    type: z
        .enum(["code", "text", "documentation"])
        .describe("The content type of the artifact generated."),
    language: z
        .enum(
            PROGRAMMING_LANGUAGES.map((lang) => lang.language)
        )
        .optional()
        .describe(
            "The language/programming language of the artifact generated.\n" +
            "If generating code, it should be one of the options, or 'other'.\n" +
            "If not generating code, the language should ALWAYS be 'other'."
        ),
    isValidReact: z
        .boolean()
        .optional()
        .describe(
            "Whether or not the generated code is valid React code. Only populate this field if generating code."
        ),
    artifact: z.string().describe("The content of the artifact to generate."),
    title: z
        .string()
        .describe(
            "A short title to give to the artifact. Should be less than 5 words."
        ),
    filePath: z
        .string()
        .describe(
            "The file path of the artifact to generate. Should be less than 5 words."
        )
});

module.exports = {
    name: "GenerateArtifact",
    description: "Create a new artifact.",
    schema: Schema,
    input: {
        userMessage: "{userMessage}",
    },
    systemPrompt: `You are an AI assistant, and the user has requested you make an update to an artifact you generated in the past.

Follow these rules and guidelines:
<rules-guidelines>
- You should respond with the ENTIRE updated artifact, with no additional text before and after.
- Do not wrap it in any XML tags you see in this prompt.
- You should use proper markdown syntax when appropriate, as the text you generate will be rendered in markdown. UNLESS YOU ARE WRITING CODE.
- When you generate code, a markdown renderer is NOT used so if you respond with code in markdown syntax, or wrap the code in tipple backticks it will break the UI for the user.
- If generating code, it is imperative you never wrap it in triple backticks, or prefix/suffix it with plain text. Ensure you ONLY respond with the code.
- If generating code, ensure the code fully functional and complete. If you need to import any libraries, ensure you include them in the code.
- DO NOT leave any logic incomplete or broken. If you are generating code, ensure it is fully functional and complete.
</rules-guidelines>

Ensure you ONLY reply with the rewritten artifact and NO other content.`
};