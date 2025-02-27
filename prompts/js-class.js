const z = require("zod");
const { PROGRAMMING_LANGUAGES } = require("../lib/constants");
// JS class represented as a zod schema
const example={
    "workspace": "ExampleWorkspace123",
    "filePath": "src/utils/Logger.js",
    "title": "Logger",
    "fileType": "javascript",
    "specification": {
        "dependencies": [],
        "keyDetails": [
            "A utility class for logging messages with different severity levels",
            "Supports info, warning, and error logs",
            "Can be extended for additional logging methods"
        ],
        "class": {
            "name": "Logger",
            "constructor": {
                "arguments": [
                    {
                        "name": "logLevel",
                        "type": "string",
                        "description": "Defines the minimum log level ('info', 'warn', 'error')"
                    }
                ]
            },
            "methods": [
                {
                    "name": "info",
                    "arguments": [
                        {
                            "name": "message",
                            "type": "string",
                            "description": "The log message"
                        }
                    ],
                    "returns": "void",
                    "description": "Logs an informational message"
                },
                {
                    "name": "warn",
                    "arguments": [
                        {
                            "name": "message",
                            "type": "string",
                            "description": "The warning message"
                        }
                    ],
                    "returns": "void",
                    "description": "Logs a warning message"
                },
                {
                    "name": "error",
                    "arguments": [
                        {
                            "name": "message",
                            "type": "string",
                            "description": "The error message"
                        }
                    ],
                    "returns": "void",
                    "description": "Logs an error message"
                }
            ]
        }
    }
}

const schema = z.object({
    workspace: z.string().describe("The name of the workspace"),
    filePath: z.string().describe("The path to the file"),
    title: z.string().describe("The title of the file"),
    fileType: PROGRAMMING_LANGUAGES.map((lang) => lang.language),
    specification: z.object({
        dependencies: z.array(z.object({
            name: z.string().describe("The name of the dependency"),
            version: z.string().describe("The version of the dependency")
        })),
        keyDetails: z.array(z.string().describe("A description of the key details")),
        class: z.object({
            name: z.string().describe("The name of the class"),
            constructor: z.object({
                arguments: z.array(z.object({
                    name: z.string().describe("The name of the argument"),
                    type: z.string().describe("The type of the argument"),
                    description: z.string().describe("A description of the argument")
                }))
            }),
            methods: z.array(z.object({
                name: z.string().describe("The name of the method"),
                arguments: z.array(z.object({
                    name: z.string().describe("The name of the argument"),
                    type: z.string().describe("The type of the argument"),
                    description: z.string().describe("A description of the argument")
                })),
                returns: z.string().describe("The return type of the method"),
                description: z.string().describe("A description of the method")
            }))
        })
    })
});

module.exports = {
    name: "JSClass",
    description: "Generate a JS class",
    schema,
    example,
    systemPrompt: `You are an AI assistant tasked with generating a JS class from the users input.`,
    input: {},
    options: {}
};