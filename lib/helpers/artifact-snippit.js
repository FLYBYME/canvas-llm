import { model } from "../model.js";
import { z } from "zod";

export const GET_SNIPPET_ANALYSIS_PROMPT = `You are an AI assistant tasked with analyzing a full code artifact and breaking it into meaningful code snippets.

## Your Responsibilities:
1. **Identify individual snippets** within the artifact (functions, methods, classes, variables, etc.).
2. **Determine the type** of each snippet (e.g., function, method, class, variable).
3. **Provide a description** explaining the purpose and functionality of each snippet.
4. **Identify start and end lines** for each snippet.
5. **Assess the status** of each snippet (e.g., draft, active, deprecated).
6. **Suggest improvements or highlight potential issues**, if applicable.

## Input Artifact:
<artifact
{artifact}
</artifact>

Analyze the artifact and extract distinct code snippets based on logical boundaries. Provide structured information for each snippet in the format expected by the system.`;



// Schema for Snippet details
export const SnippitSchema = z.object({
    code: z.string().describe("The code content of the snippet."),
    description: z.string().optional().describe("A description of the snippet and its purpose."),
    type: z.enum(["function", "class", "method", "variable", "other"]).describe("The type of the snippet."),
    status: z.enum(["draft", "active", "deprecated"]).optional().default("draft").describe("The status of the snippet."),
    startLine: z.number().describe("The starting line number of the snippet in the artifact."),
    endLine: z.number().describe("The ending line number of the snippet in the artifact.")
}).describe("Information about a code snippet in an artifact.");

export const ArtifactSnippitsSchema = z.object({
    snippits: z.array(SnippitSchema).describe("An array of code snippets in an artifact.")
});

export const ArtifactSnippitsTool = {
    name: "artifact_snippits",
    description: "Analyze the artifact and extract distinct code snippets based on logical boundaries. Provide structured information for each snippet in the format expected by the system.",
    schema: ArtifactSnippitsSchema,
};

export const analyzeArtifactSnippits = async (artifact, conversation) => {
    const fullSystemPrompt = GET_SNIPPET_ANALYSIS_PROMPT.replace(
        "{artifact}",
        artifact.getFormattedContent()
    );

    const contextDocuments = await artifact.getContextDocuments();

    const messages = [
        { role: "system", content: fullSystemPrompt },
        ...contextDocuments,
        ...conversation.getFormattedMessages(),
    ];

    const response = await model.run(messages, ArtifactSnippitsTool);

    return response;
};
