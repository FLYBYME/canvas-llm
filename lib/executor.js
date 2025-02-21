import { exec } from 'child_process';

export class Executor {
    constructor(workspace) {
        this.workspace = workspace;
    }

    executeNode(artifact) {
        return new Promise((resolve, reject) => {
            exec(`node ${artifact.filePath}`, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    resolve({ stdout, stderr });
                }
            });
        });
    }
}