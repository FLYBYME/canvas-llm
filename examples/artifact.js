import { Artifact, Dependency, Change, Snippit } from '../lib/artifact.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, 'artifact.json');

async function exampleUsage() {
    // 1. Creating a new Artifact:
    const myArtifact = new Artifact({
        id: 'artifact-123',
        name: 'User Authentication Module',
        description: 'Handles user login and registration.',
        filePath: 'src/auth.js',
        language: 'javascript',
        content: `
      // ... code for user authentication ...
    `
    });

    // 2. Adding dependencies:
    myArtifact.addDependency({
        name: 'bcrypt',
        version: '^5.0.0',
        purpose: 'Password hashing',
        type: 'npm'
    });

    myArtifact.addDependency(new Dependency({  // Using the Dependency class directly
        name: 'jsonwebtoken',
        version: '^9.0.0',
        purpose: 'JWT generation',
        type: 'npm'
    }));


    // 3. Adding changes:
    myArtifact.addChange({
        author: 'John Doe',
        description: 'Implemented password reset functionality.',
        diff: '...', // You would put the actual diff here
        type: 'feature',
        status: 'completed'
    });

    myArtifact.addChange(new Change({ // Using the Change class directly
        author: "Jane Smith",
        description: "Fixed a bug in login",
        type: "bugfix",
        status: "completed"
    }));

    // 4. Adding snippets:
    const loginSnippet = new Snippit({
        code: `
      function login(username, password) {
        // ... login logic ...
      }
    `,
        description: 'Handles user login.',
        type: 'function',
        startLine: 10,
        endLine: 25,
        artifact: myArtifact.id
    });

    myArtifact.addSnippit(loginSnippet);



    const registerSnippet = new Snippit({
        code: `
            function registerUser(userData) {
                // ... registration logic ...
            }
        `,
        description: "Handles user registration",
        type: "function",
        startLine: 30,
        endLine: 45
    });

    registerSnippet.artifact = myArtifact.id; // Link snippet to the artifact

    myArtifact.addSnippit(registerSnippet);


    // 5. Saving to file:
    await myArtifact.saveToFile();
    console.log('Artifact saved.');

    // 6. Loading from file:
    const loadedArtifact = await Artifact.loadFromFile(myArtifact.filePath);
    console.log('Artifact loaded:', loadedArtifact.toJSON());

    // Accessing loaded data:
    console.log("Loaded Artifact Dependencies:", loadedArtifact.dependencies);
    console.log("Loaded Artifact Changes:", loadedArtifact.changes);
    console.log("Loaded Artifact Snippets:", loadedArtifact.snippits);

    // Accessing the linked artifact from a snippet:
    console.log("Snippet Artifact ID:", loadedArtifact.snippits[0].artifact); // Accessing the artifact from a snippet

    //Demonstrating Dependency JSON and fromJSON
    const dependencyJson = new Dependency({ name: "test", version: "1.0.0" }).toJSON();
    const dependency = Dependency.fromJSON(dependencyJson);
    console.log("Dependency fromJSON:", dependency);

    const changeJson = new Change({ author: "test", description: "test" }).toJSON();
    const change = Change.fromJSON(changeJson);
    console.log("Change fromJSON:", change);

    const snippetJson = new Snippit({ code: "// test code", description: "test snippet" }).toJSON();
    const snippet = Snippit.fromJSON(snippetJson);
    console.log("Snippet fromJSON:", snippet);

}


// Example of adding existing Artifact to Snippet
async function exampleUsage2() {
    const existingArtifact = await Artifact.loadFromFile('src/auth.js');
    const newSnippet = new Snippit({
        code: "// some new code",
        description: "new snippet referencing an existing artifact",
        artifact: existingArtifact // Directly assign the existing artifact
    });

    console.log("New Snippet with existing artifact:", newSnippet.toJSON());
}


exampleUsage()
    .then(() => console.log("Example usage completed."))
    .catch(error => console.error("Example usage failed:", error))
    .then(() => exampleUsage2())
    .then(() => console.log("Example usage 2 completed."))
    .catch(error => console.error("Example usage 2 failed:", error));