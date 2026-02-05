
import { describe, it, expect } from 'vitest';
import { compileGenerationGraph } from "../../llm/graph/workflow";
import { GraphState } from "../../llm/graph/state";
import { LLMClient } from "../../llm/client";
import * as dotenv from "dotenv";
import fs from 'fs';
import path from 'path';
import { getTestRunDir } from '../utils';

dotenv.config();

const projectRoot = path.resolve(__dirname, '../../..');
// runsDir logic moved to utils

describe('REAL: Workflow E2E (Image-First)', () => {
    const shouldRun = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("dummy");

    it.skipIf(!shouldRun)('should run E2E workflow with real calls', async () => {
        const client = new LLMClient("gemini", "gemini-3-pro-image-preview", false);
        const userInput = "A magical forest chess game with fairies and goblins";

        const app = compileGenerationGraph();

        // Use centralized run ID
        const runDir = getTestRunDir('real_workflow_run');
        const runId = path.basename(runDir);

        console.log(`[Test] Run ID: ${runId}`);
        console.log("Graph compiled. Invoking (REAL CALLS)...");
        console.log("This may take 60-120 seconds...");

        const result = await app.invoke({
            userInput: userInput,
            runId: runId
        }, {
            configurable: {
                client,
                useMock: false
            }
        }) as unknown as GraphState;

        expect(result).toBeDefined();

        // Assertions for new workflow
        expect(result.sceneImage).toBeDefined();
        expect(result.backgroundImage).toBeDefined();
        expect(result.spriteImage).toBeDefined();
        expect(result.analysisJson).toBeDefined();
        expect(result.navMesh).toBeDefined();
        expect(result.finalGameState).toBeDefined();
        expect(result.extractedAssets).toBeDefined();

        console.log("Summary:", {
            sceneSize: result.sceneImage?.length,
            assetsExtract: result.extractedAssets?.length,
            entities: result.finalGameState?.entities?.length
        });

        // Verify Storage
        const currentRunDir = runDir;
        expect(fs.existsSync(currentRunDir)).toBe(true);
        expect(fs.existsSync(path.join(currentRunDir, "gamestate.json"))).toBe(true);
        expect(fs.existsSync(path.join(currentRunDir, "scene.png"))).toBe(true);

        // Log for developer
        console.log(`[Test] Run saved to: ${currentRunDir}`);

    }, 600000); // 10 mins timeout
});
