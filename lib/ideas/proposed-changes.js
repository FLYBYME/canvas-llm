import { small, large } from "../model.js";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

// **ProposedChanges** refers to a detailed outline of the desired modifications, including what should be added, removed, or modified in the codebase.

/**
 * A **ProposedChanges** outlines the desired modifications, including what should be added, removed, or modified in the codebase.
 * 
 * @typedef {Object} ProposedChanges
 * @property {string} id - The unique identifier for the proposed changes.
 * @property {string} title - The title or name of the proposed changes.
 * @property {string} description - A detailed description of the proposed changes.
 * @property {Array.<Artifact>} artifacts - An array of artifacts associated with the proposed changes.
 * @property {Array.<Modification>} modifications - A list of modifications to be made.
 */

/**
 * A **Modification** defines a specific change to be made to the codebase.
 * 
 * @typedef {Object} Modification
 * @property {string} id - The unique identifier for the modification.
 * @property {string} description - A detailed description of the modification.
 * @property {string} type - The type of modification (e.g., addition, removal, update).
 */

export default class ProposedChanges {
    constructor(config) {
        this.id = config.id;
        this.title = config.title;
        this.description = config.description;
        this.artifacts = config.artifacts;
        this.modifications = config.modifications.map(modification => new Modification(modification));
    }
}

class Modification {
    constructor(config) {
        this.id = config.id;
        this.description = config.description;
        this.type = config.type;
    }
}