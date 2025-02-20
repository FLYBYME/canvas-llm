import { z } from "zod";

export const SUGGESTED_QUESTIONS_TOOL_SCHEMA = z.object({
  questions: z.array(
    z.string().describe("A suggested question based on the user's query")
  ).describe("List of suggested questions"),
});

export const SUGGESTED_QUESTIONS_PROMPT = `You are an AI assistant tasked with generating suggested questions based on the user's query.

Here is the overview of the current artifacts:
<overview>
{overview}
</overview>

You also have the following reflections on style guidelines and general memories/facts about the user to use when generating your response:
<reflections>
{reflections}
</reflections>

Rules and guidelines:
<rules-guidelines>
- Generate a list of suggested questions that the user might find helpful or interesting.
- Ensure the questions are relevant to the user's query and the provided context.
- Do not include any additional text before or after the questions.
- Respond with ONLY the list of suggested questions.
</rules-guidelines>`;
