import "../env.js";
import { model, Run } from "../lib/model.js";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

const workingDirectory = "./workspace/workspace/code/";

const recursiveReadDir = async (dirPath) => {
    const files = await fs.readdir(dirPath);
    const filePaths = [];
    for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);
        if (stats.isDirectory()) {
            filePaths.push(...(await recursiveReadDir(filePath)));
        } else {
            filePaths.push(filePath);
        }
    }
    return filePaths;
};

const IdentifyRelevantFilesPrompt = `You have access to a workspace with multiple files. The user’s question is: "{question}". Based on filenames and metadata, list the most relevant files.`;
const IdentifyRelevantFilesSchema = z.object({
    files: z.array(z.string()).describe("List of files relevant to the question."),
});

const FileSummaryPrompt = `You are analyzing files to extract relevant information for the user’s question: "{question}". Summarize key details from each file.`;
const FileSummarySchema = z.object({
    fileName: z.string().describe("The name of the file."),
    extractedSummarie: z.string().describe("The extracted summary of the files."),
    keyDetails: z.array(z.string()).describe("List of key details extracted from the files."),
    potentialNextSteps: z.array(z.string()).describe("List of potential next steps based on the key details."),
    documentation: z.string().describe("Documentation in markdown format."),
});

const RelevantFilesPrompt = `You have access to a workspace with multiple files. The user’s question is: "{question}". Based on filenames and metadata. ONLY select the most relevant files that will be used to update or create new files.`;
const RelevantFilesSchema = z.object({
    files: z.array(FileSummarySchema),
    recomendedChanges: z.array(z.object({
        fileName: z.string().describe("The name of the file."),
        modifactionType: z.enum(["create", "modify", "delete", "no-action"]).describe("The type of modification to be applied to the file."),
        details: z.string().describe("Any additional instructions or context for the modification."),
    })).describe("List of recommended changes based on the key details."),
});

const getAllFiles = async () => {
    const files = await recursiveReadDir(workingDirectory);
    return files.map(file => path.relative(workingDirectory, file));
};


const identifyRelevantFiles = async (question, searchedFiles) => {

    const files = await getAllFiles();

    const fullSystemPrompt = IdentifyRelevantFilesPrompt.replace("{question}", question);

    const messages = [
        { role: "system", content: fullSystemPrompt },
        { role: "user", content: files.join("\n") },
    ];

    const response = await model.run(messages, {
        name: "IdentifyRelevantFiles",
        description: "Identify relevant files based on filenames and metadata.",
        schema: IdentifyRelevantFilesSchema
    });

    console.log(response);

    return response.files;
};

const sumermarizeFile = async (file) => {
    const fullSystemPrompt = FileSummaryPrompt.replace("{question}", file);

    const filePath = path.join(workingDirectory, file);
    const fileContent = await fs.readFile(filePath, "utf-8");

    const messages = [
        { role: "system", content: fullSystemPrompt },
        { role: "user", content: fileContent },
    ];

    const response = await model.run(messages, {
        name: "FileSummary",
        description: "Summarize key details from a file.",
        schema: FileSummarySchema
    });

    console.log(response);

    return response;
};

const selectRelevantFiles = async (question, summaries) => {
    const fullSystemPrompt = RelevantFilesPrompt.replace("{question}", question);

    const messages = [
        { role: "system", content: fullSystemPrompt },
        ...summaries.map((summary) => ({ role: "user", content: JSON.stringify(summary) })),
    ];

    console.log(messages);

    const response = await model.run(messages, {
        name: "RelevantFiles",
        description: "Select relevant files based on summaries.",
        schema: RelevantFilesSchema
    });

    console.log(response);

    return response.files;
}


const analyzeWorkspace = async () => {

    const files = await getAllFiles();
    const summaries = await Promise.all(files.map(file => sumermarizeFile(file)));

    const globalSummary = await generateGlobalSummary(summaries);

    console.log(globalSummary, summaries);

};

const generateGlobalSummary = async (fileSummaries) => {
    console.log(`📊 Generating global summary from ${fileSummaries.length} files`);

    const messages = [
        { role: "system", content: "Generate an overall summary based on the following file summaries." },
        ...fileSummaries.map((summary) => ({
            role: "user",
            content: JSON.stringify(summary)
        })),
    ];

    const response = await model.run(messages);

    return response;
};


analyzeWorkspace();