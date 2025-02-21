import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

// **Relation** refers to a relationship or association between two entities or objects in a system or application. It can be a direct connection, indirect relationship, or a combination of both.

export const RelationSchema = z.object({
    relations: z
        .array(
            z.object({
                entityA: z.string().describe("The first entity in the relationship."),
                entityB: z.string().describe("The second entity in the relationship."),
                relationship: z
                    .string()
                    .describe("A descriptive label defining the relationship between entityA and entityB."),
            })
        )
        .describe("The complete list of extracted relationships from the conversation and artifact."),
});



export const RELATION_SYSTEM_PROMPT = `You are an expert in extracting structured relationships from text. Your task is to analyze the provided conversation between a user and an AI assistant, along with an associated artifact they worked on together. Your goal is to extract meaningful relationships between entities.

Here is the current content of the artifact:
<artifact>
{artifactContent}
</artifact>

You also have the following reflections on style guidelines and general memories/facts about the user to use when generating your response.
<reflections>
{reflections}
</reflections>

The relationships you extract should be formatted as triples (entityA, entityB, relationship), where:
- **entityA** and **entityB** are key entities present in the conversation or artifact.
- **relationship** describes how entityA and entityB are connected.

### Guidelines for extracting relationships:
<system-guidelines>
- Focus on explicit and meaningful connections between entities.
- Avoid duplicating relationships; merge similar ones if necessary.
- Do not infer relationships unless there is clear evidence in the conversation or artifact.
- Ensure relationships are precise and clear to prevent misinterpretation.
- Keep the number of relationships concise but informative.
- Prioritize structured and factual relationships over assumptions.
</system-guidelines>

Your output must conform to the predefined **RelationSchema**.

Use the 'generate_relations' tool to generate the full list of relationships.`;

export const generateRelationsTool = {
    name: "generate_relations",
    description: "Extract relationships from the provided conversation and artifact.",
    schema: RelationSchema,
};


/**
 * Extracts structured relationships from a conversation and an associated artifact using an AI model.
 *
 * @param {Object} artifact - The artifact associated with the conversation, containing relevant context and documents.
 * @param {Object} conversation - The conversation between a user and an AI assistant, providing reflections and messages.
 * @returns {Array} A list of extracted relationships in the form of triples (entityA, entityB, relationship).
 * @throws {Error} Throws an error if no arguments are found in the model's response.
 */

export async function getRelationToContext(artifact, conversation) {
    const model = new ChatOpenAI({
        model: "gpt-4o-mini",
        temperature: 0,
    }).bindTools([generateRelationsTool], {
        tool_choice: "generate_relations",
    }).withConfig({ runName: "Relation" });

    const fullSystemPrompt = RELATION_SYSTEM_PROMPT.replace(
        "<artifactContent>",
        artifact.getFormattedContent()
    ).replace("<reflections>", conversation.getReflections());

    const contextDocuments = artifact.getContextDocuments();

    const messages = [
        { role: "system", content: fullSystemPrompt },
        ...contextDocuments,
        ...conversation.getFormattedMessages(),
    ];

    const response = await model.invoke(messages);

    const args = response.tool_calls?.[0]?.args;
    if (!args) {
        throw new Error("No args found in response");
    }

    return args.relations;
}