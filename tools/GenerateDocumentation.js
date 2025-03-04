const z = require("zod");

const { PROGRAMMING_LANGUAGES } = require("../constants");

const Schema = z.object({
    documentation: z.string().describe("The generated documentation."),
    language: z
        .enum(
            PROGRAMMING_LANGUAGES.map((lang) => lang.language)
        )
        .describe("The programming language of the code being documented."),
    docFormat: z
        .enum(["JSDoc", "DocString", "XML Doc", "Markdown", "Other"])
        .describe("The documentation format used."),
    completeness: z
        .enum(["Partial", "Complete", "Comprehensive"])
        .describe("Assessment of how complete the documentation coverage is.")
});

module.exports = {
    name: "GenerateDocumentation",
    description: "Generate comprehensive documentation for code including function definitions, classes, and usage examples.",
    schema: Schema,
    input: {
        userMessage: "{userMessage}",
        code: "{code}"
    },
    systemPrompt: `You are a documentation specialist. Create clear, comprehensive documentation for the provided code.

Follow these documentation best practices:
- Use the appropriate documentation format for the programming language
- Document all public APIs, functions, classes, and important methods
- Include parameter descriptions, return values, and thrown exceptions
- Add usage examples for complex functions or classes
- Describe the purpose and high-level functionality
- Note any important limitations, edge cases, or performance considerations
- Keep documentation concise but complete

The code to document is:
<code>
{code}
</code>

Respond with only the complete documentation for this code in the appropriate format.`
};