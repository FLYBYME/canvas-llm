
import "./env.js";
import Artifact from "./lib/artifact.js";
import Workspace from "./lib/workspace.js";
import exspress from "express";
import http from "http";
import bodyParser from "body-parser";
import { v4 as uuidv4 } from 'uuid';
import path from "path";
import fs from "fs/promises";


const app = exspress();
const server = http.createServer(app);

// Add headers before the routes are defined
app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

app.use(bodyParser.json());

// logger
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

const port = process.env.PORT || 3000;
const WORKSPACES_CWD = process.env.WORKSPACES_CWD || './workspaces';

await fs.mkdir(WORKSPACES_CWD, { recursive: true });

const workspaces = new Map();

// load all workspaces
for (const file of await fs.readdir(WORKSPACES_CWD, { withFileTypes: true })) {
    if (file.isDirectory()) {
        const workspace = new Workspace({ id: uuidv4(), cwd: path.join(WORKSPACES_CWD, file.name) });
        await workspace.init();
        console.log(`Loaded workspace: ${workspace.cwd} ${workspace.id}`);
        workspaces.set(workspace.id, workspace);
    }
}

app.get("/workspaces", (req, res) => {
    res.json([...workspaces.values()].map((workspace) => workspace.toJSON()));
});

app.post("/workspaces", async (req, res) => {
    const { cwd } = req.body;

    const requestDir = path.join(WORKSPACES_CWD, cwd);

    // search for existing workspace
    for (const [id, workspace] of workspaces) {
        if (workspace.cwd === requestDir) {
            res.json(workspace.toJSON());
            return;
        }
    }

    const id = uuidv4();

    const workspace = new Workspace({ id, cwd: requestDir });
    await workspace.init();
    workspaces.set(id, workspace);


    res.json(workspace.toJSON());
});

app.get("/workspaces/:id", (req, res) => {
    const workspace = workspaces.get(req.params.id);
    if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
    }
    res.json(workspace.toJSON());
});

app.post("/workspaces/:id/messages", async (req, res) => {
    const workspace = workspaces.get(req.params.id);
    if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
    }
    const response = await workspace.chat(req.body.content);
    res.json(response);
});

app.delete("/workspaces/:id/messages", async (req, res) => {
    const workspace = workspaces.get(req.params.id);
    if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
    }
    await workspace.clearMessages();
    res.json({ success: true });
});

app.get("/workspaces/:id/artifacts", async (req, res) => {
    const workspace = workspaces.get(req.params.id);
    if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
    }
    const artifacts = await workspace.getArtifacts();
    res.json(artifacts.map((artifact) => artifact.toJSON()));
});

app.get("/workspaces/:id/artifacts/:artifact", async (req, res) => {
    const workspace = workspaces.get(req.params.id);
    if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
    }
    const artifact = await workspace.getArtifactByID(req.params.artifact);
    res.json(artifact.toJSON());
});

app.post("/workspaces/:id/artifacts/:artifact/messages", async (req, res) => {
    const workspace = workspaces.get(req.params.id);
    if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
    }
    const artifact = await workspace.getArtifactByID(req.params.artifact);
    if (!artifact) {
        res.status(404).json({ error: "Artifact not found" });
        return;
    }
    console.log(req.body)
    const response = await artifact.chat(req.body.content);
    res.json(response);
});

app.delete("/workspaces/:id/artifacts/:artifact/messages", async (req, res) => {
    const workspace = workspaces.get(req.params.id);
    if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
    }
    const artifact = await workspace.getArtifactByID(req.params.artifact);
    if (!artifact) {
        res.status(404).json({ error: "Artifact not found" });
        return;
    }
    await artifact.clearMessages();
    res.json(artifact.toJSON());
});


app.put("/workspaces/:id/artifacts/:artifact/save-content", async (req, res) => {
    const workspace = workspaces.get(req.params.id);
    if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
    }
    const artifact = await workspace.getArtifactByID(req.params.artifact);
    if (!artifact) {
        res.status(404).json({ error: "Artifact not found" });
        return;
    }
    console.log(req.body)
    await artifact.saveContent(req.body.content);
    res.json(artifact.toJSON());
});


app.post("/workspaces/:id/artifacts/:artifact/generate-file-tasks", async (req, res) => {
    const workspace = workspaces.get(req.params.id);
    if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
    }
    const artifact = await workspace.getArtifactByID(req.params.artifact);
    if (!artifact) {
        res.status(404).json({ error: "Artifact not found" });
        return;
    }
    const tasks = await artifact.generateFileTasks(req.body.title, req.body.description, req.body.files);
    res.json(tasks);
});


app.post("/workspaces/:id/artifacts/:artifact/questions", async (req, res) => {
    const workspace = workspaces.get(req.params.id);
    if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
    }
    const artifact = await workspace.getArtifactByID(req.params.artifact);
    if (!artifact) {
        res.status(404).json({ error: "Artifact not found" });
        return;
    }
    const questions = await artifact.getSuggestedQuestions();
    res.json(questions);
});


app.post("/workspaces/:id/artifacts/:artifact/reflections", async (req, res) => {
    const workspace = workspaces.get(req.params.id);
    if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
    }
    const artifact = await workspace.getArtifactByID(req.params.artifact);
    if (!artifact) {
        res.status(404).json({ error: "Artifact not found" });
        return;
    }
    await artifact.generateReflections();
    res.json(artifact.toJSON());
});


app.post("/workspaces/:id/artifacts/:artifact/find-bugs", async (req, res) => {
    const workspace = workspaces.get(req.params.id);
    if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
    }
    const artifact = await workspace.getArtifactByID(req.params.artifact);
    if (!artifact) {
        res.status(404).json({ error: "Artifact not found" });
        return;
    }
    const result = await artifact.findBugs();
    res.json(result);
});

app.delete("/workspaces/:id/artifacts/:artifact/clear-bugs", async (req, res) => {
    const workspace = workspaces.get(req.params.id);
    if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
    }
    const artifact = await workspace.getArtifactByID(req.params.artifact);
    if (!artifact) {
        res.status(404).json({ error: "Artifact not found" });
        return;
    }
    const result = await artifact.clearBugs();
    res.json(result);
});


server.listen(port, () => console.log(`Listening on port http://localhost:${port}`));
