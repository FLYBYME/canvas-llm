import { z } from "zod";

const DEFAULT_CODE_PROMPT_RULES = `- Do NOT include triple backticks when generating code. The code should be in plain text.`;

const APP_CONTEXT = `
<app-context>
The name of the application is "Open Canvas". Open Canvas is a web application where users have a chat window and a canvas to display an artifact.
Artifacts can be any sort of writing content, emails, code, or other creative writing work. Think of artifacts as content, or writing you might find on you might find on a blog, Google doc, or other writing platform.
Users only have a single artifact per conversation, however they have the ability to go back and fourth between artifact edits/revisions.
If a user asks you to generate something completely different from the current artifact, you may do this, as the UI displaying the artifacts will be updated to show whatever they've requested.
Even if the user goes from a 'text' artifact to a 'code' artifact.
</app-context>
`;

export const UPDATE_ENTIRE_ARTIFACT_PROMPT = `You are an AI assistant, and the user has requested you make an update to an artifact you generated in the past.

Here is the current content of the artifact:
<artifact>
{artifactContent}
</artifact>

You also have the following reflections on style guidelines and general memories/facts about the user to use when generating your response.
<reflections>
{reflections}
</reflections>

Please update the artifact based on the user's request.

Follow these rules and guidelines:
<rules-guidelines>
- You should respond with the ENTIRE updated artifact, with no additional text before and after.
- Do not wrap it in any XML tags you see in this prompt.
- You should use proper markdown syntax when appropriate, as the text you generate will be rendered in markdown. UNLESS YOU ARE WRITING CODE.
- When you generate code, a markdown renderer is NOT used so if you respond with code in markdown syntax, or wrap the code in tipple backticks it will break the UI for the user.
- If generating code, it is imperative you never wrap it in triple backticks, or prefix/suffix it with plain text. Ensure you ONLY respond with the code.
${DEFAULT_CODE_PROMPT_RULES}
</rules-guidelines>

{updateMetaPrompt}

Ensure you ONLY reply with the rewritten artifact and NO other content.
`;

export const PROGRAMMING_LANGUAGES = [
  { language: "python", extension: "py" },
  { language: "javascript", extension: "js" },
  { language: "typescript", extension: "ts" },
  { language: "c", extension: "c" },
  { language: "c++", extension: "cpp" },
  { language: "java", extension: "java" },
  { language: "go", extension: "go" },
  { language: "rust", extension: "rs" },
  { language: "swift", extension: "swift" },
  { language: "kotlin", extension: "kt" },
  { language: "php", extension: "php" },
  { language: "ruby", extension: "rb" },
  { language: "sql", extension: "sql" },
  { language: "html", extension: "html" },
  { language: "css", extension: "css" },
  { language: "json", extension: "json" },
  { language: "xml", extension: "xml" },
  { language: "yaml", extension: "yaml" },
  { language: "markdown", extension: "md" },
  { language: "bash", extension: "sh" },
  { language: "shell", extension: "sh" },
  { language: "powershell", extension: "ps1" },
  { language: "c#", extension: "cs" },
  { language: "other", extension: "txt" },
];

export const ARTIFACT_TOOL_SCHEMA = z.object({
  type: z
    .enum(["code", "text"])
    .describe("The content type of the artifact generated."),
  language: z
    .enum(
      PROGRAMMING_LANGUAGES.map((lang) => lang.language)
    )
    .optional()
    .describe(
      "The language/programming language of the artifact generated.\n" +
      "If generating code, it should be one of the options, or 'other'.\n" +
      "If not generating code, the language should ALWAYS be 'other'."
    ),
  isValidReact: z
    .boolean()
    .optional()
    .describe(
      "Whether or not the generated code is valid React code. Only populate this field if generating code."
    ),
  artifact: z.string().describe("The content of the artifact to generate."),
  title: z
    .string()
    .describe(
      "A short title to give to the artifact. Should be less than 5 words."
    ),
});

export const FileTaskSchema = z.object({
  tasks: z.array(
    z.object({
      filename: z.string().describe("The name of the file being modified"),
      description: z.string().describe("A detailed description of the task"),
      type: z.enum([
        "modify",
        "delete",
        "rename",
        "refactor",
        "optimize",
        "add",
        "create",
      ]).describe("The type of operation to be performed"),
      details: z.array(
        z.string().describe("Additional details or instructions for the task")
      ),
      references: z.array(z.string()).describe("References to other filenames related to the task"),
    })
  ).describe("List of tasks to perform on the file"),
});

export const FileTaskListSchema = z.array(FileTaskSchema).describe(
  "A list of files with associated tasks"
);

export const TaskSchema = z.object({
  filename: z.string().describe("The name of the file being modified"),
  description: z.string().describe("A detailed description of the task"),
  type: z.enum([
    "modify",
    "delete",
    "rename",
    "refactor",
    "optimize",
    "add",
    "create",
  ]).describe("The type of operation to be performed"),
  details: z.array(
    z.string().describe("Additional details or instructions for the task")
  ),
  references: z.array(z.string()).describe("References to other filenames related to the task"),
});

export const OPTIONALLY_UPDATE_ARTIFACT_META_SCHEMA = z
  .object({
    type: z
      .enum(["text", "code"])
      .describe("The type of the artifact content."),
    title: z
      .string()
      .optional()
      .describe(
        "The new title to give the artifact. ONLY update this if the user is making a request which changes the subject/topic of the artifact."
      ),
    language: z
      .enum(
        PROGRAMMING_LANGUAGES.map((lang) => lang.language)
      )
      .describe(
        "The language of the code artifact. This should be populated with the programming language if the user is requesting code to be written, or 'other', in all other cases."
      ),
  })
  .describe("Update the artifact meta information, if necessary.");

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

export const SUGGESTED_QUESTIONS_TOOL_SCHEMA = z.object({
  questions: z.array(
    z.string().describe("A suggested question based on the user's query")
  ).describe("List of suggested questions"),
});

export const ReviewChangesSchema = z.object({
  pass: z.boolean().describe("Whether the changes are correct or not"),
  suggestions: z.array(z.string()).describe("Suggestions for improvement"),
  review: z.string().describe("The review of the changes"),
});

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
