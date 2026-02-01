
import { describe, it, expect, beforeAll } from 'vitest';
import { compileGenerationGraph } from "../../llm/graph/workflow";
import { GraphState } from "../../llm/graph/state";
import { LLMClient } from "../../llm/client";
import * as dotenv from "dotenv";
import fs from 'fs';
import path from 'path';
import { getTestRunDir } from '../utils';

dotenv.config();

describe('MOCK: Workflow E2E (Image-First)', () => {
    beforeAll(() => {
        if (!process.env.GEMINI_API_KEY) {
            process.env.GEMINI_API_KEY = "dummy-test-key";
        }
    });

    it('should run E2E workflow with mocks', async () => {
        const client = new LLMClient("gemini", "gemini-2.5-flash", true);
        const userInput = "Test Input";

        const app = compileGenerationGraph();

        const runDir = getTestRunDir('run_test_mock_workflow');
        const runId = path.basename(runDir);

        const result = await app.invoke({
            userInput: userInput,
            runId: runId
        }, {
            configurable: {
                client,
                useMock: true
            }
        }) as unknown as GraphState;

        expect(result).toBeDefined();

        // Check new workflow outputs
        expect(result.sceneImage).toBeDefined();
        expect(result.backgroundImage).toBeDefined();
        expect(result.spriteImage).toBeDefined();
        expect(result.analysisJson).toBeDefined();
        expect(result.navMesh).toBeDefined();
        expect(result.finalGameState).toBeDefined();
        expect(result.extractedAssets).toBeDefined();

        // Verify Storage (Mock workflow in real test calls save logic, but mocking agents might skip some files if agents don't write them?)
        // Actually, the graph nodes usually handle saving if they are responsible for it.
        // Wait, looking at real test, it checks fs.existsSync.
        // The nodes in `backend/llm/graph/nodes.ts` usually save output if implemented.
        // Let's assume the graph nodes save outputs. If not, we might need to update nodes to mock save or rely on mocks returning buffers that get saved.

        // Since we updated agents to return mock buffers/json, the nodes (if they use the agents) will receive those mock values.
        // The nodes then save them to disk.

        console.log(`[Test] Run saved to: ${runDir}`);
        expect(fs.existsSync(runDir)).toBe(true);
        expect(fs.existsSync(path.join(runDir, "gamestate.json"))).toBe(true);
    });
});
