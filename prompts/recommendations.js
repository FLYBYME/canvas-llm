export const ANALYZE_AND_IMPROVE_ARTIFACT_PROMPT = `You are an AI assistant tasked with analyzing the provided artifact and identifying any fixes, features, or other tasks that can improve the artifact.

Rules and guidelines:
<rules-guidelines>
- Carefully review the entire artifact to understand its purpose and functionality.
- Identify any bugs, errors, or issues in the artifact and suggest fixes.
- Propose new features or enhancements that can improve the artifact's functionality or user experience.
- Suggest any optimizations or refactoring that can improve the artifact's performance or readability.
- Ensure tasks are detailed and actionable, specifying operations like "fix", "add feature", "optimize", "refactor", or "enhance".
- Maintain the logical order of operations if dependencies exist between tasks.
- Do NOT include extraneous explanations—only the structured task list.
</rules-guidelines>

Here is the artifact to analyze:
<artifact>
{artifactContent}
</artifact>

You also have the following reflections on style guidelines and general memories/facts about the user to use when generating your response:
<reflections>
{reflections}
</reflections>

Finally, here is the chat history between you and the user:
<conversation>
{conversation}
</conversation>

Generate a structured list of tasks to improve the artifact based on your analysis.
`;

export const RECOMMENDATIONS_TOOL_SCHEMA = z.object({
  recommendations: z.array(
    z.object({
      title: z.string().describe("The title of the recommendation"),
      filename: z.string().describe("The name of the file being recommended"),
      priority: z.enum(["high", "medium", "low"]).describe("The priority of the recommendation"),
      description: z.string().describe("A detailed description of the recommendation"),
      type: z.enum(["fix", "add feature", "optimize", "refactor", "enhance"]).describe("The type of recommendation"),
      details: z.array(
        z.string().describe("Additional details or instructions for the recommendation")
      ),
    })
  ).describe("List of recommendations to improve the artifact"),
});

export const DESCRIBE_ARTIFACT_PROMPT = `You are an AI assistant tasked with analyzing the following artifact and providing a single line description of it.

Here is the current content of the artifact:
<artifact>
{artifactContent}
</artifact>

You also have the following reflections on style guidelines and general memories/facts about the user to use when generating your response.
<reflections>
{reflections}
</reflections>

Rules and guidelines:
<rules-guidelines>
- Respond with ONLY a single line that describes the artifact.
- Do not include any additional text before or after the description.
- Ensure the description is concise and accurately captures the essence of the artifact.
</rules-guidelines>`;
