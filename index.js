import "./env.js";
import Artifact from "./lib/artifact.js";
import Workspace from "./lib/workspace.js";


const workspace = new Workspace({
    id: "workspace-123",
    cwd: "./workspace",
});

async function createSnakeGame() {
    const htmlArtifact = await workspace.getArtifact("snake.html");
    const jsArtifact = await workspace.getArtifact("snake.js");
    const cssArtifact = await workspace.getArtifact("snake.css");

    workspace.generateFileTasks(
        "Snake Game",
        "Create a simple snake game using HTML canvas",
        [
            htmlArtifact,
            jsArtifact,
            cssArtifact
        ]
    ).then(async ({ tasks }) => {

        console.log("File tasks generated.");
        console.log(tasks);

        for (const task of tasks) {
            await workspace.performTask(task);
        }

        console.log("Tasks performed.");

    });

}

workspace.init().then(async () => {
    console.log("Workspace initialized.", workspace);

    await workspace.getSuggestedQuestions()
        .then(async (suggestedQuestions) => {
            console.log("Suggested questions:", suggestedQuestions);
        });


}).catch((error) => console.error(error));