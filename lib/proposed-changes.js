

// ProposedChanges
// This should outline the specific modifications to be made. It includes what new features or fixes will be added, what will be removed, and what will be altered.

/**
 * @typedef {Object} ProposedChanges
 * @property {string} id - The unique identifier for the proposed changes.
 * @property {string} title - The title or name of the proposed changes.
 * @property {string} description - A detailed description of the proposed changes.
 * @property {Array.<Artifact>} artifacts - An array of artifacts associated with the proposed changes.
 * @property {Array.<Change>} changes - An array of changes that will be made to the system or code.
 * @property {Array.<Risk>} risks - An array of potential risks associated with the proposed changes.
 * @property {Array.<Dependency>} dependencies - An array of dependencies or external factors that may affect the proposed changes.
 * @property {Array.<Behavior>} behaviors - An array of behaviors that will be affected by the proposed changes.
 * 
 */
export default class ProposedChanges {
    constructor(config) {
        this.id = config.id;
        this.title = config.title;
        this.description = config.description;
        this.artifacts = config.artifacts;
        this.changes = config.changes;
        this.risks = config.risks;
        this.dependencies = config.dependencies;
        this.behaviors = config.behaviors;
    }
}