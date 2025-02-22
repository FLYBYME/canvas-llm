import express from "express";
import { v4 as uuidv4 } from "uuid";
import Workspace from "../lib/workspace.js";

const router = express.Router();
const workspaces = new Map();

// Get all workspaces
router.get("/", async (req, res) => {
    res.json([...workspaces.values()].map((workspace) => workspace.toJSON()));
});

// Create a workspace
router.post("/", async (req, res) => {
    const { name, path, description } = req.body;

    if (!path) {
        return res.status(400).json({ error: "Missing path" });
    }

    const id = uuidv4();
    const workspace = new Workspace({ id, name, path, description });

    workspaces.set(id, workspace);
    await workspace.initialize();

    res.json(workspace.toJSON());
});

// Get a single workspace
router.get("/:workspaceId", async (req, res) => {
    const workspace = workspaces.get(req.params.workspaceId);
    if (!workspace) {
        return res.status(404).json({ error: "Workspace not found" });
    }
    res.json(workspace.toJSON());
});

// Get artifacts for a workspace
router.get("/:workspaceId/artifacts", async (req, res) => {
    const workspace = workspaces.get(req.params.workspaceId);
    if (!workspace) {
        return res.status(404).json({ error: "Workspace not found" });
    }
    res.json(workspace.artifacts.map((artifact) => artifact.toJSON()));
});

// Get a specific artifact
router.get("/:workspaceId/artifacts/:artifactId", async (req, res) => {
    const workspace = workspaces.get(req.params.workspaceId);
    if (!workspace) {
        return res.status(404).json({ error: "Workspace not found" });
    }

    const artifact = workspace.getArtifactById(req.params.artifactId);
    if (!artifact) {
        return res.status(404).json({ error: "Artifact not found" });
    }

    res.json(artifact.toJSON());
});

// Update a workspace's details
router.put("/:workspaceId", async (req, res) => {
    const workspace = workspaces.get(req.params.workspaceId);
    if (!workspace) {
        return res.status(404).json({ error: "Workspace not found" });
    }

    const { name, path, description } = req.body;
    workspace.name = name || workspace.name;
    workspace.path = path || workspace.path;
    workspace.description = description || workspace.description;

    await workspace.saveToFile();
    res.json(workspace.toJSON());
});

// Delete a workspace
router.delete("/:workspaceId", async (req, res) => {
    const workspace = workspaces.get(req.params.workspaceId);
    if (!workspace) {
        return res.status(404).json({ error: "Workspace not found" });
    }

    workspaces.delete(req.params.workspaceId);
    res.status(204).send();
});

// Initialize a workspace
router.post("/:workspaceId/init", async (req, res) => {
    const workspace = workspaces.get(req.params.workspaceId);
    if (!workspace) {
        return res.status(404).json({ error: "Workspace not found" });
    }

    await workspace.initialize();
    res.json(workspace.toJSON());
});

// Create a new artifact in a workspace
router.post("/:workspaceId/artifacts", async (req, res) => {
    const workspace = workspaces.get(req.params.workspaceId);
    if (!workspace) {
        return res.status(404).json({ error: "Workspace not found" });
    }

    const artifact = await workspace.createArtifact(req.body);
    res.json(artifact.toJSON());
});

// Delete an artifact from a workspace
router.delete("/:workspaceId/artifacts/:artifactId", async (req, res) => {
    const workspace = workspaces.get(req.params.workspaceId);
    if (!workspace) {
        return res.status(404).json({ error: "Workspace not found" });
    }

    const artifactIndex = workspace.artifacts.findIndex(artifact => artifact.id === req.params.artifactId);
    if (artifactIndex === -1) {
        return res.status(404).json({ error: "Artifact not found" });
    }

    workspace.artifacts.splice(artifactIndex, 1);
    await workspace.saveToFile();
    res.status(204).send();
});

// Get all context documents for a workspace
router.get("/:workspaceId/context-documents", async (req, res) => {
    const workspace = workspaces.get(req.params.workspaceId);
    if (!workspace) {
        return res.status(404).json({ error: "Workspace not found" });
    }

    res.json(workspace.contextDocuments.map(doc => doc.toJSON()));
});

// Add a new context document to a workspace
router.post("/:workspaceId/context-documents", async (req, res) => {
    const workspace = workspaces.get(req.params.workspaceId);
    if (!workspace) {
        return res.status(404).json({ error: "Workspace not found" });
    }

    const doc = await workspace.createArtifact({ ...req.body, document: true });
    res.json(doc.toJSON());
});

// Sync all artifacts in a workspace
router.post("/:workspaceId/sync", async (req, res) => {
    const workspace = workspaces.get(req.params.workspaceId);
    if (!workspace) {
        return res.status(404).json({ error: "Workspace not found" });
    }

    await workspace.syncWorkspace();
    res.json(workspace.toJSON());
});

// Generate documentation for all artifacts in a workspace
router.post("/:workspaceId/generate-docs", async (req, res) => {
    const workspace = workspaces.get(req.params.workspaceId);
    if (!workspace) {
        return res.status(404).json({ error: "Workspace not found" });
    }

    await workspace.generateDocumentation();
    res.json(workspace.toJSON());
});

export default router;
