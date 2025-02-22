import { model } from "../model.js";


import { generateArtifactTool } from "./artifact.js";

export const CONTEXT_DOCUMENT_SYSTEM_PROMPT = `
You are an AI assistant tasked with generating a **context document** from an artifact's source code. This document should summarize the artifact's purpose, structure, key components, and external dependencies.

### **Rules and Guidelines**
<rules-guidelines>
1. **Analyze the Purpose**: Clearly describe what the artifact does and its intended use.
2. **Identify Key Components**: Extract and summarize classes, functions, and significant variables.
3. **Capture External Dependencies**: List all imported modules, libraries, and external references.
4. **Explain Interactions**: Describe how components interact within the artifact and with external dependencies.
5. **Maintain Clarity and Structure**: Present the information in a structured format with headings and bullet points.
6. **Avoid Code Duplication**: Summarize logic concisely instead of copying full implementations.
7. **Follow the Example Format**: Use the format provided below for consistency.
</rules-guidelines>

Using the source code below, generate a **context document** that follows the rules and format outlined in the example.

ONLY respond with the language "markdown".
`;


export async function generateNewDocument(artifact) {
    const fullSystemPrompt = CONTEXT_DOCUMENT_SYSTEM_PROMPT.replace(
        "{artifact}",
        artifact.getFormattedContent()
    );

    const messages = [
        { role: "system", content: fullSystemPrompt },
        { role: "user", content: artifact.getFormattedContent() },
    ];

    const response = await model.run(messages);

    return response;
}