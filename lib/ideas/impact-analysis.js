import { small, large } from "../model.js";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

// **ImpactAnalysis** refers to identifying how the proposed changes will affect the system, including potential side effects, dependencies, and interactions with other components.

/**
 * An **ImpactAnalysis** identifies how the proposed changes will affect the system, including potential side effects, dependencies, and interactions with other components.
 * 
 * @typedef {Object} ImpactAnalysis
 * @property {string} id - The unique identifier for the impact analysis.
 * @property {string} title - The title or name of the impact analysis.
 * @property {string} description - A detailed description of the impact analysis.
 * @property {Array.<Artifact>} artifacts - An array of artifacts associated with the impact analysis.
 * @property {Array.<string>} affectedComponents - A list of components that are affected by the proposed changes.
 * @property {Array.<string>} dependencies - A list of dependencies that the proposed changes have.
 * @property {Array.<string>} sideEffects - A list of potential side effects caused by the proposed changes.
 */
export default class ImpactAnalysis {
    constructor(config) {
        this.id = config.id;
        this.title = config.title;
        this.description = config.description;
        this.artifacts = config.artifacts;
        this.affectedComponents = config.affectedComponents;
        this.dependencies = config.dependencies;
        this.sideEffects = config.sideEffects;
    }
}