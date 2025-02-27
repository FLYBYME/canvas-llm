const z = require("zod");

// Schema for an argument of a method
const argumentSchema = z.object({
    name: z.string().describe("The name of the argument"),
    type: z.string().describe("The data type of the argument"),
    description: z.string().describe("A brief description of the argument"),
});

// Schema for a method in the service
const methodSchema = z.object({
    name: z.string().describe("The name of the method"),
    arguments: z.array(argumentSchema).describe("The list of arguments the method accepts"),
    returns: z.string().describe("The return type of the method"),
    description: z.string().describe("A brief description of the method"),
});

// Schema for the service
const serviceSchema = z.object({
    name: z.string().describe("The name of the service"),
    module: z.string().describe("The module to which the service belongs"),
    factory: z.boolean().describe("Indicates if the service is a factory"),
    methods: z.array(methodSchema).describe("The list of methods provided by the service"),
});

// Schema for the specification
const specificationSchema = z.object({
    dependencies: z.array(z.string()).describe("The list of dependencies required by the service"),
    keyDetails: z.array(z.string()).describe("Key details about the service"),
    service: serviceSchema.describe("The service schema"),
});

// Main schema for the entire specification
const mainSchema = z.object({
    filePath: z.string().describe("The file path of the service"),
    title: z.string().describe("The title of the specification"),
    fileType: z.string().describe("The type of the file"),
    specification: specificationSchema.describe("The detailed specification of the service"),
});

module.exports = {
    name: "AngularJSService",
    description: "Generate a structured specification for an AngularJS service.",
    schema: mainSchema,
    input: {},
    systemPrompt: `You are an AI assistant tasked with generating a structured specification for an AngularJS service.`,
    options: {}
};