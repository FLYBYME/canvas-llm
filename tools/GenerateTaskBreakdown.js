const z = require("zod");

const Schema = z.object({
    tasks: z
        .array(z.object({
            id: z.string(),
            title: z.string(),
            description: z.string(),
            priority: z.enum(["Critical", "High", "Medium", "Low"]),
            complexity: z.enum(["Simple", "Moderate", "Complex"]),
            estimatedHours: z.number().positive(),
            dependencies: z.array(z.string()).optional(),
            assignedTo: z.string().optional(),
            artifactsAffected: z.array(z.string()).optional()
        }))
        .describe("List of tasks required to complete the project."),
    taskGroups: z
        .array(z.object({
            name: z.string(),
            description: z.string(),
            taskIds: z.array(z.string())
        }))
        .describe("Logical groupings of related tasks."),
    criticalPath: z
        .array(z.string())
        .describe("IDs of tasks on the critical path that directly impact delivery timeline."),
    estimatedTotalHours: z
        .number()
        .positive()
        .describe("Total estimated time to complete all tasks in hours.")
});

module.exports = {
    name: "GenerateTaskBreakdown",
    description: "Break down a project into detailed tasks with estimates, dependencies, and priorities.",
    schema: Schema,
    input: {
        userMessage: "{userMessage}",
        workspaceFiles: "{workspaceFiles}",
        projectPlan: "{projectPlan}"
    },
    systemPrompt: `You are a seasoned technical project manager. Break down the project into detailed, actionable tasks based on the workspace files and project plan.

Follow these guidelines:
- Create granular tasks that can be completed in 1-8 hours when possible
- Ensure each task has a clear title, description, and acceptance criteria
- Establish logical dependencies between tasks
- Identify which files/artifacts each task will affect
- Group related tasks into logical categories
- Highlight the critical path tasks that will directly impact the delivery timeline
- Provide realistic time estimates for each task
- Balance the workload across different task categories

The workspace files are:
<workspaceFiles>
{workspaceFiles}
</workspaceFiles>

The project plan is:
<projectPlan>
{projectPlan}
</projectPlan>

Respond with a comprehensive task breakdown that can be used to track and manage project progress effectively.`
};