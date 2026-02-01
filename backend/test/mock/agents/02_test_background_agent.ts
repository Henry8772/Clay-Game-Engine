
import { describe, it, expect } from 'vitest';
import { LLMClient } from "../../../llm/client";
import { runBackgroundAgent } from "../../../llm/agents/background_agent";
import path from 'path';
import { getTestRunDir } from '../../utils';
import fs from 'fs';

describe('MOCK: Background Agent', () => {
    it('should generate a background image (MOCK)', async () => {
        const client = new LLMClient("gemini", "gemini-3-pro-image-preview", true);
        const sceneBuffer = Buffer.from("MOCK_SCENE");

        const buffer = await runBackgroundAgent(client, sceneBuffer);

        expect(buffer).toBeDefined();
        expect(buffer.length).toBeGreaterThan(0);

        const runDir = getTestRunDir('run_test_mock_agents');
        const outPath = path.join(runDir, "mock_background.png");
        fs.writeFileSync(outPath, buffer);
    });
});
