const z = require("zod");

const Schema = z.object({
    rules: z.array(z.string()).describe("List of rules to follow when generating the initial file structure."),
    guidelines: z.array(z.string()).describe("List of guidelines to follow when generating the initial file structure.")
});

module.exports = {
    name: "GenerateRulesGuidelines",
    description: "Generate rules and guidelines for generating the initial file structure.",
    schema: Schema,
    input: {},
    systemPrompt: `You are provided with a request to generate rules and guidelines for generating the initial file structure for a workspace. The users may include a list of dependencies in their request.

Using this information, create rules and guidelines that describe how to generate a well-structured file hierarchy for the specified technology stack. These rules and guidelines should include:

Follow these rules.
"Follow best practices for the specified programming language and technology stack."
"Include a README.md file at the root of the workspace with an overview of the project."
"Create a .gitignore file with common patterns to exclude unnecessary files from version control."
"Organize source code into appropriate directories (e.g., src, lib, tests)."
"Include a package.json file for Node.js projects with the specified dependencies."
"For web projects, include an index.html file in the public directory."
"Ensure all files have appropriate boilerplate content based on their type and purpose."
"Include configuration files for build tools, linters, and formatters (e.g., webpack.config.js, .eslintrc.json, .prettierrc)."
"Document any special setup or installation instructions in the README.md file."
"Ensure the file structure is scalable and can accommodate future growth and changes."

Follow these guidelines:
"Be consistent with naming conventions and file organization."
"Use comments to explain the purpose of complex code sections."
"Keep the directory structure simple and intuitive."
"Group related files together to improve maintainability."
"Avoid including unnecessary files or directories."
"Ensure that all dependencies are properly listed and versioned."
"Regularly update the documentation to reflect any changes in the file structure."
"Consider the use of templates or scaffolding tools to automate the creation of common file structures."
"Review and refactor the file structure periodically to ensure it remains efficient and effective."
"Seek feedback from team members to improve the file structure and organization."`,
    options: {}
};