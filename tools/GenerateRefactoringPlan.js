const z = require("zod");

const Schema = z.object({
    refactoringPlan: z.string().describe("The complete refactoring plan with steps and reasoning."),
    codeQualityIssues: z
        .array(z.object({
            issue: z.string(),
            severity: z.enum(["Critical", "Major", "Minor", "Cosmetic"]),
            location: z.string(),
            recommendation: z.string()
        }))
        .describe("Identified code quality issues that need to be addressed."),
    refactoringPhases: z
        .array(z.object({
            name: z.string(),
            description: z.string(),
            tasks: z.array(z.string()),
            estimatedEffort: z.enum(["Small", "Medium", "Large"]),
            risk: z.enum(["Low", "Medium", "High"])
        }))
        .describe("Phases of the refactoring effort with associated tasks and risks."),
    testingStrategy: z.string().describe("Strategy for testing the refactored code to ensure functionality is preserved.")
});

module.exports = {
    name: "GenerateRefactoringPlan",
    description: "Create a plan to refactor existing code with steps, phases, and testing strategies.",
    schema: Schema,
    input: {
        userMessage: "{userMessage}",
        workspaceFiles: "{workspaceFiles}"
    },
    systemPrompt: `You are a code quality expert. Create a detailed plan for refactoring the code in the workspace.

Follow these principles:
- Analyze the codebase for code smells, anti-patterns, and technical debt
- Identify areas that would benefit most from refactoring
- Create a phased approach to refactoring with clear steps
- Prioritize changes that improve maintainability and readability
- Consider backward compatibility and minimizing risk
- Suggest appropriate tests to verify that functionality is preserved
- Recommend appropriate design patterns where applicable
- Consider the effort vs. benefit of each proposed change

The workspace files are:
<workspaceFiles>
{workspaceFiles}
</workspaceFiles>

Respond with a comprehensive refactoring plan that can guide developers through improving the code quality while minimizing risk.`
};