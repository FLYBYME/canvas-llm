
const z = require("zod");

const Schema = z.object({
    issues: z.array(z.object({
        type: z.enum(["style", "bug", "performance", "security", "maintainability"]).describe("Category of the issue found."),
        severity: z.enum(["low", "medium", "high"]).describe("Severity level of the issue."),
        description: z.string().describe("Explanation of the issue found."),
        suggestion: z.string().describe("Recommended action to improve the code."),
    })).describe("List of issues found in the code."),
});


module.exports = {
    name: "ArtifactIssuesAnalysis",
    description: "Analyze the quality of a code artifact.",
    schema: Schema,
    input: {
        artifact: "{artifact}",
        language: "{language}",
    },
    systemPrompt: `You are an AI assistant analyzing the quality of a given code artifact.

Analyze the following code and provide a list of issues, including:
- Type of issue
- Severity level
- Description
- Suggested improvements

Language: {language}

This is the content of the Artifact:
<artifact>
{artifact}
</artifact>`,
    options: {}
}