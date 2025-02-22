import { model } from "../model.js";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

// **Relation** refers to a relationship or association between two entities or objects in a system or application. It can be a direct connection, indirect relationship, or a combination of both.

export const RELATION_SYSTEM_PROMPT = `You are an expert in analyzing the relationship between source code artifacts and programming tasks. Your goal is to determine whether a given artifact is necessary for completing the specified task.

### **Input:**
1. **Programming Task** - A user-provided title and description.
2. **Source Code Artifact** - The artifact being analyzed.

Here is the artifact's content:
<artifact>
{artifactContent}
</artifact>

### **Guidelines for Evaluating Relationships:**
- **Direct Involvement:** The artifact is related **only if** it defines, modifies, or interacts with code necessary for the task.
- **Configuration vs. Implementation:** General configurations (e.g., environment variables, constants) are **not relevant** unless modifying them is required.
- **Dependency Awareness:** If the artifact provides dependencies (e.g., importing a module used in the task), it may be relevant.
- **Avoid Overgeneralization:** Do not assume relationships unless explicitly evident in the artifact.

### **Expected Output:**
\`\`\`json
{
  "isRelatedToTask": <true|false>,
  "related": [
    "Clear and concise reasoning about why (or why not) the artifact is relevant."
  ]
}
\`\`\`

Use the 'generate_relations' tool to extract structured relationships.`;



export const RelationSchema = z.object({
    isRelatedToTask: z.boolean().describe("Whether the entities are related to the task."),
    related: z.array(z.string()).describe("A list of relationships between entities."),

});
export const generateRelationsTool = {
    name: "generate_relations",
    description: "Extract relationships from the provided conversation and artifact.",
    schema: RelationSchema,
};


export const RELATION_PROMPT_GENERATOR = `You are an expert at structuring programming tasks into precise prompts for analyzing the relationship between source code artifacts and the task.

### **Task Context:**
- **Title:** {title}
- **Description:** {description}

### **Goal:**
Generate a clear and structured prompt that can be used with a system designed to evaluate whether a given source code artifact is necessary for completing the task.

### **Guidelines for Prompt Generation:**
- Clearly restate the task in a way that highlights what code changes or implementations are needed.
- Focus on specific programming elements like routes, services, middleware, or configuration updates.
- If the task involves modifying an existing system, clarify what needs to be changed.
- Avoid assumptions or vague statements—be precise about what the task requires.

### **Example Output Format:**
\`\`\`json
{
  "task": "Create a home route in an Express.js application.",
  "context": "The Express application needs a new GET route at '/' that responds with 'Welcome to the home page'. This route should be added to the main routing file and properly integrated with the existing middleware."
}
\`\`\`

Generate a structured task prompt following this format.`;

export const GenerateRelationPromptSchema = z.object({
    task: z.string().describe("The task description."),
    context: z.string().describe("The context of the task."),
});

export const generateRelationPromptTool = {
    name: "generate_relation_prompt",
    description: "Generate a structured prompt for analyzing the relationship between source code artifacts and a task.",
    schema: GenerateRelationPromptSchema,
};

/**
 * Extracts structured relationships from a conversation and an associated artifact using an AI model.
 *
 * @param {Object} artifact - The artifact associated with the conversation, containing relevant context and documents.
 * @param {Object} context - The context of the conversation, including the user's message and the AI assistant's response.
 * @param {string} context.title - The title of the conversation.
 * @param {string} context.description - The description of the conversation.
 * @returns {Array} A list of extracted relationships in the form of triples (entityA, entityB, relationship).
 * @throws {Error} Throws an error if no arguments are found in the model's response.
 */

export async function getRelationToContext(artifact, context) {
    const fullSystemPrompt = RELATION_SYSTEM_PROMPT.replace(
        "{artifactContent}",
        artifact.getFormattedContent()
    );

    const contextDocuments = await artifact.getContextDocuments();

    const prompt = await model.run(
        [
            { role: "system", content: RELATION_PROMPT_GENERATOR },
            {
                role: "user",
                content: `Title: ${context.title}\n\nDescription: ${context.description}`
            }
        ],
        generateRelationPromptTool
    );
    const userMessageContent = prompt.task + "\n\nContext: " + prompt.context;
    console.log(userMessageContent);

    const messages = [
        { role: "system", content: fullSystemPrompt },
        ...contextDocuments,
        {
            role: "user",
            content: userMessageContent
        }
    ];

    const response = await model.run(messages, generateRelationsTool);

    return response;
}