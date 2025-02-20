import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

// **CurrentBehavior** refers to a detailed description of the existing functionality, system state, or code structure related to the task.

/**
 * A **CurrentBehavior** describes the existing functionality, system state, or code structure related to the task.
 * 
 * @typedef {Object} CurrentBehavior
 * @property {string} id - The unique identifier for the current behavior.
 * @property {string} title - The title or name of the current behavior.
 * @property {string} description - A detailed description of the current behavior.
 * @property {Array.<Artifact>} artifacts - An array of artifacts associated with the current behavior.
 * @property {SystemState} systemState - A description of the current system state.
 * @property {CodeStructure} codeStructure - A description of the current code structure.
 */
export default class CurrentBehavior {
    constructor(config) {
        this.id = config.id;
        this.title = config.title;
        this.description = config.description;
        this.artifacts = config.artifacts;
        this.systemState = config.systemState;
        this.codeStructure = config.codeStructure;
    }
}