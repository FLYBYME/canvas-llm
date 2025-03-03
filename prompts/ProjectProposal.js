const z = require("zod");

const { PROGRAMMING_LANGUAGES } = require("../lib/constants");
const { description } = require("./js-class");

// Schema for individual project requirements
const RequirementSchema = z.object({
    title: z.string().describe("Short title or summary of the requirement"),
    description: z.string().describe("Detailed explanation of the requirement"),
    priority: z.enum(["low", "medium", "high"]).describe("Priority level of the requirement"),
    status: z.enum(["pending", "approved", "implemented"]).describe("Current implementation status"),
}).describe("Schema for a single project requirement");

// Schema for the overall Project Requirements Document
const ProjectRequirementsDocument = z.object({
    projectName: z.string().describe("Name of the project"),
    projectDescription: z.string().describe("Brief overview of the project"),
    objectives: z.array(z.string()).describe("List of key objectives for the project"),
    technologies: z.array(z.string()).describe("Technologies and tools used in the project"),
    stakeholders: z.array(z.string()).describe("Names or roles of project stakeholders"),
    requirements: z.array(RequirementSchema).describe("List of requirements collected for the project"),
}).describe("Project Requirements Document schema");

// Define the structures for various inputs and outputs
const ProjectProposal = z.object({
    title: z.string().describe("Title of the project proposal"),
    description: z.string().describe("Description of the project proposal"),
}).describe("Schema for Project Proposal");

const StakeholderInterviews = z.object({
    stakeholderName: z.string().describe("Name of the stakeholder interviewed"),
    feedback: z.string().describe("Feedback from the stakeholder"),
}).describe("Schema for Stakeholder Interviews");

const StakeholderFeedback = z.object({
    stakeholderName: z.string().describe("Name of the stakeholder providing feedback"),
    feedback: z.string().describe("Feedback from the stakeholder"),
}).describe("Schema for Stakeholder Feedback");

const CodingStandardsDocument = z.object({
    rules: z.array(z.string()).describe("List of coding standards rules"),
    guidelines: z.array(z.string()).describe("List of style guidelines"),
    documentation: z.string().describe("Documentation for the coding standards in markdown format"),
}).describe("Schema for Coding Standards Document");

const StyleGuidelines = z.object({
    guidelines: z.array(z.string()).describe("List of style guidelines"),
    examples: z.array(z.string()).optional().describe("Examples of the style guidelines. One line per code block."),
    tools: z.array(z.string()).optional().describe("Tools recommended for enforcing the style guidelines"),
}).describe("Schema for Style Guidelines");

const FileStructureBlueprint = z.object({
    files: z.array(z.object({
        fileName: z.string().describe("Name of the file"),
        filePath: z.string().describe("Path to the file"),
        type: z.enum(["code", "data", "documentation", "other"]).describe("Type of the file"),
        language: z.enum(PROGRAMMING_LANGUAGES.map((lang) => lang.language)).describe("Programming language of the file"),
        description: z.string().describe("Description of the file or directory"),
        isClassDefinition: z.boolean().describe("Indicates if the file is a class definition"),
        className: z.string().optional().describe("Name of the class if the file is a class definition"),
        isModuleDefinition: z.boolean().describe("Indicates if the file is a module definition"),
        moduleName: z.string().optional().describe("Name of the module if the file is a module definition"),
    })).describe("List of files and their specifications")
}).describe("Schema for File Structure Blueprint");

const FileStructure = z.object({
    fileName: z.string().describe("Name of the file"),
    filePath: z.string().describe("Path to the file"),
    type: z.enum(["code", "data", "documentation", "other"]).describe("Type of the file"),
    language: z.enum(PROGRAMMING_LANGUAGES.map((lang) => lang.language)).describe("Programming language of the file"),
    description: z.string().describe("Description of the file or directory"),
    isClassDefinition: z.boolean().describe("Indicates if the file is a class definition"),
    className: z.string().optional().describe("Name of the class if the file is a class definition"),
    isModuleDefinition: z.boolean().describe("Indicates if the file is a module definition"),
    moduleName: z.string().optional().describe("Name of the module if the file is a module definition"),
}).describe("Schema for File Structure");

