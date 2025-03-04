const z = require("zod");

const Schema = z.object({
    specification: z.string().describe("The complete technical specification document."),
    components: z
        .array(z.object({
            name: z.string(),
            description: z.string(),
            purpose: z.string(),
            interfaces: z.array(z.string()).optional(),
            dependencies: z.array(z.string()).optional(),
            artifacts: z.array(z.string()).optional()
        }))
        .describe("Components that make up the system with their descriptions and interfaces."),
    architecturalDecisions: z
        .array(z.object({
            decision: z.string(),
            context: z.string(),
            rationale: z.string(),
            alternatives: z.array(z.string()).optional()
        }))
        .describe("Key architectural decisions with context and rationale."),
    technicalRequirements: z
        .array(z.object({
            id: z.string(),
            description: z.string(),
            priority: z.enum(["Must Have", "Should Have", "Nice to Have"]),
            constraints: z.array(z.string()).optional()
        }))
        .describe("Technical requirements that the system must satisfy.")
});

module.exports = {
    name: "GenerateTechnicalSpecification",
    description: "Create a detailed technical specification for a workspace of artifacts.",
    schema: Schema,
    input: {
        userMessage: "{userMessage}",
        workspaceFiles: "{workspaceFiles}"
    },
    systemPrompt: `You are a software architect. Create a comprehensive technical specification based on the workspace files and user's requirements.

Include the following sections in your specification:
- System overview and goals
- Architecture and component design
- Data models and storage
- API designs and interfaces
- Integration points with external systems
- Performance requirements and constraints
- Security considerations
- Error handling approach
- Monitoring and observability
- Scalability and reliability considerations
- Testing approach

The workspace files are:
<workspaceFiles>
{workspaceFiles}
</workspaceFiles>

Respond with a complete technical specification that provides clear direction for implementation while addressing all important technical aspects.`
};