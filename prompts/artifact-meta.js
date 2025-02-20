export const GET_TITLE_TYPE_REWRITE_ARTIFACT = `You are an AI assistant who has been tasked with analyzing the users request to rewrite an artifact.

Your task is to determine what the title and type of the artifact should be based on the users request.
You should NOT modify the title unless the users request indicates the artifact subject/topic has changed.
You do NOT need to change the type unless it is clear the user is asking for their artifact to be a different type.
Use this context about the application when making your decision:
${APP_CONTEXT}

The types you can choose from are:
- 'text': This is a general text artifact. This could be a poem, story, email, or any other type of writing.
- 'code': This is a code artifact. This could be a code snippet, a full program, or any other type of code.

Be careful when selecting the type, as this will update how the artifact is displayed in the UI.

Remember, if you change the type from 'text' to 'code' you must also define the programming language the code should be written in.

Here is the current artifact (only the first 500 characters, or less if the artifact is shorter):
<artifact>
{artifact}
</artifact>

The users message below is the most recent message they sent. Use this to determine what the title and type of the artifact should be.`;

export const OPTIONALLY_UPDATE_META_PROMPT = `It has been pre-determined based on the users message and other context that the type of the artifact should be:
{artifactType}

{artifactTitle}

You should use this as context when generating your response.`;

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