const ClassSchema = z.object({
    className: z.string().describe("Name of the class"),
    description: z.string().optional().describe("Description of the class"),
    inheritance: z.string().optional().describe("Parent class if the class inherits from another class"),
    parameters: z.array(z.object({
        name: z.string().describe("Name of the parameter"),
        type: z.string().describe("Type of the parameter. Can be a primitive type(String, Number, Boolean, void, etc.) or a class name. If the type is an Array, use Array<type>."),
        description: z.string().optional().describe("Description of the parameter"),
    })).describe("List of parameters for the class"),
    properties: z.array(z.object({
        name: z.string().describe("Name of the property"),
        type: z.string().describe("Type of the property. Can be a primitive type(String, Number, Boolean, void, etc.) or a class name. If the type is an Array, use Array<type>."),
        description: z.string().optional().describe("Description of the property"),
    })).describe("List of properties in the class"),
    methods: z.array(z.object({
        name: z.string().describe("Name of the method"),
        returnType: z.string().describe("Return type of the method"),
        parameters: z.array(z.object({
            name: z.string().describe("Name of the parameter"),
            type: z.string().describe("Type of the parameter. Can be a primitive type(String, Number, Boolean, void, etc.) or a class name. If the type is an Array, use Array<type>."),
        })).describe("List of parameters for the method"),
        description: z.string().optional().describe("Description of the method"),
        exceptions: z.array(z.object({
            name: z.string().describe("Name of the exception"),
            description: z.string().describe("Description of the exception"),
        })).optional().describe("List of exceptions that the method can throw"),
    })).describe("List of methods in the class"),

}).describe("List of classes in the schema");

const ModuleSchema = z.object({
    moduleName: z.string().describe("Name of the module"),
    description: z.string().describe("Description of the module"),

    dependencies: z.array(z.object({
        name: z.string().describe("Name of the dependency"),
        version: z.string().describe("Version of the dependency"),
        description: z.string().describe("Description of the dependency"),
    })).describe("List of dependencies for the module").default([]),

    exports: z.array(z.object({
        name: z.string().describe("Name of the export"),
        returnType: z.string().describe("Return type of the export"),
        parameters: z.array(z.object({
            name: z.string().describe("Name of the parameter"),
            type: z.string().describe("Type of the parameter. Can be a primitive type(String, Number, Boolean, void, etc.) or a class name. If the type is an Array, use Array<type>."),
        })).describe("List of parameters for the export"),
        description: z.string().describe("Description of the exported entity"),
    })).describe("List of exports in the module").default([]),
}).describe("Schema for a module definition");


const EndpointSchema = z.object({
    method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"])
        .describe("HTTP method of the endpoint"),

    path: z.string()
        .describe("Path of the endpoint"),

    description: z.string()
        .describe("Description of the endpoint"),

    model: z.object({
        name: z.string().describe("Name of the model"),
        action: z.enum(["create", "read", "update", "delete"]).describe("Action performed by the endpoint"),
    }).describe("Model associated with the endpoint"),

    parameters: z.array(z.object({
        name: z.string().describe("Name of the parameter"),
        in: z.enum(["query", "header", "path", "cookie"])
            .describe("Location of the parameter"),
        required: z.boolean()
            .describe("Whether the parameter is required"),
        type: z.string()
            .describe("Type of the parameter"),
        description: z.string()
            .describe("Description of the parameter"),
    }))
        .optional()
        .describe("List of parameters for the endpoint"),

    responses: z.array(z.object({
        code: z.string()
            .describe("The HTTP status code of the response"),
        type: z.string()
            .describe("The type of the response"),
        description: z.string()
            .describe("The description of the response"),
    }))
        .describe("List of responses for the endpoint"),

    authentication: z.boolean()
        .describe("Whether the endpoint requires authentication"),

    security: z.array(z.object({
        type: z.string()
            .describe("The type of security (e.g., 'apiKey', 'oauth2')"),
        name: z.string()
            .describe("The name of the security scheme"),
        location: z.enum(["query", "header", "cookie"])
            .describe("The location of the security scheme"),
    }))
        .optional()
        .describe("List of security schemes for the endpoint"),

    tags: z.array(z.string())
        .describe("List of tags for the endpoint"),
}).describe("Schema for an endpoint definition");

