import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

import { Artifact } from "./artifact.js";
import { Conversation } from "./conversation.js";


// The **Workspace** is a comprehensive, virtual environment where developers interact with various components of the software development process, including code, tasks, files, and tools. It serves as the central hub for managing and executing tasks, organizing the codebase, and integrating different development activities. The Workspace facilitates a streamlined workflow, providing the necessary resources, context, and tools for efficient software development. It typically includes the following key elements:

export class Workspace {
  constructor(config) {
    this.id = config.id || uuidv4();
    this.name = config.name;
    this.path = config.path; // Root path where workspace data will be stored
    this.description = config.description;

    this.artifacts = config.artifacts || []; // Array to store paths to generated files/artifacts
    this.conversation = Conversation.fromJSON(config.conversation || {
      id: uuidv4(),
      messages: [],
      reflection: {
        styleRules: [],
        content: [],
      }
    });

    this.workspaceDirectory = path.join(this.path, "workspace");
    this.jsonDirectory = path.join(this.workspaceDirectory, "json");  // For storing workspace metadata in JSON
    this.tasksDirectory = path.join(this.workspaceDirectory, "tasks"); // Directory for task-specific data
    this.codeDirectory = path.join(this.workspaceDirectory, "code");   // Directory for code related to the workspace

  }

  async initialize() {
    await fs.mkdir(this.workspaceDirectory, { recursive: true });
    await fs.mkdir(this.jsonDirectory, { recursive: true });
    await fs.mkdir(this.tasksDirectory, { recursive: true });
    await fs.mkdir(this.codeDirectory, { recursive: true });
    console.log(`Workspace directory initialized at ${this.workspaceDirectory}`);

    const files = await fs.readdir(this.jsonDirectory);

    for (const file of files) {
      const filePath = path.join(this.jsonDirectory, file);
      const artifact = await Artifact.loadFromFile(filePath);
      artifact.setWorkspace(this);
      this.artifacts.push(artifact);
    }
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      path: this.path,
      description: this.description,
      artifacts: this.artifacts.map(artifact => artifact.id),
      conversation: this.conversation.toJSON(),
    };
  }

  async saveToFile() {
    const json = JSON.stringify(this.toJSON(), null, 2);
    const filePath = path.join(this.workspaceDirectory, "workspace.json");
    await fs.writeFile(filePath, json, 'utf8');
    console.log(`Workspace saved to ${filePath}`);

    for (const artifact of this.artifacts) {
      await artifact.saveToFile();
    }

    console.log(`Artifacts saved to ${this.jsonDirectory}`);
  }

  static async loadFromFile(filePath) {
    const fileData = await fs.readFile(filePath, 'utf8');
    const workspaceConfig = JSON.parse(fileData);
    return new Workspace(workspaceConfig);
  }


  async createArtifact(config) {
    if (!config.id) {
      config.id = uuidv4();
    }
    config.filePath = path.join(this.jsonDirectory, `${config.id}.json`);
    
    for (const artifact of this.artifacts) {
      if (artifact.filePath === config.filePath) {
        throw new Error(`Artifact with file path ${config.filePath} already exists.`);
      }
    }

    const artifact = new Artifact(config);
    artifact.setWorkspace(this);
    await artifact.saveToFile();
    this.artifacts.push(artifact);
    return artifact;
  }

  async loadArtifactFromSource(filePath) {
    const fullPath = path.join(this.codeDirectory, filePath);


    const content = await fs.readFile(fullPath, 'utf8');
    const id = uuidv4();
    const artifact = new Artifact({
      id: id,
      title: "",
      description: "",
      fileName: filePath,
      filePath: path.join(this.jsonDirectory, `${id}.json`),
      content: content,
      workspace: this
    });

    await artifact.saveToFile();
    this.artifacts.push(artifact);

    return artifact;
  }

  getArtifactById(id) {
    return this.artifacts.find(artifact => artifact.id === id);
  }

  async writeArtifactsToSource() {
    for (const artifact of this.artifacts) {
      const filePath = path.join(this.codeDirectory, artifact.fileName);
      await fs.writeFile(filePath, artifact.content, 'utf8');
    }
    console.log(`Artifacts saved to ${this.codeDirectory}`);
  }

}