const z = require("zod");

const Schema = z.object({
    name: z.string().describe("The name of the dependency."),
    path: z.string().describe("The path to the dependency."),
    purpose: z.string().describe("The purpose of the dependency in the artifact."),
    type: z.enum(["package", "library", "api", "module", "other"]).describe("The type of the dependency."),
    internal: z.boolean().describe("Whether the dependency is internal to the workspace."),
    external: z.boolean().describe("Whether the dependency is external to the workspace."),
}).describe("Information about a dependency used in the artifact.");

module.exports = {
    name: "ArtifactDependencies",
    description: "Analyze the dependencies of the artifact.",
    schema: Schema,
    input: {},
    systemPrompt: `You are an AI assistant tasked with analyzing the dependencies and external references of an artifact.

Follow these rules and guidelines:
<rules-guidelines>
- Respond with a JSON object listing all dependencies referenced in the artifact.
- Only include dependencies that are explicitly used in the artifact.
- Do not include any dependencies that are not directly referenced in the artifact.
- If a dependency is referenced using a relative path (e.g., starting with "./" or "../"), mark it as an internal dependency.
</rules-guidelines>`,
    options: {}
};