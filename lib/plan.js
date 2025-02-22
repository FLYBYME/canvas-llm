import { model } from "./model.js";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

import { getRelationToContext } from "./helpers/relation.js";

// A **Plan** refers to a detailed, actionable roadmap that outlines the steps required to implement the proposed changes described in the Specification. It provides a clear
//  path from the current state to the desired outcome, breaking down the task into smaller, manageable actions. The Plan typically includes:
// 1. **Tasks and Steps**: A step-by-step breakdown of what needs to be done. This includes specific actions, such as which files to modify, add, or remove, and any other 
// necessary development activities (e.g., refactoring, testing).
// 2. **File and Code Modifications**: A clear listing of the files that will be affected, along with what needs to be modified in each file. This helps developers focus on 
// the right areas of the codebase and ensures the changes are scoped appropriately.
// 3. **Dependencies and Interactions**: Identification of any related components or modules that need to be adjusted or updated to ensure the task's successful completion. 
// This section clarifies any potential risks or impacts across the codebase.
// 4. **Timeline and Milestones**: Estimated time frames for completing each step or task, including any key milestones that need to be achieved before proceeding with 
// further steps. 
// 5. **Testing and Validation**: Plans for testing and validating the changes, ensuring the task’s implementation meets the success criteria defined in the Specification.
// The **Plan** provides a clear, structured approach to implementing the Specification, ensuring that all necessary steps are accounted for and that the team knows what 
// to focus on at each stage.

export class Plan {
    constructor(config, workspace) {
        this.id = config.id;
        this.title = config.title;
        this.description = config.description;
        this.workspace = workspace;
        this.artifacts = [];
        this.specification = null
        this.tasks = [];

        this.status = "draft";

    }

    async collectArtifacts() {
        // Collect artifacts from the workspace and store them in the plan
        const artifacts = await this.workspace.getArtifacts();
        const conversation = {
            title: this.title,
            description: this.description,
        };

        console.log(`Collecting artifacts... ${artifacts.length}`);

        for (const artifact of artifacts) {
            const relation = await getRelationToContext(artifact, conversation);
            console.log(artifact.fileName, relation)
            if (relation.isRelated) {
                this.artifacts.push({
                    artifact: artifact,
                    relation: relation,
                });
            }
        }

        return this.artifacts;
    }

}
