
import { describe, it, expect, beforeAll } from 'vitest';
import { LLMClient } from "../../../llm/client";
import { runSceneDecomposerAgent } from "../../../llm/agents/scene_decomposer";
import * as dotenv from "dotenv";
import { MOCK_DETECTED_REGIONS } from "../../../llm/graph/mocks";

dotenv.config();

describe('MOCK: 04 Scene Decomposer Agent', () => {
    let client: LLMClient;

    beforeAll(() => {
        if (!process.env.GEMINI_API_KEY) {
            process.env.GEMINI_API_KEY = "dummy-test-key";
        }
        client = new LLMClient("gemini", "gemini-2.5-flash", true);
    });

    it('should detect regions in target scene', async () => {
        const assetList = ["chef", "conveyor"];
        console.log(`[Mock] Decomposer Input Assets:`, assetList);

        const regions = await runSceneDecomposerAgent(client, assetList);

        console.log(`[Mock] Decomposer Output Regions:`, regions.length);
        expect(regions).toEqual(MOCK_DETECTED_REGIONS);
    });
});
