const z = require("zod");

const { PROGRAMMING_LANGUAGES } = require('../lib/constants');

const Schema = z.object({
    workspaceName: z.string().describe("The name of the workspace."),
    files: z.array(
        z.object({
            filePath: z.string().describe("The relative path of the file."),
            title: z.string().describe("A brief description of the file's purpose or main function."),
            fileType: z.enum(PROGRAMMING_LANGUAGES.map(language => language.language)).describe("The programming language used in the file."),
            specification: z.string().describe("An object representing the file's specification."),
        })
    ).describe("An array representing the workspace's initial file structure."),
    dependencies: z.array(
        z.object({
            name: z.string().describe("The name or path of the dependency."),
            version: z.string().describe("The version of the dependency."),
        })
    ).describe("An array representing the workspace's dependencies."),
});

module.exports = {
    name: "GenerateInitialFileStructure",
    description: "Generate the initial file structure for a workspace.",
    schema: Schema,
    input: {
        rulesGuidelines: '{rulesGuidelines}'
    },
    systemPrompt: `You are provided with a request to generate the initial file structure for a workspace. The users may include a list of dependencies in their request.
Using this information, create a structured hierarchy that includes necessary directories and files based on best practices for the specified technology stack. If certain files require boilerplate content, include relevant starting content.

Follow these rules and guidelines:
<rules-guidelines>
{rulesGuidelines}
</rules-guidelines>

Be creative and imaginative when generating file structures and include all necessary details to ensure the initial file structure is well-structured and suitable for the specified technology stack.
`,
    options: {}
};