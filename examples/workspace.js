import { Workspace } from "../lib/workspace.js";
import { Artifact, Dependency, Change, Snippit } from "../lib/artifact.js";
import "../env.js"

import { generateNewArtifact, updateEntireArtifact } from "../lib/helpers/artifact.js";

import { generateNewDocument } from "../lib/helpers/contect-document.js"


const workspaceConfig = {
    id: "workspace-1",
    name: "My Workspace",
    path: "./workspace",
    description: "This is a description",
};

const workspace = new Workspace(workspaceConfig);

await workspace.initialize();

await workspace.writeArtifactsToSource();

const artifact = await workspace.getArtifactById("55cae7f8-48c2-49f4-867d-c70e19b1c91d");

const GenerateContextDocument = async (artifact) => {


    const newArtifactSource = await generateNewDocument(artifact);

    console.log(newArtifactSource);

    const newArtifact = await workspace.createArtifact({
        title: newArtifactSource.title,
        description: newArtifactSource.title,
        type: newArtifactSource.type,
        content: newArtifactSource.artifact,
        language: newArtifactSource.language,
        fileName: newArtifactSource.filename,
        filePath: newArtifactSource.filename
    });

    console.log(newArtifact);

    return newArtifact;
}