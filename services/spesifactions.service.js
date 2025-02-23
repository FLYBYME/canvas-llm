"use strict";

const DbService = require("@moleculer/database").Service;

// **Specification** refers to a detailed description of the task's context, current state, and proposed changes within the software system. It serves as a blueprint that outlines the desired outcomes and provides clear success criteria. The Specification typically includes:
// 1. **Current Behavior**: A description of the existing functionality, system state, or code structure related to the task. This helps to understand how the system currently works and where improvements or changes are necessary.
// 2. **Proposed Changes**: A detailed outline of the desired modifications, including what should be added, removed, or modified in the codebase. This section clarifies the goals and defines what success looks like for the task.
// 3. **Impact Analysis**: Identifying how the proposed changes will affect the system, including potential side effects, dependencies, and interactions with other components.
// 4. **Success Criteria**: Clear, measurable conditions that determine when the task is considered complete. This can include passing tests, code reviews, performance improvements, or specific functionality being achieved.
// The **Specification** ensures alignment between the development team and stakeholders, providing a concrete understanding of what needs to be done and how success will be measured.

/**
 * Spesifactions service
 */
module.exports = {
    name: "specifications",
    version: 1,

    mixins: [
        DbService({
            adapter: {
                type: "NeDB",
                options: "./db/spesifactions.db"
            }
        })
    ],

    /**
     * Service dependencies
     */
    dependencies: [],

    /**
     * Service settings
     */
    settings: {
        rest: "/v1/spesifactions",

        fields: {
            title: {
                type: "string",
                required: true,
                trim: true
            },
            description: {
                type: "string",
                required: true,
                trim: true
            },
            
            currentBehavior: {
                type: "object",
                items: {
                    summary: { type: "string", required: true, trim: true },
                    details: { type: "string", required: true, trim: true }
                },
                default: {},
                required: false
            },
            proposedChanges: {
                type: "object",
                items: {
                    summary: { type: "string", required: true, trim: true },
                    details: { type: "string", required: true, trim: true }
                },
                default: {},
                required: false
            },
            impactAnalysis: {
                type: "object",
                items: {
                    summary: { type: "string", required: true, trim: true },
                    details: { type: "string", required: true, trim: true },
                    // Optional: a list of dependencies or affected components
                    dependencies: {
                        type: "array",
                        items: "string",
                        default: [],
                        required: false
                    }
                },
                default: {},
                required: false
            },
            successCriteria: {
                type: "object",
                items: {
                    // An array of clear and measurable criteria
                    criteria: { type: "array", items: "string", required: true },
                    // Additional notes if needed
                    notes: { type: "string", default: "", trim: true }
                },
                default: {},
                required: false
            },
            tags: {
                type: "array",
                items: "string",
                default: [],
                required: false
            },

            id: {
                type: "string",
                primaryKey: true,
                secure: true,
                columnName: "_id"
            },
            createdAt: {
                type: "number",
                readonly: true,
                onCreate: () => Date.now(),
            },
            updatedAt: {
                type: "number",
                readonly: true,
                onUpdate: () => Date.now(),
            },
            deletedAt: {
                type: "number",
                readonly: true,
                hidden: "byDefault",
                onRemove: () => Date.now(),
            }
        },

        indexes: [],

        defaultPopulates: [],

        scopes: {
            notDeleted: { deletedAt: null }
        },

        defaultScopes: [
            'notDeleted'
        ],

        // default init config settings
        config: {}
    },

    /**
     * Actions
     */
    actions: {
        // Define actions here if needed
    },

    /**
     * Events
     */
    events: {},

    /**
     * Methods
     */
    methods: {},

    /**
     * Service created lifecycle event handler
     */
    created() { },

    /**
     * Service started lifecycle event handler
     */
    async started() { },

    /**
     * Service stopped lifecycle event handler
     */
    async stopped() { }
};
