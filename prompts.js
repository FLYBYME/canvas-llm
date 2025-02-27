
const z = require("zod");
const { zodToJsonSchema } = require("zod-to-json-schema");
const PROGRAMMING_LANGUAGES = require("./lib/programming-languages.js");

const prompts = [
    /**
     * Generate updated artifact
     */
    {
        name: "GenerateUpdatedArtifact",
        description: "Generate an updated artifact.",
        schema: z.object({
            type: z
                .enum(["code", "text", "documentation"])
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
            fileName: z
                .string()
                .describe(
                    "The file name of the artifact to generate. Should be less than 5 words."
                ),
            filePath: z
                .string()
                .describe(
                    "The file path of the artifact to generate. Should be less than 5 words."
                )
        }),
        input: {
            content: "{content}",
        },
        systemPrompt: `You are an AI assistant, and the user has requested you make an update to an artifact you generated in the past.

Here is the current content of the artifact:
<artifact>
{artifact}
</artifact>

Please update the artifact based on the user's request.

Follow these rules and guidelines:
<rules-guidelines>
- You should respond with the ENTIRE updated artifact, with no additional text before and after.
- Do not wrap it in any XML tags you see in this prompt.
- You should use proper markdown syntax when appropriate, as the text you generate will be rendered in markdown. UNLESS YOU ARE WRITING CODE.
- When you generate code, a markdown renderer is NOT used so if you respond with code in markdown syntax, or wrap the code in tipple backticks it will break the UI for the user.
- If generating code, it is imperative you never wrap it in triple backticks, or prefix/suffix it with plain text. Ensure you ONLY respond with the code.
</rules-guidelines>

Ensure you ONLY reply with the rewritten artifact and NO other content.`,
        options: {

        }
    },
    /**
     * Generate new artifact
     */
    {
        name: "GenerateNewArtifact",
        description: "Generate a new artifact.",
        schema: z.object({
            type: z
                .enum(["code", "text", "documentation"])
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
            fileName: z
                .string()
                .describe(
                    "A file name to give to the artifact."
                ),
        }),
        input: {},
        systemPrompt: `You are an AI assistant tasked with generating a new artifact based on the users request.
Ensure you use markdown syntax when appropriate, as the text you generate will be rendered in markdown.
  
Use the full chat history as context when generating the artifact.

Follow these rules and guidelines:
<rules-guidelines>
- Do not wrap it in any XML tags you see in this prompt.
- If writing code, do not add inline comments unless the user has specifically requested them. This is very important as we don't want to clutter the code.
- Make sure you fulfill ALL aspects of a user's request. For example, if they ask for an output involving an LLM, prefer examples using OpenAI models with LangChain agents.
</rules-guidelines>

The users message below is the most recent message they sent. Use this to determine what the title and type of the artifact should be.`,
        options: {}
    },
    /**
     * File Summary
     */
    {
        name: "FileSummary",
        description: "Summarize files.",
        schema: z.object({
            fileName: z.string().describe("The name of the file."),
            extractedSummarie: z.string().describe("The extracted summary of the files."),
            keyDetails: z.array(z.string()).describe("List of key details extracted from the files."),
            fileReferences: z.array(z.string()).describe("List of file references that are used in the file."),
            documentation: z.string().describe("Documentation in markdown format."),
        }),
        input: {
            fileName: '{fileName}',
            filePath: '{filePath}',
            fileType: '{fileType}',
            language: '{language}',
        },
        systemPrompt: `Your task is to summarize the content of a file.

The file name is "{fileName}".
The file path is "{filePath}".
The file type is "{fileType}".
The file language is "{language}".

Only include context that is provided by the file content. Do not include context from other files.`,
        options: {}
    },
    /**
     * Identify Relevant Files
     */
    {
        name: "IdentifyRelevantFiles",
        description: "Identify relevant files.",
        schema: z.object({
            files: z.array(z.string()).describe("List of files relevant to the question."),
        }),
        input: {
            question: '{question}',
        },
        systemPrompt: `You have access to a workspace with multiple files. The user’s question is: "{question}". Based on filenames and metadata, list the most relevant files.`,
        options: {}
    },
    /**
     * Select Relevant Files
     */
    {
        name: "RelevantFiles",
        description: "Select relevant files.",
        schema: z.object({
            files: z.array(z.string()).describe("List of files relevant to the question."),
            recomendedChanges: z.array(z.object({
                fileName: z.string().describe("The name of the file."),
                modifactionType: z.enum(["create", "modify", "delete", "no-action"]).describe("The type of modification to be applied to the file."),
                details: z.string().describe("Any additional instructions or context for the modification."),
            })).describe("List of recommended changes based on the key details."),
        }),
        input: {
            question: '{question}',
        },
        systemPrompt: `You have access to a workspace with multiple files. The user’s question is: "{question}". Based on filenames and metadata, list the most relevant files.`,
        options: {}
    },
    /**
     * Artifact Dependencies
     */
    {
        name: "ArtifactDependencies",
        description: "Analyze the dependencies of the artifact.",
        schema: z.object({
            name: z.string().describe("The name of the dependency."),
            path: z.string().describe("The path to the dependency."),
            purpose: z.string().describe("The purpose of the dependency in the artifact."),
            type: z.enum(["package", "library", "api", "module", "other"]).describe("The type of the dependency."),
            internal: z.boolean().describe("Whether the dependency is internal to the workspace."),
            external: z.boolean().describe("Whether the dependency is external to the workspace."),
        }),
        input: {},
        systemPrompt: `You are an AI assistant tasked with analyzing the dependencies and external references of an artifact.

Follow these rules and guidelines:
<rules-guidelines>
- Respond with a JSON object listing all dependencies referenced in the artifact.
- Only include dependencies that are explicitly used in the artifact.
- Do not include any dependencies that are not directly referenced in the artifact.
- If a dependency is referenced using a relative path (e.g., starting with "./" or "../"), mark it as an internal dependency.
</rules-guidelines>`,
        options: {}
    },
    /**
     * Artifact Meta
     */
    {
        name: "ArtifactMeta",
        description: "Analyze the meta data of the artifact.",
        schema: z.object({
            type: z.enum(["text", "code", "documentation", "test"]).describe("The type of the artifact content."),
            title: z.string().describe("The new title to give the artifact."),
            language: z.enum(PROGRAMMING_LANGUAGES.map((lang) => lang.language)).describe("The language of the code artifact."),
            description: z.string().describe("The new description to give the artifact."),
        }),
        input: {},
        systemPrompt: `You are an AI assistant tasked with analyzing the meta data of an artifact.

Follow these rules and guidelines:
<rules-guidelines>
- Provide a descriptive title for the artifact.
- Provide a clear and concise description of the artifact.
- Provide a type of the artifact (e.g., code, documentation, test).
- Provide a language of the code artifact (e.g., javascript, python, java, c++, c#).
</rules-guidelines>`,
        options: {}
    },
    {
        name: "ArtifactSnippits",
        description: "Analyze the meta data of the artifact.",
        schema: z.object({
            snippits: z.array(z.object({
                code: z.string().describe("The code content of the snippet."),
                description: z.string().optional().describe("A description of the snippet and its purpose."),
                type: z.enum(["function", "class", "method", "variable", "other"]).describe("The type of the snippet."),
                status: z.enum(["draft", "active", "deprecated"]).optional().describe("The status of the snippet."),
                startLine: z.number().describe("The starting line number of the snippet in the artifact."),
                endLine: z.number().describe("The ending line number of the snippet in the artifact.")
            })).describe("An array of code snippets in an artifact.")
        }),
        input: {},
        systemPrompt: `You are an AI assistant tasked with analyzing the meta data of an artifact.

Follow these rules and guidelines:
<rules-guidelines>
- Respond with a JSON object listing all dependencies referenced in the artifact.
- Only include dependencies that are explicitly used in the artifact.
- Do not include any dependencies that are not directly referenced in the artifact.
- If a dependency is referenced using a relative path (e.g., starting with "./" or "../"), mark it as an internal dependency.
</rules-guidelines>`,
        options: {}
    },
    {
        name: "WorkspaceCodeStructure",
        description:
            "Analyze the code structure and dependencies of a workspace, capturing detailed file summaries, key details, and interdependencies.",
        schema: z.object({
            modules: z.array(
                z.object({
                    moduleName: z.string().describe("Name of the module or directory. For files in the root, use 'root'."),
                    files: z.array(
                        z.object({
                            filePath: z.string().describe("The file's relative path within the workspace (e.g., src/users/controller/index.js)."),
                            title: z.string().optional().describe("A brief description of the file's purpose or main function, if available."),
                            summary: z.object({
                                fileName: z.string().describe("The name of the file."),
                                extractedSummary: z.string().describe("A concise summary of the file's content and purpose."),
                                keyDetails: z.array(z.string()).describe("Key details extracted from the file (e.g., functions, middleware, model interactions)."),
                                potentialNextSteps: z.array(z.string()).describe("Suggested improvements or next steps for the file."),
                                documentation: z.string().describe("Inline documentation or comments present in the file."),
                                fileReferences: z.array(z.string()).describe("List of files or artifacts referenced within this file."),
                                dependencies: z.array(
                                    z.object({
                                        dependencyName: z.string().describe("The name or path of the dependency."),
                                        isInternal: z.boolean().describe("True if the dependency is internal (referenced using a relative path), false otherwise.")
                                    })
                                ).describe("List of explicit dependencies referenced in the file.")
                            }).describe("Detailed summary of the file's content and context.")
                        })
                    ).describe("An array of file artifacts within the module.")
                })
            ).describe("Array of modules representing the overall workspace structure."),
            dependencies: z.array(
                z.object({
                    dependencyName: z.string().describe("The name or path of the dependency."),
                    isInternal: z.boolean().describe("True if the dependency is internal (referenced using a relative path), false otherwise.")
                })
            ).describe("List of explicit dependencies referenced in the file."),
            title: z.string().describe("A concise summary of the system's current behavior."),
            description: z.string().describe("A detailed summary of the system's current behavior."),
            questions: z.array(z.string()).describe("List of questions or tasks that would be asked about the system's current behavior.")
        }),
        input: {},
        systemPrompt: `You are an AI assistant tasked with analyzing the code structure and dependencies of a workspace.

For each provided file artifact, extract and present the following:
- The file's relative path and the module (or folder) it belongs to.
- A brief title or function description (if available).
- A detailed summary including:
    - fileName
    - extractedSummary (a concise summary of its content)
    - keyDetails (important features or operations)
    - potentialNextSteps (suggestions for improvement)
    - documentation (inline documentation/comments)
    - fileReferences (other files referenced within this file)
- A list of dependencies explicitly referenced in the file. Mark any dependency that uses a relative path (e.g., "./" or "../") as internal.

Return your output as a JSON object that follows the defined schema.`,
        options: {}
    },

    {
        name: "GenerateCurrentBehavior",
        description: "Generate the current behavior object for a specification.",
        schema: z.object({
            summary: z.string().describe("A concise summary of the system's current behavior."),
            details: z.string().describe("A detailed explanation of the system's current behavior, including context and relevant technical details.")
        }),
        input: {},
        systemPrompt: `You are an AI assistant tasked with generating the "currentBehavior" section of a specification.

Focus on the system's existing functionality and state. Provide a short summary followed by a detailed explanation that captures all necessary context and technical details.

Use any relevant context from the user's request and chat history to inform your output.`,
        options: {}
    },
    {

        name: "GenerateInitialFileStructure",
        description: "Generate an initial workspace file structure based on the user's request.",
        schema: z.object({
            workspaceName: z.string().describe("The name of the workspace."),
            files: z.array(
                z.object({
                    filePath: z.string().describe("The relative path of the file."),
                    title: z.string().describe("A brief description of the file's purpose or main function."),
                    fileType: z.enum(PROGRAMMING_LANGUAGES.map(language => language.language)).describe("The programming language used in the file."),
                    specification: z.object({
                        dependencies: z.array(z.string()).describe("List of dependencies required by the file."),
                        keyDetails: z.array(z.string()).describe("Key details extracted from the file (e.g., functions, middleware, model interactions)."),
                        exportedFunctions: z.array(z.object({
                            name: z.string().describe("The name of the exported function."),
                            arguments: z.array(z.string()).describe("List of arguments expected by the function."),
                            returns: z.string().describe("The expected return value of the function.")
                        })).describe("List of functions or methods exported by the file."),
                    }).describe("An object representing the file's specification.")
                })
            ).describe("An array representing the workspace's initial file structure."),
            dependencies: z.array(
                z.object({
                    name: z.string().describe("The name or path of the dependency."),
                    version: z.string().describe("The version of the dependency."),
                })
            )
        }),
        input: {},
        systemPrompt: `You are provided with a request to generate the initial file structure for a workspace. The request includes details such as the project's purpose, preferred technologies, and key components.

Using this information, create a structured hierarchy that includes necessary directories and files based on best practices for the specified technology stack. If certain files require boilerplate content, include relevant starting content.`,
        options: {}
    },
    {
        name: "GenerateProposedChanges",
        description: "Generate the proposed changes object for a specification.",
        schema: z.object({
            fileName: z.string().describe("The target file for the proposed changes."),
            changes: z
                .array(
                    z.object({
                        line: z.number().describe("The line number where the change is recommended."),
                        oldCode: z.string().optional().describe("The existing code segment (optional, if context is needed)."),
                        newCode: z.string().describe("The new code segment that is recommended."),
                        justification: z.string().describe("A rationale explaining why this change is necessary.")
                    })
                )
                .describe("A list of recommended changes for the file."),
            context: z.string().optional().describe("Any additional context regarding the file or its intended improvements.")
        }),
        input: {},
        systemPrompt: `You are provided with the output from WorkspaceCodeStructure, which includes a comprehensive analysis of the workspace's modules and file artifacts. Each file artifact contains details such as its file summary, key details, potential next steps, inline documentation, file references, and dependencies.

Using this information, propose recommended changes that improve code quality, maintainability, and performance. For each file artifact from WorkspaceCodeStructure, please provide:
- fileName: The file's relative path (from the WorkspaceCodeStructure output).
- changes: An array of change objects where each change includes:
    - line: The line number where the change should be applied (if applicable).
    - oldCode: The current code segment (if available for context).
    - newCode: The new code segment you recommend.
    - justification: A clear rationale explaining why this change is beneficial.
- context (optional): Any additional details from the WorkspaceCodeStructure analysis that might influence your recommendations.

Return your output as a JSON object conforming to the GenerateProposedChanges schema.`,
        options: {}
    },
    {
        name: "GenerateImpactAnalysis",
        description: "Generate the impact analysis object for a specification.",
        schema: z.object({
            summary: z.string().describe("A concise summary of the potential impacts."),
            details: z.string().describe("A detailed explanation of how the proposed changes might affect the system, including potential side effects and interactions with other components."),
            dependencies: z.array(z.string()).optional().describe("A list of components or dependencies that may be affected by the changes.")
        }),
        input: {},
        systemPrompt: `You are an AI assistant tasked with generating the "impactAnalysis" section of a specification.

Provide a clear summary of the potential impacts of the proposed changes, followed by a detailed analysis covering dependencies, side effects, and any interactions with other system components.

Utilize any relevant context from the user's request and conversation history to guide your analysis.`,
        options: {}
    },
    {
        name: "GenerateSuccessCriteria",
        description: "Generate the success criteria object for a specification.",
        schema: z.object({
            criteria: z.array(z.string()).describe("An array of clear, measurable criteria that define the success of the changes."),
            notes: z.string().optional().describe("Additional notes or context to further explain the success criteria.")
        }),
        input: {},
        systemPrompt: `You are an AI assistant tasked with generating the "successCriteria" section of a specification.

List clear and measurable criteria that determine when the task or changes have been successfully implemented.
Include any additional notes necessary to clarify or support the criteria.

Draw on the user's request and conversation history for relevant context.`,
        options: {}
    },
    {
        name: "GenerateWorkspaceCodeStyleGuide",
        description: "Generate a concise and detailed workspace code style guide for consistent code generation.",
        input: {},
        systemPrompt: `You are an AI assistant tasked with generating a workspace code style guide to ensure consistent and high-quality code generation. Your guide will be passed to another AI model that generates new code, so it must be structured, precise, and unambiguous. Based on the user's project specification, provide a detailed guide covering:

- **Naming Conventions:** Standardized naming for files, variables, functions, components, and services.
- **Formatting Standards:** Rules for indentation, line breaks, spacing, and preferred syntax styles.
- **Framework Best Practices:** Guidelines specific to AngularJS and Bootstrap v3, including modular architecture, reusable components, and efficient DOM manipulation.

    Ensure the guide is concise but complete, leaving no room for ambiguity. Where relevant, provide examples to illustrate key principles.`,
        options: {
            plainText: true
        }
    }
];


