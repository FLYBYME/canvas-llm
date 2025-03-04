const z = require("zod");

const { PROGRAMMING_LANGUAGES } = require("../constants");

const Schema = z.object({
    explanation: z.string().describe("Detailed explanation of how the code works."),
    language: z
        .enum(
            PROGRAMMING_LANGUAGES.map((lang) => lang.language)
        )
        .describe("The programming language of the code being explained."),
    complexityRating: z
        .enum(["Simple", "Moderate", "Complex", "Very Complex"])
        .describe("Assessment of the code's complexity level."),
    keyComponents: z
        .array(z.string())
        .describe("List of the main components, functions, or concepts in the code.")
});

module.exports = {
    name: "ExplainCode",
    description: "Provide a detailed explanation of code including its purpose, how it works, and key components.",
    schema: Schema,
    input: {
        userMessage: "{userMessage}",
        code: "{code}"
    },
    systemPrompt: `You are an expert code analyst. Explain the provided code in a clear, educational way.

Follow these rules:
- Provide a high-level overview first, then break down the code into logical sections
- Explain the purpose of functions, classes, and important variables
- Identify patterns, algorithms, and key programming concepts used
- Highlight any potential issues, optimizations, or best practices
- Use simple language but don't oversimplify technical concepts
- For complex code, use analogies to help explain difficult concepts

The code to explain is:
<code>
{code}
</code>

Respond with your complete analysis in a structured format, covering all important aspects of the code.`
};