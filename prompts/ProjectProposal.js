const z = require("zod");

const { PROGRAMMING_LANGUAGES } = require("../lib/constants");

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
    })).describe("List of files and their specifications"),
    rationale: z.string().optional().describe("Rationale behind the chosen file structure"),
}).describe("Schema for File Structure Blueprint");

const FileStructure = z.object({
    fileName: z.string().describe("Name of the file"),
    filePath: z.string().describe("Path to the file"),
    type: z.enum(["code", "data", "documentation", "other"]).describe("Type of the file"),
    language: z.enum(PROGRAMMING_LANGUAGES.map((lang) => lang.language)).describe("Programming language of the file"),
    description: z.string().describe("Description of the file or directory"),
    isClassDefinition: z.boolean().describe("Indicates if the file is a class definition"),
    className: z.string().optional().describe("Name of the class if the file is a class definition"),
}).describe("Schema for File Structure");


const ClassSchema = z.object({
    className: z.string().describe("Name of the class"),
    description: z.string().optional().describe("Description of the class"),
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
    })).describe("List of methods in the class"),
}).describe("Schema for a class");


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
        systemPrompt: `YYou are an AI assistant responsible for designing a comprehensive File Structure Blueprint for a software project. Please enhance the latest version by adding features and ensuring it is adaptable and future-proof.`,
    },
    {
        name: 'ClassSchema',
        description: 'Generate a Class Schema for a software project.',
        schema: ClassSchema,
        input: {
            ProjectRequirementsDocument: "{ProjectRequirementsDocument}",
        },
        systemPrompt: `You are an AI assistant tasked with generating a Class Schema for a software project. The schema should include a list of class attributes, optional justifications for each attribute, and optional examples of the attributes in practice.`,
    },
    {
        name: 'ClassSchemaDocumentation',
        description: 'Generate a Class Schema Documentation for a software project.',
        input: {
            ClassSchema: "{ClassSchema}",
        },
        systemPrompt: `Given a JavaScript class definition, generate comprehensive documentation in Markdown format. The output should include the following sections:

Overview: A concise summary of the class and its purpose.
Properties: A table listing each property with its name, type, and description.
Methods: For each method, provide the method signature, a detailed description of its behavior, and an example usage in JavaScript formatted in a code block.
Ensure the Markdown is well-structured, clear, and formatted for technical documentation.`,
        options:{
            plainText: true
        }
    }
];