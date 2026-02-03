
import { describe, it, expect } from 'vitest';
import { LLMClient } from "../../../llm/client";
import { runSpriteAgent } from "../../../llm/agents/sprite_agent";
import path from 'path';
import { getTestRunDir } from '../../utils';
import fs from 'fs';

describe('MOCK: Sprite Agent', () => {
    it('should generate a sprite image (MOCK)', async () => {
        const client = new LLMClient("gemini", "gemini-3-pro-image-preview", true);
        const sceneBuffer = Buffer.from("MOCK_SCENE");

        const runDir = getTestRunDir('run_test_mock_agents');
        const buffer = await runSpriteAgent(client, sceneBuffer, runDir);

        expect(buffer).toBeDefined();
        expect(buffer.length).toBeGreaterThan(0);

        const outPath = path.join(runDir, "mock_sprites.png");
        fs.writeFileSync(outPath, buffer);

        // Verify intermediate files
        expect(fs.existsSync(path.join(runDir, "sprites_white.png"))).toBe(true);
        expect(fs.existsSync(path.join(runDir, "sprites_black.png"))).toBe(true);
    });
});
