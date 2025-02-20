import "./env.js";
import Artifact from "./lib/artifact.js";
import rl from "readline";
import Workspace from "./lib/workspace.js";
import { console } from "inspector";


const workspace = new Workspace({
    id: "workspace-123",
    cwd: "./workspace",
});


const rlInterface = rl.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
});

const commands = {
    "generate-recommendations": {
        command: "generate-recommendations",
        description: "Generate recommendations based on the user's query.",
        callback: async () => {
            process.stdout.write("Generating recommendations...");
            return workspace.generateRecommendations()
                .then(({ recommendations }) => {
                    process.stdout.write("Done.\n");
                    process.stdout.write(JSON.stringify(recommendations, null, 2));
                })
        }
    },
    "get-recommendations": {
        command: "get-recommendations",
        description: "Get recommendations based on the user's query.",
        callback: async () => {
            process.stdout.write("Getting recommendations...");
            const recommendations = workspace.recommendations;
            process.stdout.write("Done.\n");
            process.stdout.write(JSON.stringify(recommendations, null, 2));
        }
    },
    "perform-recommendations": {
        command: "perform-recommendations",
        description: "Perform recommendations based on the user's query.",
        callback: async () => {
            process.stdout.write("Performing recommendations...");
            const recommendations = workspace.recommendations;
            workspace.recommendations = [];

            for (const recommendation of recommendations) {
                await workspace.performTask(recommendation)
                    .then((task) => {
                        process.stdout.write("Done.\n");
                        process.stdout.write(JSON.stringify(task, null, 2));
                    })
            }

            process.stdout.write("Done.\n");

        }
    },
    "perform-task": {
        command: "perform-task",
        description: "Perform a task based on the user's query.",
        params: ["task"],
        callback: async (task) => {
            process.stdout.write("Performing task...");
            const recommendation = workspace.recommendations.find((r) => r.title === task);
            if (!recommendation) {
                throw new Error(`Task ${task} not found.`);
            }
            // remove the recommendation from the recommendations array
            workspace.recommendations = workspace.recommendations.filter((r) => r.title !== task);
            await workspace.performTask(recommendation)
                .then((task) => {
                    process.stdout.write("Done.\n");
                    process.stdout.write(JSON.stringify(task, null, 2));
                })
        }
    },
    "generate-reflect": {
        command: "generate-reflect",
        description: "Generate reflections based on the user's query.",
        callback: async () => {
            return workspace.generateReflection()
                .then(({ reflections }) => {
                    process.stdout.write("Done.\n");
                    process.stdout.write(JSON.stringify(reflections, null, 2));
                })
        }
    },
    "chat": {
        command: "chat",
        description: "Chat with the workspace.",
        callback: async (message) => {
            process.stdout.write("Chatting with workspace...");
            return workspace.generateFileTasks(message)
                .then(async ({ tasks }) => {
                    process.stdout.write("Done.\n");
                    process.stdout.write(JSON.stringify(tasks, null, 2));
                    process.stdout.write("Performing tasks...");
                    for (const task of tasks) {
                        process.stdout.write(`\nTask: ${JSON.stringify(task, null, 2)}\n`);
                        const response = await workspace.performTask(task);
                        process.stdout.write(`Response: ${JSON.stringify(response, null, 2)}\n`);
                        process.stdout.write("\n");
                    }
                })
        }
    },
    "question": {
        command: "question",
        description: "Ask a question to the workspace.",
        callback: async (question) => {
            process.stdout.write("Asking question to workspace...");
            return workspace.question(question)
                .then((response) => {
                    process.stdout.write("Done.\n");
                    process.stdout.write(response);
                    process.stdout.write("\n");
                })
        }
    },
    "bugs": {
        command: "bugs",
        description: "Find bugs in the workspace.",
        callback: async () => {
            process.stdout.write("Finding bugs in workspace...");
            return workspace.findBugs()
                .then((bugs) => {
                    process.stdout.write("Done.\n");
                    process.stdout.write(JSON.stringify(bugs, null, 2));
                })
        }
    }
};

async function question() {
    rlInterface.question('CMD:', async (line) => {
        process.stdout.write(`You entered: ${line}\n`);

        if (line === "exit") {
            rlInterface.close();
            return;
        } else if (line == 'help') {
            const helpText = Object.values(commands).map(({ command, description }) => `${command}: ${description}`).join("\n");
            process.stdout.write(`${helpText}\n`);
            question();
            return;
        }

        const [command, ...args] = line.split(" ");
        if (commands[command]) {
            await commands[command].callback(args.join(" ")).catch((error) => {
                process.stdout.write(`Error: ${error.stack}\n`);
            });
            question();
            return;
        }

        process.stdout.write(`Unknown command: ${command}\n`);

        question();
    });
}

workspace.init()
    .then(async () => {
        console.log("Workspace initialized.");
        question();
    })
    .catch((error) => console.error(error));