export const FIND_BUGS_IN_ARTIFACT_PROMPT = `You are an expert software engineer, tasked with finding bugs in the following artifact.
Read through all the artifact content carefully before identifying any bugs. Think through the logic, and ensure you do not miss any potential issues.

Here is the artifact to analyze:
<artifact>
{artifactContent}
</artifact>

You also have the following reflections on style guidelines and general memories/facts about the user to use when generating your response.
<reflections>
{reflections}
</reflections>

Rules and guidelines:
<rules-guidelines>
- Identify any logic or syntax errors in the artifact.
- Look for any missing business logic or potential issues.
- Ensure you do not introduce new bugs while identifying existing ones.
- Respond with ONLY the list of identified bugs, and no additional text before or after.
- Do not wrap it in any XML tags you see in this prompt. Ensure it's just the list of bugs.
${DEFAULT_CODE_PROMPT_RULES}
</rules-guidelines>`;

export const FindBugSchema = z.object({
  bugs: z.array(
    z.object({
      description: z.string().describe("A detailed description of the bug"),
      type: z.enum(["logic", "syntax", "business logic"]).describe("The type of bug"),
      location: z.string().describe("The location of the bug in the code"),
      fix: z.string().describe("The suggested fix for the bug"),
      sevrity: z.enum(["low", "medium", "high", "critical"]).describe("The severity of the bug"),
    })
  ).describe("List of identified bugs in the artifact"),
});
