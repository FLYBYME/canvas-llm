const z = require("zod");

const Schema = z.object({
    validation: z.object({
        passed: z.boolean().describe("Whether the code passes all requirements (true/false)"),
        score: z.number().min(0).max(100).describe("Numerical score of compliance (0-100)")
    }).describe("Pass/fail assessment of code against requirements"),
    
    evaluationDetails: z.object({
        summary: z.string().describe("Concise summary of validation results"),
        technicalRequirements: z.object({
            frameworksValidation: z.array(z.object({
                name: z.string().describe("Framework name"),
                version: z.string().optional().describe("Required version"),
                implemented: z.boolean().describe("Whether correctly implemented"),
                details: z.string().describe("Details about implementation")
            })).describe("Validation of required technical frameworks"),
            passedTechnicalRequirements: z.boolean().describe("Whether all technical requirements are met")
        }),
        
        endpointValidation: z.array(z.object({
            endpoint: z.string().describe("Endpoint path"),
            method: z.string().describe("HTTP method"),
            implemented: z.boolean().describe("Whether correctly implemented"),
            details: z.string().describe("Details about implementation")
        })).describe("Validation of required endpoints"),
        
        modelValidation: z.array(z.object({
            model: z.string().describe("Model name"),
            fields: z.array(z.object({
                name: z.string().describe("Field name"),
                implemented: z.boolean().describe("Whether field is implemented"),
                details: z.string().optional().describe("Details about implementation")
            })).describe("Fields in the model")
        })).describe("Validation of required models"),
        
        functionalValidation: z.array(z.object({
            requirement: z.string().describe("Functional requirement"),
            implemented: z.boolean().describe("Whether correctly implemented"),
            details: z.string().describe("Details about implementation")
        })).describe("Validation of functional requirements"),
        
        passedAllRequirements: z.boolean().describe("Whether all requirements are met")
    }).describe("Detailed evaluation of each requirement"),
    
    failures: z.array(z.object({
        category: z.enum([
            "Framework", "Version", "Endpoint", "Model", "Field", "Function", "Behavior"
        ]).describe("Category of failure"),
        description: z.string().describe("Description of the failure"),
        severity: z.enum(["Critical", "High", "Medium", "Low"]).describe("Severity of the failure"),
        codeReference: z.string().optional().describe("Reference to relevant code location")
    })).describe("List of all requirement failures"),
    
    iteration: z.object({
        required: z.boolean().describe("Whether iteration is required to fix issues"),
        focusAreas: z.array(z.string()).describe("Specific areas to focus on in next iteration"),
        suggestedChanges: z.array(z.object({
            description: z.string().describe("Description of required change"),
            priority: z.enum(["Critical", "High", "Medium", "Low"]).describe("Priority of this change")
        })).describe("Suggested changes for the next iteration")
    }).describe("Iteration guidance if validation failed"),
});

module.exports = {
    name: "ValidateContextCompliance",
    description: "Validate if code meets specific context requirements with a clear pass/fail result.",
    schema: Schema,
    input: {
        codeArtifact: '{codeArtifact}',
        workspaceContext: '{workspaceContext}',
        endpointDefinitions: '{endpointDefinitions}',
        modelDefinitions: '{modelDefinitions}',
        contextDetails: '{contextDetails}',
        availableMethods: '{availableMethods}',
        relatedEndpoints: '{relatedEndpoints}',
        iterationNumber: '{iterationNumber}'
    },
    systemPrompt: `You are a precision code validator that determines whether code STRICTLY passes or fails specific requirements.

# VALIDATION OBJECTIVE
Perform a strict pass/fail validation of the provided code against defined requirements. If the code fails validation, identify specific issues and provide clear guidance for the next iteration.

# CONTEXT REQUIREMENTS
{workspaceContext}

# ENDPOINT MODEL DEFINITIONS
{modelDefinitions}

# ENDPOINT DEFINITIONS
{endpointDefinitions}

# CONTEXT DETAILS
{contextDetails}

# AVAILABLE METHODS
{availableMethods}

# RELATED ENDPOINTS
{relatedEndpoints}

# CODE TO VALIDATE
<code-artifact>
{codeArtifact}
</code-artifact>

# VALIDATION PROCESS
1. Extract all technical requirements (frameworks, versions) from workspace context
2. Extract all functional requirements from endpoint/model definitions
3. Check each requirement against the code implementation
4. Mark each requirement as PASS (true) or FAIL (false)
5. A requirement ONLY passes if it is FULLY implemented as specified
6. The overall validation only passes if ALL requirements pass
7. If validation fails, determine if iteration is required and specify focus areas
8. Current iteration: {iterationNumber}

# OUTPUT REQUIREMENTS
1. Start with a clear "PASSED: true/false" statement
2. If failed, clearly list ALL failed requirements
3. Specify exactly what needs to change in the next iteration
4. For each failure, provide a specific reference to the problematic code area

Begin your validation with a definitive pass/fail statement followed by your detailed assessment.`,
    options: {
        plainText: false,
        includeTimestamp: true,
        iterative: true,
        maxIterations: 5
    },
    conversation: true
};