import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

import { PROGRAMMING_LANGUAGES } from "../constants.js";

const DEFAULT_CODE_PROMPT_RULES = `- Do NOT include triple backticks when generating code. The code should be in plain text.`;

const APP_CONTEXT = `
<app-context>
The name of the application is "Open Canvas". Open Canvas is a web application where users have a chat window and a canvas to display an artifact.
Artifacts can be any sort of writing content, emails, code, or other creative writing work. Think of artifacts as content, or writing you might find on you might find on a blog, Google doc, or other writing platform.
Users only have a single artifact per conversation, however they have the ability to go back and fourth between artifact edits/revisions.
If a user asks you to generate something completely different from the current artifact, you may do this, as the UI displaying the artifacts will be updated to show whatever they've requested.
Even if the user goes from a 'text' artifact to a 'code' artifact.
</app-context>
`;

const ARTIFACT_PROMPT = `Here is the full context of the artifact:
<artifact>
{artifact}
</artifact>
`;

export const NEW_ARTIFACT_PROMPT = `You are an AI assistant tasked with generating a new artifact based on the users request.
Ensure you use markdown syntax when appropriate, as the text you generate will be rendered in markdown.
  
Use the full chat history as context when generating the artifact.

Follow these rules and guidelines:
<rules-guidelines>
- Do not wrap it in any XML tags you see in this prompt.
- If writing code, do not add inline comments unless the user has specifically requested them. This is very important as we don't want to clutter the code.
${DEFAULT_CODE_PROMPT_RULES}
- Make sure you fulfill ALL aspects of a user's request. For example, if they ask for an output involving an LLM, prefer examples using OpenAI models with LangChain agents.
</rules-guidelines>

{artifact}

The users message below is the most recent message they sent. Use this to determine what the title and type of the artifact should be.
`;


export const UPDATE_ENTIRE_ARTIFACT_PROMPT = `You are an AI assistant, and the user has requested you make an update to an artifact you generated in the past.

Here is the current content of the artifact:
<artifact>
{artifactContent}
</artifact>

Please update the artifact based on the user's request.

Follow these rules and guidelines:
<rules-guidelines>
- You should respond with the ENTIRE updated artifact, with no additional text before and after.
- Do not wrap it in any XML tags you see in this prompt.
- You should use proper markdown syntax when appropriate, as the text you generate will be rendered in markdown. UNLESS YOU ARE WRITING CODE.
- When you generate code, a markdown renderer is NOT used so if you respond with code in markdown syntax, or wrap the code in tipple backticks it will break the UI for the user.
- If generating code, it is imperative you never wrap it in triple backticks, or prefix/suffix it with plain text. Ensure you ONLY respond with the code.
${DEFAULT_CODE_PROMPT_RULES}
</rules-guidelines>

Ensure you ONLY reply with the rewritten artifact and NO other content.
`;




export const ArtifactSchema = z.object({
    type: z
        .enum(["code", "text"])
        .describe("The content type of the artifact generated."),
    language: z
        .enum(
            PROGRAMMING_LANGUAGES.map((lang) => lang.language)
        )
        .optional()
        .describe(
            "The language/programming language of the artifact generated.\n" +
            "If generating code, it should be one of the options, or 'other'.\n" +
            "If not generating code, the language should ALWAYS be 'other'."
        ),
    isValidReact: z
        .boolean()
        .optional()
        .describe(
            "Whether or not the generated code is valid React code. Only populate this field if generating code."
        ),
    artifact: z.string().describe("The content of the artifact to generate."),
    title: z
        .string()
        .describe(
            "A short title to give to the artifact. Should be less than 5 words."
        ),
        filename: z
        .string()
        .describe(
            "A filename to give to the artifact."
        ),
});

export const generateArtifactTool = {
    name: "generate_artifact",
    description: "Generate a artifact based on the users request.",
    schema: ArtifactSchema,
};

export async function generateNewArtifact(specification) {
    const model = new ChatOpenAI({
        model: "gpt-4o-mini",
        temperature: 0,
    }).bindTools([generateArtifactTool], {
        tool_choice: "generate_artifact"
    }).withConfig({ runName: "GenerateArtifact" });

    let artifactPrompt = '';

    if (specification.artifact) {
        artifactPrompt = ARTIFACT_PROMPT.replace(
            "{artifact}",
            specification.artifact.getFormattedContent()
        );
    }

    const fullSystemPrompt = NEW_ARTIFACT_PROMPT.replace(
        "{artifact}",
        artifactPrompt
    );

    const messages = [
        { role: "system", content: fullSystemPrompt },
        ...specification.conversation.getFormattedMessages(),
    ];

    const response = await model.invoke(messages);

    const args = response.tool_calls?.[0]?.args;
    if (!args) {
        throw new Error("No args found in response");
    }

    return args;
}

export async function updateEntireArtifact(specification) {
    const model = new ChatOpenAI({
        model: "gpt-4o-mini",
        temperature: 0,
    }).bindTools([generateArtifactTool], {
        tool_choice: "generate_artifact"
    }).withConfig({ runName: "UpdateArtifact" });

    const fullSystemPrompt = UPDATE_ENTIRE_ARTIFACT_PROMPT.replace(
        "{artifactContent}",
        specification.artifact.getFormattedContent()
    );

    const messages = [
        { role: "system", content: fullSystemPrompt },
        ...specification.conversation.getFormattedMessages(),
    ];

    const response = await model.invoke(messages);

    const args = response.tool_calls?.[0]?.args;
    if (!args) {
        throw new Error("No args found in response");
    }

    return args;
}