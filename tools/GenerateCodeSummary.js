const z = require("zod");

const Schema = z.object({
    summary: z.string().describe("High-level summary of the entire codebase and its purpose."),
    components: z
        .array(z.object({
            name: z.string(),
            purpose: z.string(),
            keyFunctionality: z.array(z.string())
        }))
        .describe("Major components or modules identified in the codebase."),
    architecture: z.string().describe("Overview of the code architecture and design patterns used."),
    dependencies: z
        .array(z.object({
            name: z.string(),
            version: z.string().optional(),
            purpose: z.string()
        }))
        .optional()
        .describe("Key external dependencies and their purposes."),
    technicalDebt: z
        .array(z.object({
            area: z.string(),
            description: z.string(),
            impact: z.enum(["Low", "Medium", "High"])
        }))
        .optional()
        .describe("Areas of potential technical debt or improvement opportunities.")
});

module.exports = {
    name: "GenerateCodeSummary",
    description: "Analyze an artifact and generate a high-level summary of the codebase.",
    schema: Schema,
    input: {
        userMessage: "{userMessage}",
        code: "{code}"
    },
    systemPrompt: `You are an expert code analyst. Analyze the provided code and generate a high-level summary of the codebase.

This is the code to analyze:
<code>
{code}
</code>

Follow these rules:
- You should respond with the ENTIRE summary, with no additional text before and after.
- Provide a high-level summary of the entire codebase and its purpose.
- Identify major components or modules and their purposes.
- Provide an overview of the code architecture and design patterns used.
- Identify key external dependencies and their purposes.
- Provide areas of potential technical debt or improvement opportunities.
- Ensure the summary is clear, concise, and easy to understand.

Respond with only the complete summary in the appropriate format.`
};