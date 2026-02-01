
import { describe, it, expect } from 'vitest';
import { LLMClient } from "../../../llm/client";
import { runSceneAgent } from "../../../llm/agents/scene_agent";
import path from 'path';
import { getTestRunDir } from '../../utils';
import fs from 'fs';

describe('MOCK: Scene Agent', () => {
    it('should generate a scene image (MOCK)', async () => {
        const client = new LLMClient("gemini", "gemini-3-pro-image-preview", true);
        const userRequest = "MOCK REQUEST";

        const buffer = await runSceneAgent(client, userRequest);

        expect(buffer).toBeDefined();
        expect(buffer.length).toBeGreaterThan(0);

        const runDir = getTestRunDir('run_test_mock_agents');
        const outPath = path.join(runDir, "mock_scene.png");
        fs.writeFileSync(outPath, buffer);
    });
});
