import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

// **CodeStructure** refers to a comprehensive description of the current code structure related to the task, including information about the architecture, modules, dependencies, and key components.

/**
 * A **CodeStructure** describes the current code structure related to the task, including information about the architecture, modules, dependencies, and key components.
 * 
 * @typedef {Object} CodeStructure
 * @property {string} id - The unique identifier for the code structure.
 * @property {string} title - The title or name of the code structure.
 * @property {string} description - A detailed description of the code structure.
 * @property {Array.<Artifact>} artifacts - An array of artifacts associated with the code structure.
 * @property {string} architecture - A description of the overall architecture of the codebase.
 * @property {Array.<Module>} modules - A list of modules within the codebase, including their descriptions and relationships.
 * @property {Array.<Dependency>} dependencies - A list of dependencies used in the codebase, including their versions and purposes.
 * @property {Array.<Component>} keyComponents - A list of key components within the codebase, including their roles and interactions.
 */

/**
 * A **Module** represents a distinct unit within the codebase with a specific responsibility.
 * 
 * @typedef {Object} Module
 * @property {string} id - The unique identifier for the module.
 * @property {string} name - The name of the module.
 * @property {string} description - A detailed description of the module's responsibility and functionality.
 * @property {Array.<string>} relationships - A list of other modules that this module interacts with.
 */

/**
 * A **Dependency** represents an external library or package used in the codebase.
 * 
 * @typedef {Object} Dependency
 * @property {string} name - The name of the dependency.
 * @property {string} version - The version of the dependency.
 * @property {string} purpose - A description of the purpose of the dependency within the codebase.
 */

/**
 * A **Component** represents a key part of the codebase with a significant role.
 * 
 * @typedef {Object} Component
 * @property {string} id - The unique identifier for the component.
 * @property {string} name - The name of the component.
 * @property {string} role - A description of the component's role within the codebase.
 * @property {Array.<string>} interactions - A list of other components or modules that this component interacts with.
 */

export default class CodeStructure {
    constructor(config) {
        this.id = config.id;
        this.title = config.title;
        this.description = config.description;
        this.artifacts = config.artifacts;
        this.architecture = config.architecture;
        this.modules = config.modules.map(module => new Module(module));
        this.dependencies = config.dependencies.map(dependency => new Dependency(dependency));
        this.keyComponents = config.keyComponents.map(component => new Component(component));
    }
}

class Module {
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.description = config.description;
        this.relationships = config.relationships;
    }
}

class Dependency {
    constructor(config) {
        this.name = config.name;
        this.version = config.version;
        this.purpose = config.purpose;
    }
}

class Component {
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.role = config.role;
        this.interactions = config.interactions;
    }
}