const z = require("zod");

const { PROGRAMMING_LANGUAGES } = require("../constants");

const Schema = z.object({
    refactoredCode: z.string().describe("The refactored version of the code."),
    language: z
        .enum(
            PROGRAMMING_LANGUAGES.map((lang) => lang.language)
        )
        .describe("The programming language of the code."),
    changesMade: z
        .array(z.string())
        .describe("List of significant changes made during refactoring."),
    performanceImpact: z
        .enum(["Improved", "Same", "Possible degradation", "Unknown"])
        .describe("Expected impact on performance after refactoring."),
    maintainabilityImpact: z
        .enum(["Improved", "Same", "Reduced"])
        .describe("Expected impact on code maintainability after refactoring.")
});

module.exports = {
    name: "RefactorCode",
    description: "Refactor code to improve quality, readability, or performance while preserving functionality.",
    schema: Schema,
    input: {
        userMessage: "{userMessage}",
        originalCode: "{originalCode}"
    },
    systemPrompt: `You are an expert code refactoring specialist. Improve the provided code while maintaining its core functionality.

Follow these principles:
- Apply appropriate design patterns and SOLID principles
- Remove code smells, redundancies, and unnecessary complexity
- Improve naming conventions and code organization
- Optimize for readability and maintainability first, then performance
- Consider edge cases and error handling
- Preserve the original behavior and API contracts
- Document significant changes and the reasoning behind them

The code to refactor is:
<originalCode>
{originalCode}
</originalCode>

Respond only with the completely refactored code, ensuring it maintains the same functionality.`
};