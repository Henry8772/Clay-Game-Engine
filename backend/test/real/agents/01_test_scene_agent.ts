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

    it.skipIf(!shouldRun)('should generate a scene image based on design', async () => {
        const client = new LLMClient("gemini", "gemini-3-pro-image-preview", false);

        // Load the Design from Test 00
        const runDir = getTestRunDir('demo2');
        const designPath = path.join(runDir, "design.json");

        if (!fs.existsSync(designPath)) {
            console.warn("Skipping Scene Agent test: design.json not found in demo2. Run Test 00 first.");
            return;
        }

        const designJson = JSON.parse(fs.readFileSync(designPath, 'utf-8'));

        const buffer = await runSceneAgent(client, designJson);

        expect(buffer).toBeDefined();
        expect(Buffer.isBuffer(buffer)).toBe(true);
        expect(buffer.length).toBeGreaterThan(0);

        // Save for visual inspection during dev
        const outPath = path.join(runDir, "scene.png");
        fs.writeFileSync(outPath, buffer);
        console.log("Saved scene to", outPath);
    }, 120000);
});
