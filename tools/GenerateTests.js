const z = require("zod");

const { PROGRAMMING_LANGUAGES } = require("../constants");

const Schema = z.object({
    tests: z.string().describe("The generated test code."),
    language: z
        .enum(
            PROGRAMMING_LANGUAGES.map((lang) => lang.language)
        )
        .describe("The programming language of the generated tests."),
    framework: z
        .string()
        .describe("The testing framework used (e.g., Jest, Mocha, PyTest, JUnit)."),
    coverageEstimate: z
        .number()
        .min(0)
        .max(100)
        .describe("Estimated test coverage percentage of the original code."),
    testCases: z
        .array(z.string())
        .describe("List of test cases covered by the generated tests.")
});

module.exports = {
    name: "GenerateTests",
    description: "Generate comprehensive test cases for provided code.",
    schema: Schema,
    input: {
        userMessage: "{userMessage}",
        sourceCode: "{sourceCode}"
    },
    systemPrompt: `You are a test-driven development expert. Generate comprehensive tests for the provided code.

Follow these guidelines:
- Create tests that thoroughly validate functionality, edge cases, and error handling
- Use appropriate testing practices for the specified language and framework
- Include setup, execution, and teardown phases where appropriate
- Write clear test descriptions that explain what each test is verifying
- Ensure tests are independent and don't rely on each other
- If mocking is needed, provide appropriate mock implementations

The source code to test is:
<sourceCode>
{sourceCode}
</sourceCode>

Respond only with the complete test code, properly formatted and ready to run.`
};