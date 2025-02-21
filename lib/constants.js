
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

export const APP_CONTEXT = `
<app-context>
The name of the application is "Open Canvas". Open Canvas is a web application where users have a chat window and a canvas to display an artifact.
Artifacts can be any sort of writing content, emails, code, or other creative writing work. Think of artifacts as content, or writing you might find on you might find on a blog, Google doc, or other writing platform.
Users only have a single artifact per conversation, however they have the ability to go back and fourth between artifact edits/revisions.
If a user asks you to generate something completely different from the current artifact, you may do this, as the UI displaying the artifacts will be updated to show whatever they've requested.
Even if the user goes from a 'text' artifact to a 'code' artifact.
</app-context>
`;