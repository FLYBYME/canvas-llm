
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

import { Artifact } from "./artifact.js";
import { Conversation } from "./conversation.js";
import { generateNewDocument } from "./helpers/contect-document.js";
import { PROGRAMMING_LANGUAGES } from "./constants.js";
import { model } from "./model.js";
import { summarizeText } from "./helpers/summarizer.js";


// The **Workspace** is a comprehensive, virtual environment where developers interact with various components of the software development process, including code, tasks, files, and tools. It serves as the central hub for managing and executing tasks, organizing the codebase, and integrating different development activities. The Workspace facilitates a streamlined workflow, providing the necessary resources, context, and tools for efficient software development. It typically includes the following key elements:

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

const ignoreList = [
  "package-lock.json",
  "yarn.lock"
]

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

    this.contextDocuments = [];

    this.workspaceDirectory = path.join(this.path, "workspace");
    this.jsonDirectory = path.join(this.workspaceDirectory, "json");  // For storing workspace metadata in JSON
    this.tasksDirectory = path.join(this.workspaceDirectory, "tasks"); // Directory for task-specific data
    this.codeDirectory = path.join(this.workspaceDirectory, "code");   // Directory for code related to the workspace
    this.docsDirectory = path.join(this.workspaceDirectory, "docs");

    this.hasInitialized = false;

  }

  async initialize() {
    if (this.hasInitialized) {
      return;
    }

    this.hasInitialized = true;
    await fs.mkdir(this.workspaceDirectory, { recursive: true });
    await fs.mkdir(this.jsonDirectory, { recursive: true });
    await fs.mkdir(this.tasksDirectory, { recursive: true });
    await fs.mkdir(this.codeDirectory, { recursive: true });
    await fs.mkdir(this.docsDirectory, { recursive: true });
    console.log(`Workspace directory initialized at ${this.workspaceDirectory}`);

    const files = await fs.readdir(this.jsonDirectory);

    for (const file of files) {
      const filePath = path.join(this.jsonDirectory, file);
      const artifact = await Artifact.loadFromFile(filePath);
      artifact.setWorkspace(this);
      this.artifacts.push(artifact);
    }


    const docFiles = await fs.readdir(this.docsDirectory);
    for (const file of docFiles) {
      const filePath = path.join(this.docsDirectory, file);
      const json = await fs.readFile(filePath, 'utf8')
        .then(data => JSON.parse(data));
      json.document = true;
      const artifact = await this.createArtifact(json);
      this.contextDocuments.push(artifact);
    }
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      path: this.path,
      description: this.description,
      artifacts: this.artifacts.map(artifact => artifact.id),
      conversation: this.conversation.toJSON()
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

    for (const document of this.contextDocuments) {
      await document.saveToFile();
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

    config.filePath = path.join(config.document ? this.docsDirectory : this.jsonDirectory, `${config.id}.json`);

    for (const artifact of this.artifacts) {
      if (artifact.filePath === config.filePath) {
        throw new Error(`Artifact with file path ${config.filePath} already exists.`);
      }
    }

    const artifact = new Artifact(config);
    artifact.setWorkspace(this);
    await artifact.saveToFile();
    if (!config.document) {
      this.artifacts.push(artifact);
    }
    return artifact;
  }

  async loadArtifactFromSource(filePath) {
    const fullPath = path.join(this.codeDirectory, filePath);

    const found = this.artifacts.find(artifact => artifact.filePath === fullPath);
    if (found) {
      return found;
    }

    const content = await fs.readFile(fullPath, 'utf8');
    const id = uuidv4();

    const { language } = PROGRAMMING_LANGUAGES.find(lang => lang.extension === path.extname(filePath).slice(1)) || { language: "other" };

    const artifact = new Artifact({
      id: id,
      title: "",
      language: language,
      description: "",
      fileName: filePath,
      filePath: path.join(this.jsonDirectory, `${id}.json`),
      content: content,
      workspace: this
    });

    await artifact.saveToFile();
    this.artifacts.push(artifact);

    console.log(`Artifact loaded from ${fullPath}`);

    return artifact;
  }

  async loadArtifactsFromSource() {
    const files = await recursiveReadDir(this.codeDirectory)
      .then(files => files.map(file => path.relative(this.codeDirectory, file)));
    for (const file of files) {
      await this.loadArtifactFromSource(file);
    }
  }

  getArtifactById(id) {
    return this.artifacts.find(artifact => artifact.id === id);
  }

  getArtifacts() {
    return this.artifacts;
  }

  async writeArtifactsToSource() {
    for (const artifact of this.artifacts) {
      const filePath = path.join(this.codeDirectory, artifact.fileName);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, artifact.content, 'utf8');
    }
    console.log(`Artifacts saved to ${this.codeDirectory}`);
  }

  async getContextDocuments() {
    const contextDocuments = [
      ...this.contextDocuments
    ];

    const contextDocumentMessages = contextDocuments.map(artifact => ({
      type: "text",
      text: artifact.content
    }));

    const messages = [];

    if (contextDocumentMessages.length > 0) {
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: "Use the file(s) and/or text below as context when generating your response.",
          },
          ...contextDocumentMessages,
        ]
      });
    }
    return messages;
  }

  async syncArtifact(artifact) {

    await artifact.updateMetadata(this.conversation);
    if (artifact.language === "javascript") {
      await artifact.updateDependencies(this.conversation);
      await artifact.updateSnippits(this.conversation);
    }
  }

  async syncWorkspace() {

    await Promise.all(this.artifacts.map(artifact => this.syncArtifact(artifact)));

    console.log(`Workspace synced`);
  }

  async summarizeDocumentationForArtifact(artifact) {
    return summarizeText(artifact.content);
  }

  async generateDocumentationForArtifact(artifact) {

    if (artifact.language === "javascript") {
      const newArtifactSource = await generateNewDocument(artifact);
      const fileName = path.join("docs", `${artifact.fileName.replace(".js", ".md").replace("/", "-")}`);
      const doc = await this.createArtifact({
        title: '',
        description: '',
        type: 'text',
        content: newArtifactSource.content,
        language: "markdown",
        fileName: fileName,
        document: true
      });

      console.log(`Documentation generated for artifact ${fileName}`);

      artifact.documentation = doc.id

      const [docSummary, artifactSummary] = await Promise.all([
        summarizeText(doc.content),
        summarizeText(artifact.content)
      ]);

      doc.summary = docSummary;
      artifact.summary = artifactSummary;

      console.log(`Summary generated for artifact ${fileName}`);

      this.contextDocuments.push(doc);

      return doc;
    }
  }

  async generateDocumentation() {

    const artifacts = this.artifacts.filter(artifact => artifact.language === "javascript");

    for (const artifact of artifacts) {
      await this.generateDocumentationForArtifact(artifact);
    }

    console.log(`Documentation generated`);
  }

  async getDescription() {
    return this.description;
  }

  async getFiles() {
    return this.artifacts.map(artifact => `${artifact.fileName}: ${artifact.description}`);
  }
}