const additionalPrompts = [
    /**
     * Code Quality Analysis
     */
    {
        name: "CodeQualityAnalysis",
        description: "Analyze the quality of the given code.",
        schema: z.object({
            issues: z.array(z.object({
                type: z.string().describe("Type of issue detected in the code."),
                severity: z.enum(["low", "medium", "high"]).describe("Severity level of the issue."),
                description: z.string().describe("A brief description of the issue."),
                suggestion: z.string().describe("Suggested improvement for the issue."),
            })).describe("List of detected issues and their descriptions."),
        }),
        input: {
            code: "{code}",
            language: "{language}",
        },
        systemPrompt: `You are an AI assistant analyzing the quality of a given code snippet.

Analyze the following code and provide a list of issues, including:
- Type of issue
- Severity level
- Description
- Suggested improvements

Code:
\`\`\`
{code}
\`\`\`
Language: {language}`,
        options: {}
    },
    {
        name: "CodeReviewAnalysis",
        description: "Review the given code diff and provide feedback on changes.",
        schema: z.object({
            comments: z.array(z.object({
                line: z.number().describe("Line number in the diff where the comment applies."),
                type: z.enum(["style", "bug", "performance", "security", "maintainability"]).describe("Category of the issue found."),
                severity: z.enum(["low", "medium", "high"]).describe("Severity level of the issue."),
                description: z.string().describe("Explanation of the issue found."),
                suggestion: z.string().describe("Recommended action to improve the code."),
            })).describe("List of comments on the diff with details."),
            review: z.string().describe("Detailed review of the code changes."),
            passed: z.boolean().describe("Whether the code diff passes the review."),
        }),
        input: {
            code: "{code}",
            language: "{language}",
        },
        systemPrompt: `You are an AI assistant reviewing a code diff for potential issues.

Analyze the following code diff and provide feedback on:
- Line number of the issue
- Type of issue (style, bug, performance, security, maintainability)
- Severity (low, medium, high)
- Description of the problem
- Suggested improvement
- Be exstremely critical in your analysis and provide a detailed review of the code changes.
- If the review does not pass, explain why.

This is the updated code:
<artifact>
{code}
</artifact>

Language: {language}`,
        options: {}
    },    
    /**
     * Function Documentation
     */
    {
        name: "FunctionDocumentation",
        description: "Generate documentation for functions in a given code snippet.",
        schema: z.object({
            functions: z.array(z.object({
                name: z.string().describe("Function name."),
                parameters: z.array(z.object({
                    name: z.string().describe("Parameter name."),
                    type: z.string().describe("Parameter type."),
                    description: z.string().describe("Parameter description."),
                })).describe("List of function parameters."),
                returnType: z.string().describe("Return type of the function."),
                description: z.string().describe("Function description."),
            })).describe("List of functions and their details."),
        }),
        input: {
            code: "{code}",
            language: "{language}",
        },
        systemPrompt: `You are an AI assistant that generates function documentation.

Analyze the following code and extract details for each function, including:
- Function name
- Parameters (name, type, description)
- Return type
- Description

Code:
\`\`\`
{code}
\`\`\`
Language: {language}`,
        options: {}
    },
    /**
     * Test Case Generator
     */
    {
        name: "TestCaseGenerator",
        description: "Generate test cases for a given function or code snippet.",
        schema: z.object({
            testCases: z.array(z.object({
                input: z.string().describe("Example input for the function."),
                expectedOutput: z.string().describe("Expected output from the function."),
                description: z.string().describe("Description of the test case."),
            })).describe("List of generated test cases."),
        }),
        input: {
            code: "{code}",
            language: "{language}",
            functionName: "{functionName}",
        },
        systemPrompt: `You are an AI assistant that generates test cases for a given function.

Analyze the following function and generate appropriate test cases.

Language: {language}

Generate a variety of test cases covering different edge cases and scenarios.`,
        options: {}
    },
    /**
 * Extract Testable Functions
 */
    {
        name: "ExtractTestableFunctions",
        description: "Extract test-caseable functions and methods from a given source file.",
        schema: z.object({
            functions: z.array(z.object({
                name: z.string().describe("The name of the function or method."),
                signature: z.string().describe("The signature or declaration of the function or method."),
                description: z.string().optional().describe("A brief description of the function/method, if available from comments or docstrings."),
            })).describe("List of extracted testable functions and methods.")
        }),
        input: {
            sourceCode: "{code}",
            language: "{language}"
        },
        systemPrompt: `You are an AI assistant that extracts testable functions and methods from a source file.

Analyze the provided source code and identify functions and methods that are suitable for testing. For each function or method, extract the following information:
- Name: The function or method name.
- Signature: The complete signature or declaration.
- Description: A brief description of what the function or method does, if available (e.g., from comments or docstrings).

Language: {language}.`,
        options: {}
    }
];



