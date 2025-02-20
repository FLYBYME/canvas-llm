import { z } from "zod";

export const GENERATE_FILE_TASKS_PROMPT = `You are an AI assistant tasked with analyzing the user's request and identifying specific tasks that need to be performed on individual files.

Rules and guidelines:
<rules-guidelines>
- Extract the file names or descriptions from the user's request.
- For each file, generate a list of concrete tasks that need to be performed.
- Ensure tasks are detailed and actionable, specifying operations like "modify", "delete", "rename", "refactor", "optimize", or "add functionality".
- Maintain the logical order of operations if dependencies exist between tasks.
- Do NOT include extraneous explanations—only the structured task list.
- If variables are needed, include them in the task description.
- Do not assume any other code other than the provided artifacts.
</rules-guidelines>

Here is the user's request:
{userRequest}

Generate a structured list of tasks per file based on the description.
`;

export const FileTaskSchema = z.object({
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
