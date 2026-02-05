
import { describe, it, expect } from 'vitest';
import { LLMClient } from "../../../llm/client";
import { runVisionAgent } from "../../../llm/agents/vision_agent";
import * as dotenv from "dotenv";
import fs from 'fs';
import path from 'path';
import { getTestRunDir, DEFAULT_EXPERIMENT_ID } from '../../utils';
import { drawBoundingBoxes } from '../../../llm/utils/image_processor';

dotenv.config();

describe('REAL: Vision Agent', () => {
    const shouldRun = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("dummy");

    it.skipIf(!shouldRun)('should analyze sprites provided', async () => {
        const client = new LLMClient("gemini", "gemini-2.5-flash-image", false);

        const runDir = getTestRunDir('demo2');
        // let spritePath = path.join(runDir, "sprites.png");
        // 
        let spritePath = path.join(runDir, "sprites.png");
        if (!fs.existsSync(spritePath)) {
            spritePath = path.join(runDir, "sprites.png");
        }

        if (!fs.existsSync(spritePath)) {
            spritePath = path.resolve(__dirname, `../../${DEFAULT_EXPERIMENT_ID}/sprites.png`);
        }

        if (!fs.existsSync(spritePath)) {
            console.warn("Skipping Vision Agent test because sprites.png not found");
            return;
        }

        const spriteBuffer = fs.readFileSync(spritePath);

        const items = await runVisionAgent(client, spriteBuffer);

        expect(items).toBeDefined();
        expect(Array.isArray(items)).toBe(true);
        expect(items.length).toBeGreaterThan(0);
        expect(items[0]).toHaveProperty('box_2d');
        expect(items[0]).toHaveProperty('label');

        const outPath = path.join(runDir, "analysis_modified.json");
        fs.writeFileSync(outPath, JSON.stringify(items, null, 2));

        // Visualization
        const segmentedBuffer = await drawBoundingBoxes(spriteBuffer, items);
        const visualizationPath = path.join(runDir, "sprites_modified_segmented.png");
        fs.writeFileSync(visualizationPath, segmentedBuffer);
    }, 300000);
});
