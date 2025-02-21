import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { PROGRAMMING_LANGUAGES, APP_CONTEXT } from "../constants.js";

export const GET_TITLE_TYPE_REWRITE_ARTIFACT = `You are an AI assistant who has been tasked with analyzing the users request to rewrite an artifact.

Your task is to determine what the title and type of the artifact should be based on the users request.

Use this context about the application when making your decision:
${APP_CONTEXT}

The types you can choose from are:
- 'text': This is a general text artifact. This could be a poem, story, email, or any other type of writing.
- 'code': This is a code artifact. This could be a code snippet, a full program, or any other type of code.

Be careful when selecting the type, as this will update how the artifact is displayed in the UI.

Remember, if you change the type from 'text' to 'code' you must also define the programming language the code should be written in.

Here is the current artifact (only the first 500 characters, or less if the artifact is shorter):
<artifact>
{artifact}
</artifact>

The users message below is the most recent message they sent. Use this to determine what the title and type of the artifact should be.`;

export const ArtifactMetaSchema = z.object({
    type: z
        .enum(["text", "code"])
        .describe("The type of the artifact content."),
    title: z
        .string()
        .describe(
            "The new title to give the artifact."
        ),
    language: z
        .enum(
            PROGRAMMING_LANGUAGES.map((lang) => lang.language)
        )
        .describe(
            "The language of the code artifact. This should be populated with the programming language if the user is requesting code to be written, or 'other', in all other cases."
        ),
    description: z
        .string()
        .describe("The new description to give the artifact."),
}).describe("Update the artifact meta information.");


export const artifactMetaPrompt = async (artifact, conversation) => {
    const model = new ChatOpenAI({
        model: "gpt-4o-mini",
        temperature: 0,
    }).withStructuredOutput(
        ArtifactMetaSchema,
        {
            name: "ArtifactMetaSchema",
        }
    ).withConfig({ runName: "ArtifactMeta" });

    const fullSystemPrompt = GET_TITLE_TYPE_REWRITE_ARTIFACT.replace(
        "{artifact}",
        artifact.getFormattedContent(true)
    );


    const messages = [
        { role: "system", content: fullSystemPrompt },
        ...conversation.getFormattedMessages(),
    ];

    const response = await model.invoke(messages);

    return response;
};