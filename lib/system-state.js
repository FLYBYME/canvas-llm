import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

// **SystemState** refers to a comprehensive description of the current system state related to the task, including information about the environment, configurations, runtime conditions, and any known issues.

/**
 * A **SystemState** describes the current system state related to the task, including information about the environment, configurations, runtime conditions, and any known issues.
 * 
 * @typedef {Object} SystemState
 * @property {string} id - The unique identifier for the system state.
 * @property {string} title - The title or name of the system state.
 * @property {string} description - A detailed description of the system state.
 * @property {Array.<Artifact>} artifacts - An array of artifacts associated with the system state.
 * @property {string} environment - A description of the environment in which the system is running (e.g., development, staging, production).
 * @property {Array.<Configuration>} configurations - A list of configurations currently applied to the system.
 * @property {Array.<RuntimeCondition>} runtimeConditions - A list of runtime conditions affecting the system's behavior.
 * @property {Array.<KnownIssue>} knownIssues - A list of known issues or limitations within the current system state.
 */

/**
 * A **Configuration** represents a specific configuration setting applied to the system.
 * 
 * @typedef {Object} Configuration
 * @property {string} key - The configuration key.
 * @property {string} value - The configuration value.
 * @property {string} description - A description of the configuration setting.
 */

/**
 * A **RuntimeCondition** represents a specific runtime condition affecting the system's behavior.
 * 
 * @typedef {Object} RuntimeCondition
 * @property {string} id - The unique identifier for the runtime condition.
 * @property {string} description - A detailed description of the runtime condition.
 * @property {boolean} isActive - A flag indicating whether the runtime condition is currently active.
 */

/**
 * A **KnownIssue** represents a known issue or limitation within the current system state.
 * 
 * @typedef {Object} KnownIssue
 * @property {string} id - The unique identifier for the known issue.
 * @property {string} description - A detailed description of the known issue.
 * @property {string} impact - A description of the impact of the known issue on the system.
 */

export default class SystemState {
    constructor(config) {
        this.id = config.id;
        this.title = config.title;
        this.description = config.description;
        this.artifacts = config.artifacts;
        this.environment = config.environment;
        this.configurations = config.configurations.map(configuration => new Configuration(configuration));
        this.runtimeConditions = config.runtimeConditions.map(runtimeCondition => new RuntimeCondition(runtimeCondition));
        this.knownIssues = config.knownIssues.map(knownIssue => new KnownIssue(knownIssue));
    }
}

class Configuration {
    constructor(config) {
        this.key = config.key;
        this.value = config.value;
        this.description = config.description;
    }
}

class RuntimeCondition {
    constructor(config) {
        this.id = config.id;
        this.description = config.description;
        this.isActive = config.isActive;
    }
}

class KnownIssue {
    constructor(config) {
        this.id = config.id;
        this.description = config.description;
        this.impact = config.impact;
    }
}