const modulePrompts = [
    /**
     * Module Specification
     *
     * Generate a detailed specification for a code module including its purpose, API functions,
     * dependencies, and a high-level architecture overview.
     */
    {
        name: "ModuleSpecification",
        description: "Generate a detailed specification for a code module.",
        schema: z.object({
            moduleName: z.string().describe("The name of the module."),
            purpose: z.string().describe("A brief description of the module's purpose."),
            api: z.array(z.object({
                endpoint: z.string().describe("API endpoint or function name."),
                method: z.string().describe("HTTP method (if applicable) or function type."),
                description: z.string().describe("A description of what the endpoint/function does."),
                parameters: z.array(z.object({
                    name: z.string().describe("Parameter name."),
                    type: z.string().describe("Data type of the parameter."),
                    description: z.string().describe("Description of the parameter.")
                })).describe("List of parameters for the endpoint/function.")
            })).describe("List of APIs or functions provided by the module."),
            dependencies: z.array(z.object({
                name: z.string().describe("Name of the dependency."),
                version: z.string().describe("Version of the dependency."),
                type: z.enum(["internal", "external"]).describe("Whether the dependency is internal or external.")
            })).describe("List of dependencies required by the module."),
            architecture: z.string().describe("A high-level description of the module architecture, including integration points and data flow.")
        }),
        input: {
            moduleCode: '{moduleCode}',
            moduleName: '{moduleName}'
        },
        systemPrompt: `You are an AI assistant tasked with generating a detailed specification for a code module.

Module Name: {moduleName}

Analyze the provided module code below and produce a detailed specification that includes:
- Module name and purpose
- API functions or endpoints with descriptions and parameters
- Dependencies with version and type (internal/external)
- A high-level overview of the module architecture

Module Code:
\"\"\"{moduleCode}\"\"\"`,
        options: {}
    },
    /**
     * Module Interface Specification
     *
     * Generate detailed interface definitions for a code module by extracting interfaces,
     * methods, and their associated details.
     */
    {
        name: "ModuleInterfaceSpecification",
        description: "Generate the interface specifications for a code module.",
        schema: z.object({
            moduleName: z.string().describe("The name of the module."),
            interfaces: z.array(z.object({
                interfaceName: z.string().describe("The name of the interface."),
                methods: z.array(z.object({
                    methodName: z.string().describe("Name of the method."),
                    parameters: z.array(z.object({
                        name: z.string().describe("Parameter name."),
                        type: z.string().describe("Type of the parameter."),
                        description: z.string().describe("Parameter description.")
                    })).describe("Parameters for the method."),
                    returnType: z.string().describe("Return type of the method."),
                    description: z.string().describe("Method description and purpose.")
                })).describe("List of methods in the interface.")
            })).describe("List of interfaces for the module.")
        }),
        input: {
            moduleCode: '{moduleCode}',
            moduleName: '{moduleName}'
        },
        systemPrompt: `You are an AI assistant that extracts and generates interface specifications from a given code module.

Module Name: {moduleName}

Analyze the provided module code and generate detailed interface specifications including:
- Interface names
- Methods with their parameters, return types, and descriptions

Module Code:
\"\"\"{moduleCode}\"\"\"`,
        options: {}
    },
    /**
     * Module Dependency Map
     *
     * Analyze the provided module code to generate a dependency map. This prompt identifies both
     * internal and external dependencies along with their purpose.
     */
    {
        name: "ModuleDependencyMap",
        description: "Generate a dependency map for a code module.",
        schema: z.object({
            moduleName: z.string().describe("The name of the module."),
            dependencyMap: z.array(z.object({
                dependencyName: z.string().describe("Name of the dependency."),
                path: z.string().describe("Path to the dependency."),
                type: z.enum(["internal", "external"]).describe("Type of dependency."),
                purpose: z.string().describe("The purpose of the dependency within the module.")
            })).describe("List of dependencies with their details.")
        }),
        input: {
            moduleCode: '{moduleCode}',
            moduleName: '{moduleName}'
        },
        systemPrompt: `You are an AI assistant tasked with generating a dependency map for a code module.

Module Name: {moduleName}

Analyze the provided module code and generate a detailed dependency map. For each dependency, provide:
- Dependency name
- Path (if available)
- Type (internal or external)
- Purpose within the module

Module Code:
\"\"\"{moduleCode}\"\"\"`,
        options: {}
    }
];