const EndpointSchemaList = z.object({
    endpoints: z.array(EndpointSchema)
        .describe("List of endpoint definitions"),
}).describe("Schema for a list of endpoint definitions");


const EndpointModelSchema = z.object({
    name: z.string().describe("Name of the model"),
    description: z.string().describe("Description of the model"),
    fields: z.array(z.object({
        name: z.string().describe("Name of the field"),
        type: z.string().describe("Type of the parameter. Can be a primitive type(String, Number, Boolean)."),
        description: z.string().describe("Description of the field"),
        populates: z.string().optional().describe("The name of the model that this field references"),
        required: z.boolean().optional().describe("Whether the field is required"),
    })).describe("List of fields in the model"),
});

const EndpointModelSchemaList = z.object({
    models: z.array(EndpointModelSchema).describe("List of model definitions"),
});


module.exports = [
    {
        name: 'ProjectRequirementsDocument',
        description: 'Generate a Project Requirements Document for a software project.',
        schema: ProjectRequirementsDocument,
        input: {
            ProjectProposal: "{ProjectProposal}",
            StakeholderInterviews: "{StakeholderInterviews}",
        },
        systemPrompt: `You are an AI assistant tasked with generating a Project Requirements Document for a software project. The document will include a high-level overview of the project, its objectives, technologies used, and any relevant stakeholders. The document will also include a list of requirements that need to be met for the project to be successful. The requirements will be broken down into individual requirements with their associated priority and status.`,
    },
    {
        name: 'ProjectProposal',
        description: 'Generate a Project Proposal for a software project.',
        schema: ProjectProposal,
        input: {},
        conversation: true,
        systemPrompt: `You are an AI assistant tasked with generating a Project Proposal for a software project. The proposal should include a title and a detailed description of the project.`,
    },
    {
        name: 'StakeholderInterviews',
        description: 'Document feedback and insights from stakeholder interviews.',
        schema: StakeholderInterviews,
        input: {},
        conversation: true,
        systemPrompt: `You are an AI assistant tasked with documenting feedback and insights from stakeholder interviews. For each interview, record the name of the stakeholder and their feedback.`,
    },
    {
        name: 'StakeholderFeedback',
        description: 'Document feedback provided by stakeholders.',
        schema: StakeholderFeedback,
        input: {},
        conversation: true,
        systemPrompt: `You are an AI assistant tasked with documenting feedback provided by stakeholders. For each piece of feedback, record the name of the stakeholder and their feedback.`,
    },
    {
        name: 'CodingStandardsDocument',
        description: 'Generate a Coding Standards Document for a software project.',
        schema: CodingStandardsDocument,
        input: {
            ProjectRequirementsDocument: "{ProjectRequirementsDocument}",
            StakeholderFeedback: "{StakeholderFeedback}"
        },
        systemPrompt: `You are an AI assistant tasked with generating a Coding Standards Document for a software project. The document should include a list of coding standards rules, optional justifications for each rule, and optional examples of the rules in practice.`,
    },
    {
        name: 'StyleGuidelines',
        description: 'Generate Style Guidelines for a software project.',
        schema: StyleGuidelines,
        input: {
            CodingStandardsDocument: "{CodingStandardsDocument}",
            ProjectRequirementsDocument: "{ProjectRequirementsDocument}",
        },
        systemPrompt: `You are an AI assistant tasked with generating Style Guidelines for a software project. The guidelines should include a list of style rules, optional examples of the rules, and optional tools recommended for enforcing the guidelines.`,
    },
    {
        name: 'FileStructureBlueprint',
        description: 'Generate a File Structure Blueprint for a software project.',
        schema: FileStructureBlueprint,
        input: {
            ProjectRequirementsDocument: "{ProjectRequirementsDocument}",
            CodingStandardsDocument: "{CodingStandardsDocument}",
            StyleGuidelines: "{StyleGuidelines}",
            StakeholderInterviews: "{StakeholderInterviews}"
        },
        systemPrompt: `You are an AI assistant tasked with generating a File Structure Blueprint for a software project. The blueprint should describe the file structure, include optional rationale behind the chosen structure, and optional examples of similar file structures.`,
    },
    {
        name: 'FileStructureRefinement',
        description: 'Generate a File Structure Blueprint for a software project.',
        schema: FileStructure,
        input: {
            ProjectRequirementsDocument: "{ProjectRequirementsDocument}",
            CodingStandardsDocument: "{CodingStandardsDocument}",
            StyleGuidelines: "{StyleGuidelines}",
            StakeholderInterviews: "{StakeholderInterviews}"
        },
        systemPrompt: `YYou are an AI assistant responsible for designing a comprehensive File Structure Blueprint for a software project. Please enhance the latest version by adding features and ensuring it is adaptable and future-proof.

Update the file structure description to reflect the latest changes.`,
    },

    {
        name: 'ClassSchema',
        description: 'Generate a Class Schema for a software project.',
        schema: ClassSchema,
        input: {

        },
        systemPrompt: `You are an AI assistant tasked with generating a Class Schema for a software project. The schema should include a list of class attributes, methods, and properties, with optional justifications for each element and examples where applicable.`,
    },
    {
        name: 'ModuleSchema',
        description: 'Generate a Module Schema for a software project.',
        schema: ModuleSchema,
        input: {
            ProjectRequirementsDocument: "{ProjectRequirementsDocument}",
        },
        systemPrompt: `You are an AI assistant tasked with generating a Module Schema for a software project. The schema should include a list of module attributes, dependencies, exports, and included classes, with optional justifications for each element and examples where applicable.`,
    },
    {
        name: 'ClassSchemaDocumentation',
        description: 'Generate a Class Schema Documentation for a software project.',
        input: {
            ClassSchema: "{ClassSchema}",
        },
        systemPrompt: `Given a JavaScript class definition, generate comprehensive documentation in Markdown format. The output should include the following sections:

Overview: A concise summary of the class and its purpose.
Parameters: A table listing each parameter with its name and type.
Properties: A table listing each property with its name, type, and description.
Methods: For each method, provide the method signature, a detailed description of its behavior, and an example usage in JavaScript formatted in a code block.
Ensure the Markdown is well-structured, clear, and formatted for technical documentation.`,
        options: {
            plainText: true
        }
    }, {
        name: 'EndpointSchema',
        description: 'Generate an Endpoint Schema for an API rest service.',
        schema: EndpointSchema,
        input: {
            ProjectRequirementsDocument: "{ProjectRequirementsDocument}",
        },
        systemPrompt: `You are an AI assistant tasked with generating an Endpoint Schema for an API rest service. The schema should include a list of endpoints with their associated HTTP methods, paths, descriptions, parameters, responses, security schemes, and
tags. For most create, update, and delete endpoints, the request should be authenticated.`,
    }, {
        name: 'EndpointSchemaList',
        description: 'Generate a list of Endpoint Schemas for an API rest service.',
        schema: EndpointSchemaList,
        input: {
            ProjectRequirementsDocument: "{ProjectRequirementsDocument}",
        },
        systemPrompt: `You are an AI assistant tasked with generating an Endpoint Schema for an API rest service. The schema should include a list of endpoints with their associated HTTP methods, paths, descriptions, parameters, responses, security schemes, and
tags.`,
    }, {
        name: 'EndpointModelSchema',
        description: 'Generate an Endpoint Model Schema for an API rest service.',
        schema: EndpointModelSchema,
        input: {
            ProjectRequirementsDocument: "{ProjectRequirementsDocument}",
        },
        systemPrompt: `You are an AI assistant tasked with generating an Endpoint Model Schema for an API rest service. The schema should include a list of models with their associated fields, types, and descriptions.`,
    }, {
        name: 'EndpointModelSchemaList',
        description: 'Generate a list of Endpoint Model Schemas for an API rest service.',
        schema: EndpointModelSchemaList,
        input: {
            ProjectRequirementsDocument: "{ProjectRequirementsDocument}",
        },
        systemPrompt: `You are an AI assistant tasked with generating an Endpoint Model Schema for an API rest service. The schema should include a list of models with their associated fields, types, and descriptions.`,
    }
];