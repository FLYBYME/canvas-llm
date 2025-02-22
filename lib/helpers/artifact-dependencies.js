import internal from "stream";
import { model } from "../model.js";
import { z } from "zod";

export const GET_DEPENDENCY_ANALYSIS_PROMPT = `You are an AI assistant tasked with analyzing the dependencies and external references of an artifact.

Follow these rules and guidelines:
<rules-guidelines>
- Respond with a JSON object listing all dependencies referenced in the artifact.
- Only include dependencies that are explicitly used in the artifact.
- Do not include any dependencies that are not directly referenced in the artifact.
- If a dependency is referenced using a relative path (e.g., starting with "./" or "../"), mark it as an internal dependency.
</rules-guidelines>
`;




// Schema for individual dependencies
export const DependencySchema = z.object({
    name: z.string().describe("The name of the dependency."),
    path: z.string().describe("The path to the dependency."),
    purpose: z.string().describe("The purpose of the dependency in the artifact."),
    type: z.enum(["package", "library", "api", "module", "other"]).describe("The type of the dependency."),
    internal: z.boolean().describe("Whether the dependency is internal to the workspace."),
}).describe("Information about a dependency used in the artifact.");

// Updated schema for wrapping dependencies in an object
export const ArtifactDependenciesSchema = z.object({
    dependencies: z.array(DependencySchema).describe("List of dependencies used in the artifact.")
}).describe("An object containing the dependencies used in the artifact.");

export const ArtifactDependenciesTool = {
    name: "artifact_dependencies",
    description: "Analyze the dependencies of the artifact.",
    schema: ArtifactDependenciesSchema,
};

export const analyzeArtifactDependencies = async (artifact, conversation) => {


    const fullSystemPrompt = GET_DEPENDENCY_ANALYSIS_PROMPT.replace(
        "{artifact}",
        artifact.getFormattedContent(true)
    );

    const contextDocuments = await artifact.getContextDocuments();

    const messages = [
        { role: "system", content: fullSystemPrompt },
        ...contextDocuments,
        ...conversation.getFormattedMessages(),
        { role: "user", content: artifact.getFormattedContent() },
    ];


    const response = await model.run(messages, ArtifactDependenciesTool);

    return response;
};