const VariableSchema = () => z.object({
    name: z.string().describe("The name of the variable."),
    type: z.string().describe("The data type of the variable."),
    value: z.string().optional().describe("The initial value of the variable, if defined."),
    scope: z.enum(["global", "local", "module"]).describe("The scope of the variable.")
});

const FunctionSchema = () => z.object({
    name: z.string().describe("The function name."),
    arguments: z.array(
        z.object({
            name: z.string().describe("The argument name."),
            type: z.string().describe("The argument data type.")
        })
    ).describe("The list of arguments accepted by the function."),
    returns: z.string().describe("The return type of the function."),
    isAsync: z.boolean().describe("Indicates if the function is asynchronous."),
    isArrow: z.boolean().describe("Indicates if the function is an arrow function."),
    isExported: z.boolean().describe("Indicates if the function is exported from the module.")
});



const ClassSchema = z.object({
    name: z.string().describe("The class name."),
    extends: z.string().optional().describe("The parent class if the class extends another."),
    methods: z.array(FunctionSchema()).describe("The methods defined in the class."),
    properties: z.array(VariableSchema()).describe("The properties defined in the class."),
    isExported: z.boolean().describe("Indicates if the class is exported from the module.")
});

const ImportSchema = z.object({
    module: z.string().describe("The module being imported."),
    imports: z.array(z.string()).describe("The specific items imported from the module."),
    isDefault: z.boolean().describe("Indicates if the import is a default import.")
});

