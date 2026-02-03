
import { describe, it, expect } from 'vitest';
import { LLMClient } from "../../../llm/client";
import { runBackgroundAgent } from "../../../llm/agents/background_agent";
import * as dotenv from "dotenv";
import fs from 'fs';
import path from 'path';
import { getTestRunDir, DEFAULT_EXPERIMENT_ID } from '../../utils';

dotenv.config();

describe('REAL: Background Agent', () => {
    const shouldRun = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("dummy");

    it.skipIf(!shouldRun)('should extract background from scene', async () => {
        const client = new LLMClient("gemini", "gemini-2.5-flash-image", false);

        // Use a known existing scene or fail gracefully if not present
        // ideally we mock or have a static asset, but for *real* Agent tests we often chain or read fixtures.
        // Let's assume we have a fixture or we just fail if 01 hasn't run.
        // Better: Use a committed fixture in test/fixtures if available, otherwise just use dummy buffer if it wasn't a real integration test.
        // But this IS a real test. Let's try to read the output of 01 or a committed file.
        // For robustness, I'll generate a tiny placeholder buffer if file missing, but real agent needs real image.
        // Let's rely on the previous test output or the Experiment 3 output.

        // Try to read from current run directory first (integration style)
        const runDir = getTestRunDir('boardgame');
        const runScenePath = path.join(runDir, "scene.png");

        // Fallback to experiment-3 if not in current run (for isolated testing)
        let scenePath = runScenePath;
        if (!fs.existsSync(scenePath)) {
            scenePath = path.resolve(__dirname, `../../${DEFAULT_EXPERIMENT_ID}/scene.png`);
        }

        if (!fs.existsSync(scenePath)) {
            console.warn("Skipping Background Agent test because valid scene.png not found");
            return;
        }

        const sceneBuffer = fs.readFileSync(scenePath);

        const buffer = await runBackgroundAgent(client, sceneBuffer);

        expect(buffer).toBeDefined();
        expect(Buffer.isBuffer(buffer)).toBe(true);
        expect(buffer.length).toBeGreaterThan(0);

        const outPath = path.join(runDir, "background.png");
        fs.writeFileSync(outPath, buffer);
    }, 120000);
});
