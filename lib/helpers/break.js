import { model } from "../model.js";
import { z } from "zod";

// Define the schema for the specific code actions
const CodeActionSchema = z.object({
    action: z.enum(["create", "modify", "delete", "no-action"]),
    target: z.string().describe("The file, function, or code block to be affected."),
    details: z.string().optional().describe("Any additional instructions or context for the action."),
});

// Define the schema for subtasks
const SubTaskSchema = z.object({
    subTask: z.string(),
    objective: z.string(),
    codeActions: z.array(CodeActionSchema).describe("Specific code actions for this subtask."),
    dependencies: z.array(z.string()).describe("Subtasks that must be completed before this one."),
});

// Define the schema for components
const ComponentSchema = z.object({
    component: z.string(),
    subTasks: z.array(SubTaskSchema),
});

// Define the schema for the overall task plan
const TaskPlanSchema = z.object({
    task: z.string(),
    components: z.array(ComponentSchema),
});

// Define the framework for breaking down the task into manageable code-specific actions
export const BREAK_SYSTEM_PROMPT = `Break down the following task into smaller programming actions for efficient code development.

Task Title:
{title}

Task Description:
{description}

Workspace Description:
{workspaceDescription}

Files:
<files>
{files}
</files>

Note: Focus only on the code actions needed, modifying, or organizing the source code itself. Exclude environment setup, file management, or configuration tasks.

List the key code actions required to complete the task, structured logically. Specify what code should be written, changed, or restructured in each step.`;

export const breakDownTaskTool = {
    name: "break_down_task",
    description: "Break down a task into manageable code actions.",
    schema: TaskPlanSchema,
};

export const breakDownTask = async (title, description, workspaceDescription, files) => {
    const fullSystemPrompt = BREAK_SYSTEM_PROMPT
        .replace("{title}", title)
        .replace("{description}", description)
        .replace("{workspaceDescription}", workspaceDescription)
        .replace("{files}", files.join("\n"));
    const response = await model.run([{ role: "user", content: fullSystemPrompt }], breakDownTaskTool);
    return response;
};

export const REVIEW_EACH_COMPONENT_SYSTEM_PROMPT = `For each major code action required to complete the task:

Task:
{task}

Components/Steps:
{components}

For each component, break it down into smaller sub-actions. What should be done first, second, etc., within each step?`;

export const reviewEachComponentTool = {
    name: "review_each_component",
    description: "Review each code component and break it down into smaller actions.",
    schema: ComponentSchema,
};

export const reviewEachComponent = async (task, components) => {
    const fullSystemPrompt = REVIEW_EACH_COMPONENT_SYSTEM_PROMPT.replace("{task}", task).replace("{components}", components);
    const response = await model.run([{ role: "user", content: fullSystemPrompt }], reviewEachComponentTool);
    return response;
};

export const ESTABLISH_OBJECTIVES_SYSTEM_PROMPT = `Given the sub-actions identified for each component:

Component:
{component}

Sub-actions:
{subTasks}

For each sub-action, what is the specific objective? What should be achieved or completed during that action?`;

export const establishObjectivesTool = {
    name: "establish_objectives",
    description: "Establish objectives for each sub-action.",
    schema: SubTaskSchema,
};

export const establishObjectives = async (component, subTasks) => {
    const fullSystemPrompt = ESTABLISH_OBJECTIVES_SYSTEM_PROMPT.replace("{component}", component).replace("{subTasks}", subTasks);
    const response = await model.run([{ role: "user", content: fullSystemPrompt }], establishObjectivesTool);
    return response;
};

export const ADDRESS_DEPENDENCIES_SYSTEM_PROMPT = `For each sub-action:

Sub-task:
{subTask}

Objectives:
{objective}

Are there any dependencies between these sub-actions? Which should be completed first, and which can follow?`;

export const addressDependenciesTool = {
    name: "address_dependencies",
    description: "Address dependencies between sub-actions.",
    schema: SubTaskSchema,
};

export const addressDependencies = async (subTask, objective) => {
    const fullSystemPrompt = ADDRESS_DEPENDENCIES_SYSTEM_PROMPT.replace("{subTask}", subTask).replace("{objective}", objective);
    const response = await model.run([{ role: "user", content: fullSystemPrompt }], addressDependenciesTool);
    return response;
};

// Generate task plan based on the breakdown
export const generateTaskPlan = async (plan) => {
    console.log(`Generating task plan for title: ${plan.title}, description: ${plan.description}`);

    const workspaceDescription = await plan.workspace.getDescription();
    const files = await plan.workspace.getFiles();

    const { task, components } = await breakDownTask(plan.title, plan.description, workspaceDescription, files);

    console.log(`Got components: ${components}`);

    const componentPromises = components.map(async (component) => {
        console.log(`Processing component: ${component}`);

        const review = await reviewEachComponent(task, component);
        console.log(`Got review: ${JSON.stringify(review, null, 2)}`);

        const objectives = await establishObjectives(review.component, review.subTasks.join("\n"));
        console.log(`Got objectives: ${JSON.stringify(objectives, null, 2)}`);

        const dependencies = await addressDependencies(objectives.subTask, objectives.objective);
        console.log(`Got dependencies: ${JSON.stringify(dependencies, null, 2)}`);

        return {
            component,
            review,
            objectives,
            dependencies
        };
    });

    const componentObjectives = await Promise.all(componentPromises);

    console.log(`Got component objectives: ${JSON.stringify(componentObjectives, null, 2)}`);

    return { task, components: componentObjectives };
};
