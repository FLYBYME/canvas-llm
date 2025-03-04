const z = require("zod");

const { PROGRAMMING_LANGUAGES } = require("../constants");

const Schema = z.object({
    apiSpec: z.string().describe("The complete API specification."),
    language: z
        .enum(
            PROGRAMMING_LANGUAGES.map((lang) => lang.language)
        )
        .optional()
        .describe("The programming language for any code examples, if applicable."),
    endpoints: z
        .array(z.object({
            path: z.string(),
            method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"]),
            description: z.string()
        }))
        .describe("List of API endpoints with paths, methods, and descriptions."),
    authMethod: z
        .enum(["None", "API Key", "OAuth", "JWT", "Basic Auth", "Custom", "Other"])
        .describe("The authentication method used by the API."),
    dataFormat: z
        .enum(["JSON", "XML", "GraphQL", "Protocol Buffers", "Other"])
        .describe("The primary data format used by the API.")
});

module.exports = {
    name: "DesignAPI",
    description: "Design a RESTful or GraphQL API including endpoints, authentication, and data structures.",
    schema: Schema,
    input: {
        userMessage: "{userMessage}"
    },
    systemPrompt: `You are an API design architect. Create a comprehensive API specification based on the user's requirements.

Include the following elements in your design:
- Complete endpoint definitions with paths, methods, and descriptions
- Request and response schemas for each endpoint
- Authentication and authorization mechanisms
- Error handling approach and status codes
- Data models and relationships
- Rate limiting and security considerations
- Example requests and responses
- Implementation guidance if requested

Your API design should follow best practices for the specified API type (REST, GraphQL, etc.)
and be consistent, secure, and scalable.

Respond with a complete, well-structured API specification that covers all aspects of the design.`
};