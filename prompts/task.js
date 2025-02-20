import { z } from "zod";

export const TaskSchema = z.object({
  filename: z.string().describe("The name of the file being modified"),
  description: z.string().describe("A detailed description of the task"),
  type: z.enum([
    "modify",
    "delete",
    "rename",
    "refactor",
    "optimize",
    "add",
    "create",
  ]).describe("The type of operation to be performed"),
  details: z.array(
    z.string().describe("Additional details or instructions for the task")
  ),
  references: z.array(z.string()).describe("References to other filenames related to the task"),
});

export const GENERATE_TASKS_PROMPT = `You are an AI assistant tasked with generating a task based on the user's description.

Here is the user's request:
{userRequest}

Here is the current content of the artifacts:
<artifact>
{artifactContent}
</artifact>

You also have the following reflections on style guidelines and general memories/facts about the user to use when generating your response:
<reflections>
{reflections}
</reflections>

Rules and guidelines:
<rules-guidelines>
- Generate a task that is clear, concise, and actionable.
- Ensure the task is relevant to the user's description and the provided context.
- Do not include any additional text before or after the task.
- Respond with ONLY the generated task.
- Do not assume any other code other than the provided artifacts.
- If variables are needed, include them in the task description.
</rules-guidelines>`;
