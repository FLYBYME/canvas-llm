import fs from "fs/promises";
import path from "path";
import { EventEmitter } from "events";

class File {
    constructor(cwd, name, content) {
        this.cwd = cwd;
        this.name = name;
        this.content = content ?? "";
        this.revision = 0;
        this.history = [];
    }

    get filePath() {
        return path.join(this.cwd, this.name);
    }

    get historyPath() {
        return this.filePath + ".history";
    }

    async saveFile(content) {
        try {
            await fs.writeFile(this.filePath, content, "utf8");
            this.revision++;
            this.history.push([this.revision, content]);
            await fs.writeFile(this.historyPath, JSON.stringify(this.history), "utf8");
        } catch (error) {
            console.error(`Error saving file ${this.name}:`, error);
        }
    }

    async loadFile() {
        try {
            this.content = await fs.readFile(this.filePath, "utf8");
        } catch (error) {
            if (error.code !== "ENOENT") console.error(`Error loading file ${this.name}:`, error);
            this.content = "";
        }
        this.history = [];
        this.revision = 0;
        try {
            const fileHistoryContent = await fs.readFile(this.historyPath, "utf8");
            this.history = JSON.parse(fileHistoryContent);
            this.revision = this.history.length ? this.history[this.history.length - 1][0] : 0;
        } catch (error) {
            if (error.code !== "ENOENT") console.error(`Error loading history for ${this.name}:`, error);
        }
    }

    async deleteFile() {
        try {
            await fs.unlink(this.filePath);
            await fs.unlink(this.historyPath);
        } catch (error) {
            if (error.code !== "ENOENT") console.error(`Error deleting file ${this.name}:`, error);
        }
        this.content = "";
        this.history = [];
        this.revision = 0;
    }

    async restoreFile(revision) {
        const selectedRevision = this.history.find((r) => r[0] === revision);
        if (selectedRevision) {
            this.content = selectedRevision[1];
            await this.saveFile(this.content);
        } else {
            console.warn(`Revision ${revision} not found for file ${this.name}`);
        }
    }
}

export default class Codebox extends EventEmitter {
    constructor(cwd = "./") {
        super();
        this.cwd = cwd;
        this.files = {};
    }

    async addFile(name, content = "") {
        if (this.files[name]) {
            console.warn(`File ${name} already exists in Codebox.`);
            return;
        }
        const file = new File(this.cwd, name, content);
        await file.saveFile(content);
        this.files[name] = file;
        this.emit("fileAdded", name);
    }

    async loadFile(name) {
        if (!this.files[name]) {
            this.files[name] = new File(this.cwd, name);
        }
        await this.files[name].loadFile();
        this.emit("fileLoaded", name);
    }

    async saveFile(name, content) {
        if (this.files[name]) {
            await this.files[name].saveFile(content);
            this.emit("fileSaved", name);
        } else {
            console.warn(`Cannot save. File ${name} does not exist in Codebox.`);
        }
    }

    async deleteFile(name) {
        if (this.files[name]) {
            await this.files[name].deleteFile();
            delete this.files[name];
            this.emit("fileDeleted", name);
        } else {
            console.warn(`Cannot delete. File ${name} does not exist in Codebox.`);
        }
    }

    async restoreFile(name, revision) {
        if (this.files[name]) {
            await this.files[name].restoreFile(revision);
            this.emit("fileRestored", name, revision);
        } else {
            console.warn(`Cannot restore. File ${name} does not exist in Codebox.`);
        }
    }

    async listFiles() {
        try {
            const files = await fs.readdir(this.cwd);
            return files.filter(file => !file.endsWith(".history"));
        } catch (error) {
            console.error("Error listing files in Codebox:", error);
            return [];
        }
    }
}
