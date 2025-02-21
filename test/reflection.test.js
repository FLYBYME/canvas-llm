import { Artifact, Dependency, Change, Snippit } from '../lib/artifact.js';
import fs from 'fs/promises';

jest.mock('fs/promises');

describe('Artifact', () => {
    let artifact;
    const config = {
        id: '1',
        name: 'Test Artifact',
        description: 'A test artifact',
        filePath: '/path/to/artifact',
        language: 'javascript',
        dependencies: [],
        changes: [],
        snippits: [],
        content: 'Sample content'
    };

    beforeEach(() => {
        artifact = new Artifact(config);
    });

    test('constructor should initialize properties correctly', () => {
        expect(artifact.id).toBe(config.id);
        expect(artifact.name).toBe(config.name);
        expect(artifact.description).toBe(config.description);
        expect(artifact.filePath).toBe(config.filePath);
        expect(artifact.language).toBe(config.language);
        expect(artifact.dependencies).toEqual(config.dependencies);
        expect(artifact.changes).toEqual(config.changes);
        expect(artifact.snippits).toEqual(config.snippits);
        expect(artifact.content).toBe(config.content);
    });

    test('addDependency should add a dependency', () => {
        const dependencyConfig = { name: 'dep1', version: '1.0.0', purpose: 'test', interactions: [], status: 'draft', type: 'package', snippits: [] };
        artifact.addDependency(dependencyConfig);
        expect(artifact.dependencies.length).toBe(1);
        expect(artifact.dependencies[0]).toBeInstanceOf(Dependency);
    });

    test('addChange should add a change', () => {
        const changeConfig = { timestamp: '2023-01-01', author: 'author', description: 'desc', diff: 'diff', type: 'addition', status: 'approved' };
        artifact.addChange(changeConfig);
        expect(artifact.changes.length).toBe(1);
        expect(artifact.changes[0]).toBeInstanceOf(Change);
    });

    test('addSnippit should add a snippit', () => {
        const snippitConfig = { code: 'code', artifact: artifact.id, description: 'desc', type: 'function', status: 'draft', startLine: 1, endLine: 10 };
        artifact.addSnippit(snippitConfig);
        expect(artifact.snippits.length).toBe(1);
        expect(artifact.snippits[0]).toBeInstanceOf(Snippit);
        expect(artifact.snippits[0].artifact).toBe(artifact.id);
    });

    test('toJSON should return correct JSON representation', () => {
        const dependencyConfig = { name: 'dep1', version: '1.0.0', purpose: 'test', interactions: [], status: 'draft', type: 'package', snippits: [] };
        artifact.addDependency(dependencyConfig);

        const changeConfig = { timestamp: '2023-01-01', author: 'author', description: 'desc', diff: 'diff', type: 'addition', status: 'approved' };
        artifact.addChange(changeConfig);

        const snippitConfig = { code: 'code', artifact: artifact.id, description: 'desc', type: 'function', status: 'draft', startLine: 1, endLine: 10 };
        artifact.addSnippit(snippitConfig);

        const json = artifact.toJSON();

        expect(json).toMatchObject({
            id: config.id,
            name: config.name,
            description: config.description,
            filePath: config.filePath,
            language: config.language,
            dependencies: [
                {
                    interactions: [],
                    name: "dep1",
                    purpose: "test",
                    snippits: [],
                    status: "draft",
                    type: "package",
                    version: "1.0.0",
                }
            ],
            changes: [
                {
                    author: "author",
                    description: "desc",
                    diff: "diff",
                    status: "approved",
                    timestamp: "2023-01-01",
                    type: "addition",
                }
            ],
            snippits: [
                {
                    artifact: "1",
                    code: "code",
                    description: "desc",
                    endLine: 10,
                    startLine: 1,
                    status: "draft",
                    type: "function",
                }
            ],
            content: config.content
        });
    });

    test('saveToFile should save artifact to file', async () => {
        const json = JSON.stringify(artifact.toJSON(), null, 2);
        await artifact.saveToFile();
        expect(fs.writeFile).toHaveBeenCalledWith(config.filePath, json, 'utf8');
    });

    test('loadFromFile should load artifact from file', async () => {
        const fileData = JSON.stringify(config);
        fs.readFile.mockResolvedValue(fileData);
        const loadedArtifact = await Artifact.loadFromFile(config.filePath);
        expect(loadedArtifact).toBeInstanceOf(Artifact);
        expect(loadedArtifact.id).toBe(config.id);
    });
});