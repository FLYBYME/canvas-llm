import { model } from "../model.js";
import { z } from "zod";

import { DEFAULT_CODE_PROMPT_RULES } from "../constants.js";

export const FIND_BUGS_IN_ARTIFACT_PROMPT = `You are an expert software engineer, tasked with finding bugs in the following artifact.
Read through all the artifact content carefully before identifying any bugs. Think through the logic, and ensure you do not miss any potential issues.

Here is the artifact to analyze:
<artifact>
{artifactContent}
</artifact>

Rules and guidelines:
<rules-guidelines>
- Identify any logic or syntax errors in the artifact.
- Look for any missing business logic or potential issues.
- Ensure you do not introduce new bugs while identifying existing ones.
- Respond with ONLY the list of identified bugs, and no additional text before or after.
- Do not wrap it in any XML tags you see in this prompt. Ensure it's just the list of bugs.
${DEFAULT_CODE_PROMPT_RULES}
</rules-guidelines>

Include the severity of the bug (high, medium, low) in your response.`;

export const FindBugSchema = z.object({
    bugs: z.array(
        z.object({
            description: z.string().describe("A detailed description of the bug"),
            type: z.enum(["logic", "syntax", "business logic"]).describe("The type of bug"),
            location: z.string().describe("The location of the bug in the code"),
            fix: z.string().describe("The suggested fix for the bug"),
            severity: z.enum(["high", "medium", "low"]).describe("The severity of the bug").optional(false),
        })
    ).describe("List of identified bugs in the artifact"),
});

export const findBugsInArtifactTool = {
    name: "find_bugs",
    description: "Find bugs in the artifact.",
    schema: FindBugSchema,
};

export const findBugsInArtifact = async (artifact, conversation) => {
    const fullSystemPrompt = FIND_BUGS_IN_ARTIFACT_PROMPT.replace(
        "{artifactContent}",
        artifact.getFormattedContent()
    );

    const contextDocuments = await artifact.getContextDocuments();

    const messages = [
        { role: "system", content: fullSystemPrompt },
        ...contextDocuments,
        ...conversation.getFormattedMessages(),
    ];

    const response = await model.run(messages, findBugsInArtifactTool);

    return response;
};