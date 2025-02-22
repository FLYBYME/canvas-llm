
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import Reflection from "./reflection.js";


export class Conversation {
    constructor(config) {
        this.id = config.id;
        this.messages = config.messages || [];
        this.reflection = Reflection.fromJSON(config.reflection);
    }

    toJSON() {
        return {
            id: this.id,
            messages: this.messages,
            reflection: this.reflection.toJSON(),
        };
    }

    clearMessages() {
        this.messages = [];
    }
    
    getFormattedMessages() {
        const messages = this.messages
            .map((message) => {
                return {
                    role: message.role === "human" ? "user" : "assistant",
                    content: message.content,
                };
            });

        return messages;
    }

    addMessage(role, content) {
        this.messages.push({ role, content });
    }

    restoreFromJSON(json) {
        this.id = json.id;
        this.messages = json.messages;
        this.reflection = Reflection.fromJSON(json.reflection);
    }

    getReflections() {
        return this.reflection.getFormattedReflections();
    }

    static fromJSON(json) {
        const conversation = new Conversation(json);
        return conversation;
    }
}