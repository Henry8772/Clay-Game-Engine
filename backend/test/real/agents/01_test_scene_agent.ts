
import { describe, it, expect } from 'vitest';
import { LLMClient } from "../../../llm/client";
import { runSceneAgent } from "../../../llm/agents/scene_agent";
import * as dotenv from "dotenv";
import fs from 'fs';
import path from 'path';
import { getTestRunDir } from '../../utils';

dotenv.config();

describe('REAL: Scene Agent', () => {
    const shouldRun = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("dummy");

    it.skipIf(!shouldRun)('should generate a scene image', async () => {
        const client = new LLMClient("gemini", "gemini-3-pro-image-preview", false);
        const userRequest = "A high-stakes chess match in a volcano";

        const buffer = await runSceneAgent(client, userRequest);

        expect(buffer).toBeDefined();
        expect(Buffer.isBuffer(buffer)).toBe(true);
        expect(buffer.length).toBeGreaterThan(0);

        // Save for visual inspection during dev
        const runDir = getTestRunDir('run_test_real_agents');
        const outPath = path.join(runDir, "scene.png");
        fs.writeFileSync(outPath, buffer);
        console.log("Saved scene to", outPath);
    }, 120000);
});
