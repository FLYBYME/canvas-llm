import { model } from "../model.js";
import { z } from "zod";

export const TITLE_SYSTEM_PROMPT = `You are tasked with generating a concise, descriptive title for a conversation between a user and an AI assistant. The title should capture the main topic or purpose of the conversation.

Guidelines for title generation:
- Keep titles extremely short (ideally 2-5 words)
- Focus on the main topic or goal of the conversation
- Use natural, readable language
- Avoid unnecessary articles (a, an, the) when possible
- Do not include quotes or special characters
- Capitalize important words

Use the 'generate_title' tool to output your title.`;

export const TITLE_USER_PROMPT = `Based on the following conversation, generate a very short and descriptive title for:

{conversation}

<artifact>
{artifactContext}
</artifact>`;

export const TitleSchema = z.object({
    title: z.string().describe("The generated title for the conversation."),
});

export const generateTitleTool = {
    name: "generate_title",
    description: "Generate a concise title for the conversation.",
    schema: TitleSchema,
};

export async function generateThreadTitle(artifact, conversation) {
    const fullUserPrompt = TITLE_USER_PROMPT.replace(
        "{conversation}",
        conversation.getFormattedMessages()
    ).replace("{artifactContext}", artifact.getFormattedContent(true));


    const contextDocuments = await artifact.getContextDocuments();

    const messages = [
        { role: "system", content: TITLE_SYSTEM_PROMPT },
        ...contextDocuments,
        { role: "user", content: fullUserPrompt },
    ];

    const response = await model.run(messages, generateTitleTool);

    return response;
}