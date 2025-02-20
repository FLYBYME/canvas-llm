import { ChatOpenAI } from "@langchain/openai";


export default class Conversation {
    constructor(id, participants = []) {
        this.id = id; // Unique identifier for the conversation.
        this.participants = participants; // Array of participants (e.g., names or user IDs).
        this.messages = []; // Array to store conversation messages.
    }

    toJSON() {
        return {
            id: this.id,
            participants: this.participants,
            messages: this.messages,
        };
    }

    clear() {
        this.messages = [];
    }

    chat(message){
        // this is the human chattings with the llm
        this.addMessage("human", message);

        // this is the response from the llm
        return this.generateResponse();
    }

    getRecentHumanMessages() {
        return this.messages.filter((message) => message.role === "human");
    }

    async generateResponse() {
        const model = new ChatOpenAI({ temperature: 0 });

        const response = await model.invoke(this.formatMessages());

        this.addMessage("assistant", response.content);

        return response.content;
    }

    formatMessages() {
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
        this.participants = json.participants;
        this.messages = json.messages;
    }
}