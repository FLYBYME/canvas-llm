import Conversation from '../lib/conversation';
import { ChatOpenAI } from "@langchain/openai";

jest.mock("@langchain/openai");

describe('Conversation', () => {
    let conversation;

    beforeEach(() => {
        conversation = new Conversation('test-id');
    });

    test('should initialize with given id', () => {
        expect(conversation.id).toBe('test-id');
    });

    test('should add messages correctly', () => {
        conversation.addMessage('human', 'Hello');
        conversation.addMessage('ai', 'Hi there');
        expect(conversation.messages).toEqual([
            { role: 'human', content: 'Hello' },
            { role: 'ai', content: 'Hi there' }
        ]);
    });

    test('should clear messages', () => {
        conversation.addMessage('human', 'Hello');
        conversation.clearMessages();
        expect(conversation.messages).toEqual([]);
    });

    test('should format messages correctly', () => {
        conversation.addMessage('human', 'Hello');
        conversation.addMessage('ai', 'Hi there');
        const formattedMessages = conversation.getFormattedMessages();
        expect(formattedMessages).toEqual([
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there' }
        ]);
    });

    test('should convert to JSON correctly', () => {
        conversation.addMessage('human', 'Hello');
        const json = conversation.toJSON();
        expect(json).toEqual({
            id: 'test-id',
            messages: [{ role: 'human', content: 'Hello' }],
            reflection: conversation.reflection.toJSON()
        });
    });

    test('should restore from JSON correctly', () => {
        const json = {
            id: 'test-id',
            messages: [{ role: 'human', content: 'Hello' }],
            reflection: conversation.reflection.toJSON()
        };
        conversation.restoreFromJSON(json);
        expect(conversation.id).toBe('test-id');
        expect(conversation.messages).toEqual([{ role: 'human', content: 'Hello' }]);
        expect(conversation.reflection.toJSON()).toEqual(json.reflection);
    });

    test('should get reflections correctly', () => {
        const reflections = conversation.getReflections();
        expect(reflections).toEqual(conversation.reflection.getFormattedReflections());
    });
});