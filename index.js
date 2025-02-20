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

    const tasks = await workspace.generateFileTasks(
        "Snake Game",
        "Create a simple snake game using HTML canvas",
        [
            htmlArtifact,
            jsArtifact,
            cssArtifact
        ]
    );

    console.log("File tasks generated.");
    console.log(tasks);

    const taskQueue = tasks.tasks.map((task) => ({
        ...task,
        id: task.filename,
        priority: task.priority || 0,
        status: 'pending',
        progress: 0,
        result: null
    }));

    await workspace.coordinateTasks(taskQueue)
        .then((taskResults) => {
            console.log("Tasks performed.");
            console.log(taskResults);
        });
}

workspace.init().then(async () => {
    console.log("Workspace initialized.", workspace);

    


}).catch((error) => console.error(error));