const ExportSchema = z.object({
    exports: z.array(z.string()).describe("The items exported from this module."),
    isDefault: z.boolean().describe("Indicates if this is a default export.")
});

const JavaScriptFileSchema = z.object({
    fileName: z.string().describe("The relative path of the file."),
    title: z.string().describe("A human-readable title for the file."),
    specification: z.object({
        dependencies: z.array(z.string()).describe("A list of external dependencies required by the file."),
        imports: z.array(ImportSchema).describe("A list of modules imported in this file."),
        exports: z.array(ExportSchema).describe("A list of exported items from this file."),
        variables: z.array(VariableSchema()).describe("A list of variables declared in this file."),
        functions: z.array(FunctionSchema()).describe("A list of functions defined in this file."),
        classes: z.array(ClassSchema).describe("A list of classes defined in this file."),
        keyDetails: z.array(z.string()).describe("Important details about the file’s structure and purpose.")
    }).describe("The structured specification of the JavaScript file.")
});

modulePrompts.push({
    name: "JavaScriptFileSpecification",
    description: "Generate a structured specification for a JavaScript file.",
    schema: JavaScriptFileSchema,
    input: {

    },
    systemPrompt: `You are an AI assistant tasked with generating a structured specification for a JavaScript file.`,
    options: {}
});


