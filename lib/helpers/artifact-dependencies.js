import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

export const GET_DEPENDENCY_ANALYSIS_PROMPT = `You are an AI assistant tasked with analyzing the dependencies and external references of an artifact.

Follow these rules and guidelines:
<rules-guidelines>
1. **Identify and categorize dependencies** of the artifact (e.g., external libraries, packages, APIs, system modules, etc.).
2. **Determine the purpose** and functionality of each dependency within the artifact.
3. **Identify interactions** between the artifact and each dependency, including how they are used.
4. **Determine the type** of each dependency: 
   - "package" (npm-installed module)  
   - "library" (external utility used for logic)  
   - "api" (external service call)  
   - "system" (built-in Node.js modules like fs, path)  
   - "reference" (external classes, functions, or variables used in the artifact but not defined within it)  
   - "other" (anything that does not fit the above)
5. **Extract all external references**, including:
   - Imported modules (from npm, built-in Node.js, or local files).
   - Variables, functions, or objects passed into the artifact’s methods.
   - Dependencies injected via constructor or method parameters.
6. **Provide examples or code snippets** that demonstrate how each dependency is used.
</rules-guidelines>

Here is the full context of the artifact:
<artifact>
{artifact}
</artifact>

The user's message below is the most recent message they sent. Use this to determine the dependencies of the artifact.`;


// Schema for individual dependencies
export const DependencySchema = z.object({
    name: z.string().describe("The name of the dependency."),
    purpose: z.string().describe("The purpose of the dependency in the artifact."),
    type: z.enum(["package", "library", "api", "reference", "other"]).describe("The type of the dependency."),
    snippits: z.array(z.string()).optional().describe("Code snippets or examples related to the dependency.")
}).describe("Information about a dependency used in the artifact.");

// Updated schema for wrapping dependencies in an object
export const ArtifactDependenciesSchema = z.object({
    dependencies: z.array(DependencySchema).describe("List of dependencies used in the artifact.")
}).describe("An object containing the dependencies used in the artifact.");


export const analyzeArtifactDependencies = async (artifact, conversation) => {
    const model = new ChatOpenAI({
        model: "gpt-4o-mini",
        temperature: 0,
    }).withStructuredOutput(
        ArtifactDependenciesSchema,
        {
            name: "ArtifactDependenciesSchema",
        }
    ).withConfig({ runName: "ArtifactDependencies" });

    const fullSystemPrompt = GET_DEPENDENCY_ANALYSIS_PROMPT.replace(
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
