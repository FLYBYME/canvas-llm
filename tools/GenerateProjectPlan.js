const z = require("zod");

const Schema = z.object({
    plan: z.string().describe("The complete project plan including goals, timeline, and deliverables."),
    goals: z
        .array(z.string())
        .describe("Key project goals listed in order of priority."),
    milestones: z
        .array(z.object({
            name: z.string(),
            description: z.string(),
            deliverables: z.array(z.string()),
            estimatedTimeInDays: z.number().positive()
        }))
        .describe("Major project milestones with descriptions, deliverables, and time estimates."),
    risks: z
        .array(z.object({
            description: z.string(),
            severity: z.enum(["Low", "Medium", "High"]),
            mitigation: z.string()
        }))
        .optional()
        .describe("Potential risks to project completion and their mitigation strategies."),
    dependencies: z
        .array(z.object({
            name: z.string(),
            type: z.enum(["Technical", "Resource", "External"]),
            description: z.string()
        }))
        .optional()
        .describe("Project dependencies that could impact development.")
});

module.exports = {
    name: "GenerateProjectPlan",
    description: "Create a comprehensive project plan with milestones, dependencies, and risks for a workspace of artifacts.",
    schema: Schema,
    input: {
        userMessage: "{userMessage}",
        workspaceFiles: "{workspaceFiles}"
    },
    systemPrompt: `You are an expert project planner. Create a detailed project plan based on the workspace files and user's requirements.

Follow these principles:
- Analyze the workspace files to understand the project structure and requirements
- Create realistic milestones with clear deliverables
- Identify potential risks and dependencies
- Suggest a timeline that accounts for development, testing, and integration
- Organize tasks in a logical sequence with dependencies clearly marked
- Prioritize tasks based on technical dependencies and business value
- Provide clear success criteria for each milestone

The workspace files are:
<workspaceFiles>
{workspaceFiles}
</workspaceFiles>

Respond with a complete, well-structured project plan that will guide development effectively.`
};