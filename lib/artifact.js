
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

import { generateThreadTitle } from "./helpers/thread-title.js";
import { artifactMetaPrompt } from "./helpers/artifact-meta.js";
import { analyzeArtifactDependencies } from "./helpers/artifact-dependencies.js";
import { analyzeArtifactSnippits } from "./helpers/artifact-snippit.js";
import { PROGRAMMING_LANGUAGES } from "./constants.js";

// **Artifact** refers to a piece of data or document that is produced or used during the development process, including information related to a file and additional metadata.

/**
 * An **Artifact** represents a piece of data or document that is produced or used during the development process, including information related to a file and additional metadata.
 * 
 * @typedef {Object} Artifact
 * @property {string} id - The unique identifier for the artifact.
 * @property {string} title - The title of the artifact.
 * @property {string} description - A description of the artifact.
 * @property {string} filePath - The file path of the artifact.
 */


export const getLanguage = (fileName) => {
  const extension = path.extname(fileName);
  const language = PROGRAMMING_LANGUAGES.find((lang) => extension === `.${lang.extension}`);
  return language ? language.language : "other";
}

export class Artifact {
  constructor(config) {
    this.id = config.id || uuidv4();
    this.title = config.title;
    this.description = config.description;
    this.fileName = config.fileName;
    this.filePath = config.filePath;
    this.language = config.language || "javascript";
    this.type = config.type || "text";
    this.dependencies = config.dependencies || [];
    this.changes = config.changes || [];
    this.snippits = config.snippits || [];
    this.content = config.content || "";
    this.contextDocuments = config.contextDocuments || [];
    this.document = config.document || false;
    this.documentation = config.documentation || null;
    this.summary = config.summary || null;

    this.workspace = config.workspace;
  }

  async setWorkspace(workspace) {
    this.workspace = workspace;
  }

  // Method to add a dependency to the artifact
  addDependency(dependency) {
    if (!(dependency instanceof Dependency)) {
      dependency = new Dependency(dependency);
    }
    this.dependencies.push(dependency);
  }

  // Method to add a change to the artifact
  addChange(change) {
    if (!(change instanceof Change)) {
      change = new Change(change);
    }
    this.changes.push(change);
  }

  // Method to add a snippit to the artifact
  addSnippit(snippit) {
    if (!(snippit instanceof Snippit)) {
      snippit = new Snippit({ ...snippit, artifact: this.id });
    }
    this.snippits.push(snippit);
  }

  // Method to add a context document to the artifact
  addContextDocument(document) {
    if (typeof document === "string") {
      document = { type: "text", content: document };
    }
    this.contextDocuments.push(document);
  }

  // Method to get the artifact's metadata
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      fileName: this.fileName,
      filePath: this.filePath,
      language: this.language,
      type: this.type,
      dependencies: this.dependencies.map(dependency => dependency.toJSON()),
      changes: this.changes.map(change => change.toJSON()),
      snippits: this.snippits.map(snippit => snippit.toJSON()),
      content: this.content,
      contextDocuments: this.contextDocuments,
      summary: this.summary,
      document: this.document,
      documentation: this.documentation
    };
  }

  // Method to save the artifact to a file
  async saveToFile() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const data = JSON.stringify(this.toJSON(), null, 2);
    await fs.writeFile(this.filePath, data, 'utf8');
  }

  // Method to load the artifact from a file
  static async loadFromFile(filePath) {
    const data = await fs.readFile(filePath, 'utf8');
    const config = JSON.parse(data);

    // Load dependencies
    config.dependencies = config.dependencies.map(dependency => new Dependency(dependency));

    // Load changes
    config.changes = config.changes.map(change => new Change(change));

    // Load snippits
    config.snippits = config.snippits.map(snippit => new Snippit(snippit));

    // Load context documents
    config.contextDocuments = config.contextDocuments.map(document => ({
      type: document.type,
      content: document.content
    }));

    return new Artifact(config);
  }

  getFormattedContent(short = false) {
    return `Title: ${this.title}\n\nDescription: ${this.description}\n\nFile Path: ${this.fileName}\n\n<content> ${short ? this.content.substring(0, 500) : this.content}</content>`;
  }

  getContent(short = false) {
    return short ? this.content.substring(0, 500) : this.content;
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

  async updateMetadata(conversation) {
    const metadata = await artifactMetaPrompt(this, conversation);
    this.title = metadata.title;
    this.type = metadata.type;
    this.language = getLanguage(this.fileName);
    this.description = metadata.description;
    console.log(`Metadata updated for artifact ${this.fileName}, title: ${this.title}, type: ${this.type}, language: ${this.language}`);
    return {
      title: this.title,
      type: this.type,
      language: this.language,
      description: this.description
    };
  }

  async updateDependencies(conversation) {
    const { dependencies } = await analyzeArtifactDependencies(this, conversation);
    this.dependencies = dependencies.map(dependency => new Dependency(dependency));
    return dependencies;
  }

  async updateSnippits(conversation) {
    console.log(`Updating snippits for artifact ${this.fileName}`);
    const { snippits } = await analyzeArtifactSnippits(this, conversation);
    this.snippits = snippits.map(snippit => new Snippit(snippit));
    return snippits;
  }
}




export class Dependency {
  constructor(config) {
    this.name = config.name || "";
    this.purpose = config.purpose || "";
    this.type = config.type || "package";
    this.snippits = config.snippits || [];
  }

  toJSON() {
    return {
      name: this.name,
      purpose: this.purpose,
      type: this.type,
      snippits: this.snippits
    };
  }

  static fromJSON(json) {
    return new Dependency(json);
  }

  getFormattedContent() {
    return `Name: ${this.name}\n\nPurpose: ${this.purpose}\n\nType: ${this.type}\n\nSnippits: ${this.snippits}`;
  }
}

export class Change {
  constructor(config) {
    this.timestamp = config.timestamp || new Date().toISOString();
    this.author = config.author || "unknown";
    this.description = config.description || "";
    this.diff = config.diff || "";
    this.type = config.type || "update";
    this.status = config.status || "pending";
  }

  toJSON() {
    return {
      timestamp: this.timestamp,
      author: this.author,
      description: this.description,
      diff: this.diff,
      type: this.type,
      status: this.status
    };
  }

  static fromJSON(json) {
    return new Change(json);
  }

  getFormattedContent() {
    return `Timestamp: ${this.timestamp}\n\nAuthor: ${this.author}\n\nDescription: ${this.description}\n\nDiff: ${this.diff}\n\nType: ${this.type}\n\nStatus: ${this.status}`;
  }
}

export class Snippit {
  constructor(config) {
    this.code = config.code || "";
    this.description = config.description || "";
    this.type = config.type || "function";
    this.status = config.status || "draft";
    this.startLine = config.startLine || 0;
    this.endLine = config.endLine || 0;
  }

  toJSON() {
    return {
      code: this.code,
      description: this.description,
      type: this.type,
      status: this.status,
      startLine: this.startLine,
      endLine: this.endLine
    };
  }

  static fromJSON(json) {
    return new Snippit(json);
  }

  getFormattedContent() {
    return `Code: ${this.code}\n\nDescription: ${this.description}\n\nType: ${this.type}\n\nStatus: ${this.status}\n\nStart Line: ${this.startLine}\n\nEnd Line: ${this.endLine}`;
  }
}