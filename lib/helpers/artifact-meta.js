import { Run, model } from "../model.js";
import { z } from "zod";
import { PROGRAMMING_LANGUAGES, APP_CONTEXT } from "../constants.js";

export const GET_TITLE_TYPE_REWRITE_ARTIFACT = `You are an AI assistant who has been tasked with analyzing the user's request to rewrite an artifact.

Your task is to determine what the title and type of the artifact should be based on the user's request.

Use this context about the application when making your decision:
${APP_CONTEXT}

The types you can choose from are:
- 'text': This is a general text artifact. This could be a poem, story, email, or any other type of writing.
- 'code': This is a code artifact. This could be a code snippet, a full program, or any other type of code.

Be careful when selecting the type, as this will update how the artifact is displayed in the UI.

Remember, if you change the type from 'text' to 'code', you must also define the programming language the code should be written in.

Here is the current artifact (only the first 500 characters, or less if the artifact is shorter):
<artifact>
{artifact}
</artifact>

USE the \`artifact_meta\` tool to update the artifact meta information.

The user's message below is the most recent message they sent. Use this to determine what the title and type of the artifact should be.`;


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

export const ArtifactMetaTool = {
    name: "artifact_meta",
    description: "Update the artifact meta information.",
    schema: ArtifactMetaSchema,
}

export const artifactMetaPrompt = async (artifact, conversation) => {
    const fullSystemPrompt = GET_TITLE_TYPE_REWRITE_ARTIFACT.replace(
        "{artifact}",
        artifact.getFormattedContent(true)
    );

    const contextDocuments = await artifact.getContextDocuments();

    const messages = [
        { role: "system", content: fullSystemPrompt },
        ...contextDocuments,
        ...conversation.getFormattedMessages(),
    ];

    const response = await model.run(messages, ArtifactMetaTool);

    return response;
};