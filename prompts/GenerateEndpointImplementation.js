"use strict";

const z = require("zod");

const { PROGRAMMING_LANGUAGES } = require("../lib/constants.js");

const Schema = z.object({
    implementation: z.object({
        language: z.enum([...PROGRAMMING_LANGUAGES.map(language => language.language), "other"]).describe("Programming language of the implementation"),
        framework: z.string().describe("Framework used for the implementation")
    }).describe("Generated endpoint implementation"),
    
    metadata: z.object({
        endpoint: z.object({
            path: z.string().describe("Endpoint path"),
            method: z.string().describe("HTTP method"),
            description: z.string().describe("Endpoint description")
        }).describe("Endpoint information"),
        
        features: z.array(z.string()).describe("List of features implemented"),
        complexity: z.number().min(1).max(10).describe("Estimated complexity (1-10)"),
        requirements: z.array(z.object({
            type: z.string().describe("Requirement type"),
            description: z.string().describe("Requirement description"),
            satisfied: z.boolean().describe("Whether requirement is satisfied")
        })).describe("Implementation requirements")
    }).describe("Metadata about the implementation"),
    
    documentation: z.string().describe("Complete documentation for the endpoint implementation in Markdown format"),
    
    artifact: z.string().describe("Complete code implementation as a structured artifact")
});

module.exports = {
    name: "GenerateEndpointImplementation",
    description: "Generate a complete endpoint implementation based on defined specifications and context",
    schema: Schema,
    input: {
        endpointDefinitions: '{endpointDefinitions}',
        workspaceContext: '{workspaceContext}',
        modelDefinitions: '{modelDefinitions}',
        contextDetails: '{contextDetails}',
        availableMethods: '{availableMethods}',
        relatedEndpoints: '{relatedEndpoints}',
        implementationTemplate: '{implementationTemplate}'
    },
    systemPrompt: `You are an expert API endpoint implementation generator for Moleculer microservices.

# GENERATION OBJECTIVE
Create a complete, production-ready implementation for the requested endpoint that satisfies all requirements and follows best practices for the Moleculer framework.

# WORKSPACE CONTEXT
{workspaceContext}

# ENDPOINT DEFINITION
{endpointDefinitions}

# MODEL DEFINITIONS
{modelDefinitions}

# CONTEXT DETAILS
{contextDetails}

# AVAILABLE METHODS
{availableMethods}

# RELATED ENDPOINTS
{relatedEndpoints}

# IMPLEMENTATION TEMPLATE
{implementationTemplate}

# IMPLEMENTATION REQUIREMENTS
1. Follow RESTful API best practices and Moleculer service patterns
2. Implement proper parameter validation and error handling
3. Include appropriate logging at key points in the implementation
4. Use the available methods from the Moleculer database service
5. Implement proper status code responses for success and error cases
6. Format responses consistently using the formattedResponse and formattedError methods
7. Document the code with clear, concise comments explaining complex logic
8. If the endpoint requires authentication, validate user permissions
9. If the endpoint relates to a model, perform proper CRUD operations
10. Follow consistent naming conventions and code style

# CODE STRUCTURE
1. Structure the code as a Moleculer action with proper REST configuration
2. Include parameter validation schema
3. Implement a handler function with appropriate error handling
4. Use helper methods as needed
5. Return properly formatted responses

# QUALITY REQUIREMENTS
1. The code must be secure, efficient, and maintainable
2. Handle edge cases and potential errors gracefully
3. Include proper validation for all inputs
4. Follow consistent formatting and style
5. Avoid code duplication and prefer reusable methods

Generate a complete, production-ready endpoint implementation that follows all these requirements.`,
    options: {
        temperature: 0.2,
        plainText: false,
        includeTimestamp: true
    },
    conversation: true
};