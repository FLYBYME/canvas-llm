import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

// **SuccessCriteria** refers to clear, measurable conditions that determine when the task is considered complete. This can include passing tests, code reviews, performance improvements, or specific functionality being achieved.

/**
 * A **SuccessCriteria** defines clear, measurable conditions that determine when the task is considered complete.
 * 
 * @typedef {Object} SuccessCriteria
 * @property {string} id - The unique identifier for the success criteria.
 * @property {string} title - The title or name of the success criteria.
 * @property {string} description - A detailed description of the success criteria.
 * @property {Array.<Artifact>} artifacts - An array of artifacts associated with the success criteria.
 * @property {Array.<Condition>} conditions - A list of conditions that need to be met for the task to be considered complete.
 */

/**
 * A **Condition** defines a specific measurable condition for success.
 * 
 * @typedef {Object} Condition
 * @property {string} id - The unique identifier for the condition.
 * @property {string} description - A detailed description of the condition.
 * @property {boolean} isMet - A flag indicating whether the condition has been met.
 */

export default class SuccessCriteria {
    constructor(config) {
        this.id = config.id;
        this.title = config.title;
        this.description = config.description;
        this.artifacts = config.artifacts;
        this.conditions = config.conditions.map(condition => new Condition(condition));
    }
}

class Condition {
    constructor(config) {
        this.id = config.id;
        this.description = config.description;
        this.isMet = config.isMet;
    }
}