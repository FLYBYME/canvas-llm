import { small, large } from "../model.js";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

// A **Task** in this context refers to a unit of work that requires analysis, planning, 
// and implementation within the software development workflow. Tasks can originate from various sources, such as:  
// 1. **GitHub Issues** – Addressing bug reports, feature requests, or code improvements.  
// 2. **Codebase Enhancements** – Refactoring, optimizing, or extending existing functionality.  
// 3. **Documentation Updates** – Improving or adding documentation for clarity and maintainability.  
// 4. **Testing and Validation** – Writing or updating tests to ensure software correctness.  
// Each Task follows a structured workflow:  
// 1. **Initiation** – The system gathers contextual information, such as related discussions, repository history, and current behavior.  
// 2. **Specification** – The existing and desired functionality are outlined to define success criteria.  
// 3. **Planning** – A step-by-step action plan is created, listing affected files and necessary modifications.  
// 4. **Implementation** – Code changes are generated and reviewed in an editable diff view.  
// 5. **Validation** – The integrated terminal allows testing, building, and linting to ensure quality and correctness.  
// 6. **Completion** – The task is marked as completed when all necessary changes are implemented and validated.

/**
 * An **Task** is a unit of work that requires analysis, planning, and implementation within the software development workflow.
 * 
 * @typedef {Object} Task
 * @property {string} id - A unique identifier for the task.
 * @property {string} title - The title or name of the task.
 * @property {string} description - A detailed description of the task.
 * @property {Array.<Artifact>} artifacts - An array of artifacts associated with the task.
 * @property {Specification} specification - The specification of the task.
 * @property {Plan} plan - The plan for the task.
 * @property {Implementation} implementation - The implementation of the task.
 * @property {Validation} validation - The validation of the task.
 * @property {Completion} completion - The completion of the task.
 */
export default class Task {
    constructor(config) {
        this.id = config.id;
        this.title = config.title;
        this.description = config.description;
        this.artifacts = config.artifacts;
        this.specification = config.specification;
        this.plan = config.plan;
        this.implementation = config.implementation;
        this.validation = config.validation;
        this.completion = config.completion;
    }
}
