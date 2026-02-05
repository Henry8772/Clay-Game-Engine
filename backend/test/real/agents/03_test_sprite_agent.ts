
import { describe, it, expect } from 'vitest';
import { LLMClient } from "../../../llm/client";
import { runSpriteAgent } from "../../../llm/agents/sprite_agent";
import * as dotenv from "dotenv";
import fs from 'fs';
import path from 'path';
import { getTestRunDir, DEFAULT_EXPERIMENT_ID } from '../../utils';

dotenv.config();

describe('REAL: Sprite Agent', () => {
    const shouldRun = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("dummy");

    it.skipIf(!shouldRun)('should isolate sprites from scene (extract mode)', async () => {
        const client = new LLMClient("gemini", "gemini-2.5-flash-image", false);

        const runDir = getTestRunDir('puzzle');
        let scenePath = path.join(runDir, "scene.png");

        const designPath = path.join(runDir, "design.json");

        if (!fs.existsSync(designPath)) {
            console.warn("Skipping Scene Agent test: design.json not found in demo2. Run Test 00 first.");
            return;
        }

        const designJson = JSON.parse(fs.readFileSync(designPath, 'utf-8'));


        if (!fs.existsSync(scenePath)) {
            scenePath = path.resolve(__dirname, `../../${DEFAULT_EXPERIMENT_ID}/scene.png`);
        }

        if (!fs.existsSync(scenePath)) {
            console.warn("Skipping Sprite Agent test because scene.png not found");
            return;
        }

        const sceneBuffer = fs.readFileSync(scenePath);

        const buffer = await runSpriteAgent(client, sceneBuffer, runDir, {
            mode: 'extract_from_scene'
        }, designJson);

        expect(buffer).toBeDefined();
        expect(Buffer.isBuffer(buffer)).toBe(true);
        expect(buffer.length).toBeGreaterThan(0);

        const outPath = path.join(runDir, "sprites.png");
        fs.writeFileSync(outPath, buffer);
    }, 120000);

});
