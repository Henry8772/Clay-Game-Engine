
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


    it.skipIf(!shouldRun)('should restyle existing sprites (restyle mode)', async () => {
        const client = new LLMClient("gemini", "gemini-2.5-flash-image", false);

        const runDir = getTestRunDir('boardgame');
        let spritePath = path.join(runDir, "sprites.png");

        // If sprites.png doesn't exist from previous test, try to find one or fail gracefully
        if (!fs.existsSync(spritePath)) {
            spritePath = path.resolve(__dirname, `../../${DEFAULT_EXPERIMENT_ID}/sprites.png`);
        }

        if (!fs.existsSync(spritePath)) {
            console.warn("Skipping Restyle test because no input sprites.png found");
            return;
        }

        const spriteBuffer = fs.readFileSync(spritePath);

        const buffer = await runSpriteAgent(client, spriteBuffer, runDir, {
            mode: 'restyle_existing',
            styleDescription: "8-bit pixel art"
        });

        expect(buffer).toBeDefined();
        expect(Buffer.isBuffer(buffer)).toBe(true);
        expect(buffer.length).toBeGreaterThan(0);

        const outPath = path.join(runDir, "sprites_restyled.png");
        fs.writeFileSync(outPath, buffer);
    }, 120000);
});
