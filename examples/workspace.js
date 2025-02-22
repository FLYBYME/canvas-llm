import { Workspace } from "../lib/workspace.js";
import { Plan } from "../lib/plan.js";
import "../env.js"
import fs from "fs/promises";
import { generateCodeStructure } from "../lib/helpers/code-structure.js";
import { generateTaskPlan, breakDownTask } from "../lib/helpers/break.js";
import { summarizeText } from "../lib/helpers/summarizer.js";

const workspaceConfig = {
    id: "workspace-1",
    name: "NodeJS Express Template",
    path: "./workspace",
    description: "A template for a NodeJS Express application.",
};

const workspace = new Workspace(workspaceConfig);

await workspace.initialize();

//await workspace.loadArtifactsFromSource();
//await workspace.syncWorkspace(true);
//await workspace.generateDocumentation();
//await workspace.writeArtifactsToSource();

//const artifact = await workspace.getArtifactById("2a7e9676-51e1-4a95-9fe5-f8a23bd0cb8e");
//await workspace.generateDocumentationForArtifact(artifact);
//console.log(await generateCodeStructure(workspace));
await workspace.saveToFile();

const plan = new Plan({
    id: "plan-1",
    title: "Add home route",
    description: "create a home route for the exspress app",
}, workspace);

// const task = await generateTaskPlan(plan);

// await fs.writeFile("./task.json", JSON.stringify(task, null, 2));

const task = await fs.readFile("./task.json", 'utf8').then(data => JSON.parse(data));

const summary = await summarizeText(JSON.stringify(task, null, 2));

console.log(summary);

const workspaceDescription = await plan.workspace.getDescription();
const files = await plan.workspace.getFiles();

const breakdown = await breakDownTask(plan.title, summary, workspaceDescription, files);
await fs.writeFile("./breakdown.json", JSON.stringify(breakdown, null, 2));

console.log(breakdown.components);

