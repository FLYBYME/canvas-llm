const z = require('zod');

const argumentSchema = z.object({
    name: z.string().describe('Argument name'),
    type: z.string().describe('Argument type'),
    description: z.string().describe('Argument description'),
}).describe('Method argument schema');

const methodSchema = z.object({
    name: z.string().describe('Method name'),
    arguments: z.array(argumentSchema).describe('List of method arguments'),
    returns: z.string().describe('Return type of the method'),
    description: z.string().describe('Method description'),
}).describe('Controller method schema');

const controllerSchema = z.object({
    name: z.string().describe('Controller name'),
    module: z.string().describe('Module name'),
    inject: z.array(z.string()).describe('List of dependencies to inject'),
    methods: z.array(methodSchema).describe('List of controller methods'),
}).describe('Controller schema');

const templateSchema = z.object({
    path: z.string().describe('Template path'),
    bindings: z.record(z.string(), z.string()).describe('Template bindings'), // Allows for arbitrary binding names and types as strings
}).describe('Template schema');

const resolveSchema = z.record(z.string(), z.object({
    service: z.string().describe('Service name'),
    method: z.string().describe('Method name'),
})).describe('Resolve schema');

const stateProviderSchema = z.object({
    state: z.string().describe('State name'),
    url: z.string().describe('State URL'),
    templateUrl: z.string().describe('Template URL'),
    controller: z.string().describe('Controller name'),
    controllerAs: z.string().describe('Controller alias'),
    resolve: resolveSchema.optional().describe('Optional resolve configuration'), // Resolve is optional
}).describe('State provider configuration');

const specificationSchema = z.object({
    dependencies: z.array(z.string()).describe('List of dependencies'),
    keyDetails: z.array(z.string()).describe('List of key details'),
    controller: controllerSchema.describe('Controller configuration'),
    template: templateSchema.describe('Template configuration'),
    stateProvider: stateProviderSchema.describe('State provider configuration'),
}).describe('Specification schema');

const mainSchema = z.object({
    filePath: z.string().describe('File path'),
    title: z.string().describe('Title of the specification'),
    fileType: z.string().describe('Type of the file'),
    specification: specificationSchema.describe('Detailed specification of the AngularJS controller'),
});

module.exports = {
    name: "AngularJSController",
    description: "Generate a structured specification for an AngularJS controller.",
    schema: mainSchema,
    input: {},
    systemPrompt: `You are an AI assistant tasked with generating a structured specification for an AngularJS controller.`,
    options: {}
};