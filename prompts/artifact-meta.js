const z = require("zod");

const { PROGRAMMING_LANGUAGES } = require("../lib/constants");

const Schema = z.object({
    type: z.enum(["text", "code", "documentation", "test"]).describe("The type of the artifact content."),
    title: z.string().describe("The new title to give the artifact."),
    language: z.enum(PROGRAMMING_LANGUAGES.map((lang) => lang.language)).describe("The language of the code artifact."),
    description: z.string().describe("The new description to give the artifact."),
});

module.exports = {
    name: "ArtifactMeta",
    description: "Analyze the meta data of the artifact.",
    schema: Schema,
    input: {},
    systemPrompt: `You are an AI assistant tasked with analyzing the meta data of an artifact.

Follow these rules and guidelines:
<rules-guidelines>
- Provide a descriptive title for the artifact.
- Provide a clear and concise description of the artifact.
- Provide a type of the artifact (e.g., code, documentation, test).
- Provide a language of the code artifact (e.g., javascript, python, java, c++, c#).
</rules-guidelines>`,
    options: {}
};