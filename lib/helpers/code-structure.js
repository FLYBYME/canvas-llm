import { model } from "../model.js";
import { z } from "zod";

export const GENERATE_CODE_STRUCTURE_PROMPT = `
You are an AI assistant that analyzes a given workspace and generates a comprehensive CodeStructure object.

### **Task:**  
Analyze the provided workspace and extract details about its **architecture, modules, dependencies, and key components**. Your goal is to construct a structured representation of the codebase.

### **Instructions:**  
1. **Identify the Architecture**  
   - Describe the overall structure of the codebase (e.g., monolithic, microservices, layered, modular).
   - Identify any frameworks, design patterns, or architectural principles used.

2. **Extract Modules**  
   - List all modules in the codebase, describing their responsibilities.  
   - Capture relationships between modules (e.g., which modules depend on or extend others).

3. **Identify Dependencies**  
   - Extract all external dependencies, including their versions and purposes.

4. **Analyze Key Components**  
   - Identify major components of the system and describe their roles.  
   - Capture interactions between components.


Follow these rules and guidelines:
<rules-guidelines>
- You should respond with the ENTIRE updated artifact, with no additional text before and after.
- Do not wrap it in any XML tags you see in this prompt.
- You should use proper markdown syntax when appropriate, as the text you generate will be rendered in markdown. UNLESS YOU ARE WRITING CODE.
- When you generate code, a markdown renderer is NOT used so if you respond with code in markdown syntax, or wrap the code in tipple backticks it will break the UI for the user.
- Do not generate any code in the response.
</rules-guidelines>
   
These are all the files in the workspace:
<files>
{files}
</files>

Ensure completeness and accuracy when analyzing the workspace. If details are missing, infer based on best practices in software development.
`;

export const ARTIFACT_PROMPT = `
<artifact>
File name: {fileName} 
Title: {title}
Type: {type}
Language: {language}
Description: {description}
{details}
<artifact>`;

export const codeStructureSchema = z.object({
    title: z.string().describe("The title or name of the code structure."),
    description: z.string().describe("A detailed description of the code structure."),
    architecture: z.string().describe("The high-level architecture of the code structure."),
    modules: z.array(z.object({
        name: z.string().describe("The name of the module."),
        description: z.string().describe("A detailed description of the module's responsibility and functionality."),
        relationships: z.array(z.string()).describe("A list of other modules that this module interacts with."),
    })).describe("An array of modules in the code structure."),
    dependencies: z.array(z.object({
        name: z.string().describe("The name of the dependency."),
        version: z.string().describe("The version of the dependency."),
        purpose: z.string().describe("A description of the purpose of the dependency within the codebase."),
    })).describe("An array of dependencies used in the code structure."),
    keyComponents: z.array(z.object({
        name: z.string().describe("The name of the key component."),
        role: z.string().describe("The role or purpose of the key component within the code structure."),
        interactions: z.array(z.string()).describe("A list of other key components that this key component interacts with."),
    }))
});

export const codeStructureTool = {
    name: "code_structure",
    description: "Analyze the workspace and generate a CodeStructure object.",
    schema: codeStructureSchema,
};

export const generateCodeStructure = async (workspace) => {
    const artifacts = workspace.getArtifacts();

    const files = artifacts.map(artifact => `${artifact.fileName}: ${artifact.title}`);

    const fullSystemPrompt = GENERATE_CODE_STRUCTURE_PROMPT
        .replace("{files}", files.join("\n"));

    const contextDocuments = await workspace.getContextDocuments();

    const messages = [
        { role: "system", content: fullSystemPrompt },
        ...contextDocuments,
    ];


    for (const artifact of artifacts) {
        const fullPrompt = ARTIFACT_PROMPT.replace(
            "{fileName}", artifact.fileName
        ).replace(
            "{title}", artifact.title
        ).replace(
            "{type}", artifact.type
        ).replace(
            "{language}", artifact.language
        ).replace(
            "{description}", artifact.description
        ).replace(
            "{details}", JSON.stringify({
                dependencies: artifact.dependencies,
                snippits: artifact.snippits
            })
        );
        // messages.push({
        //     role: "user",
        //     content: fullPrompt
        // });
    }

    return model.run(messages);
};