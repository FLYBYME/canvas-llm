

// CurrentBehavior
// This should describe the existing functionality, state, or structure of the system or code. It provides context about how the system works before the proposed changes are applied.

/**
 * @typedef {Object} CurrentBehavior
 * @property {string} id - A unique identifier for the current behavior.
 * @property {string} title - The title or name of the current behavior.
 * @property {string} description - A detailed description of the current behavior of the system or code.
 * @property {Array.<Artifact>} artifacts - An array of artifacts associated with the current behavior.
 * @property {Array.<Behavior>} behaviors - An array of strings that describe the current behavior of the system or code.
 * @property {Array.<Dependency>} dependencies - An array of strings that describe any dependencies or external factors that affect the current behavior.
 * @property {Array.<Risk>} risks - An array of strings that describe any potential risks associated with the current behavior.
 * 
 */
export default class CurrentBehavior {
    constructor(config) {
        this.description = config.description;
        this.artifacts = config.artifacts;
        this.behaviors = config.behaviors;
        this.dependencies = config.dependencies;
        this.risks = config.risks;
    }
}