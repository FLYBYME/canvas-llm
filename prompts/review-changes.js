import { z } from "zod";

export const REVIEW_CHANGES_PROMPT = `
You are an expert code reviewer. Your task is to review the changes made to a file and determine if they are correct or not. 

Here is the task description:
<task>
Filename: {filename}
Description: {description}
Type: {type}
Details: 
{details}
</task>

Here is the updated artifact content:
<artifact>
{artifactContent}
</artifact>

Here is the git diff of the changes:
<gitDiff>
{gitDiff}
</gitDiff>

Please provide your review and indicate if the changes are correct or not, along with any suggestions for improvement.

If the changes are correct, respond with "CORRECT". If the changes are incorrect, respond with "INCORRECT" and provide suggestions for improvement.
`;

export const ReviewChangesSchema = z.object({
  pass: z.boolean().describe("Whether the changes are correct or not"),
  suggestions: z.array(z.string()).describe("Suggestions for improvement"),
  review: z.string().describe("The review of the changes"),
});