const FileStructure = z.object({
    filePath: z.string().describe("The relative path of the file."),
    title: z.string().describe("A brief description of the file's purpose or main function."),
    fileType: z.enum(PROGRAMMING_LANGUAGES.map(language => language.language)).describe("The programming language used in the file."),
    specification: z.object({
        dependencies: z.array(z.string()).describe("List of dependencies required by the file."),
        keyDetails: z.array(z.string()).describe("Key details extracted from the file (e.g., functions, middleware, model interactions)."),
        exportedFunctions: z.array(z.object({
            name: z.string().describe("The name of the exported function."),
            arguments: z.array(z.string()).describe("List of arguments expected by the function."),
            returns: z.string().describe("The expected return value of the function.")
        })).describe("List of functions or methods exported by the file."),
    }).describe("An object representing the file's specification.")
});

modulePrompts.push({
    name: "FileStructure",
    description: "Generate a structured specification for a JavaScript file.",
    schema: FileStructure,
    input: {

    },
    systemPrompt: `You are an AI assistant tasked with generating a structured specification for a JavaScript file.`,
    options: {}
});

const fullPrompts = [
    ...prompts,
    ...additionalPrompts,
    ...modulePrompts,
    require('./prompts/angularjs-controller.js'),
    require('./prompts/angularjs-service.js'),
];
// loop through the properties and delete any keys starting with '$'
// Deep walk
const remove$ = (obj) => {
    if (typeof obj === 'object' && obj !== null) {
        for (const key in obj) {
            if (key.startsWith('$')) {
                delete obj[key];
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                remove$(obj[key]);
            }
        }
    }
}

for (const prompt of fullPrompts) {
    if (!prompt.schema) {
        continue;
    }
    prompt.schema = zodToJsonSchema(prompt.schema);
    remove$(prompt.schema);
}

module.exports = fullPrompts;
