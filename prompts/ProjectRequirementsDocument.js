const z = require("zod");

// Schema for individual project requirements
const RequirementSchema = z.object({
    id: z.string().describe("Unique identifier for the requirement"),
    title: z.string().describe("Short title or summary of the requirement"),
    description: z.string().describe("Detailed explanation of the requirement"),
    priority: z.enum(["low", "medium", "high"]).describe("Priority level of the requirement"),
    status: z.enum(["pending", "approved", "implemented"]).describe("Current implementation status")
}).describe("Schema for a single project requirement");

// Schema for the overall Project Requirements Document
const ProjectRequirementsDocumentSchema = z.object({
    projectName: z.string().describe("Name of the project"),
    projectDescription: z.string().describe("Brief overview of the project"),
    objectives: z.array(z.string()).describe("List of key objectives for the project"),
    technologies: z.array(z.string()).describe("Technologies and tools used in the project"),
    stakeholders: z.array(z.string()).describe("Names or roles of project stakeholders"),
    requirements: z.array(RequirementSchema).describe("List of requirements collected for the project"),
}).describe("Project Requirements Document schema");

module.exports = {
    name: 'ProjectRequirementsDocument',
    description: 'Generate a Project Requirements Document for a software project.',
    schema: ProjectRequirementsDocument,
    input: {},
    systemPrompt: `You are an AI assistant tasked with generating a Project Requirements Document for a software project. The document will include a high-level overview of the project, its objectives, technologies used, and any relevant stakeholders. The document will also include a list of requirements that need to be met for the project to be successful. The requirements will be broken down into individual requirements with their associated priority and status.`,
};