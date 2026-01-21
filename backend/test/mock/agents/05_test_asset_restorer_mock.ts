
import { describe, it, expect, beforeAll } from 'vitest';
import { LLMClient } from "../../../llm/client";
import { runAssetRestorerAgent } from "../../../llm/agents/asset_restorer";
import * as dotenv from "dotenv";
import { MOCK_DETECTED_REGIONS, MOCK_RESTORED_ASSETS } from "../../../llm/graph/mocks";

dotenv.config();

describe('MOCK: 05 Asset Restorer Agent', () => {
    let client: LLMClient;

    beforeAll(() => {
        if (!process.env.GEMINI_API_KEY) {
            process.env.GEMINI_API_KEY = "dummy-test-key";
        }
        client = new LLMClient("gemini", "gemini-2.5-flash", true);
    });

    it('should restore asset from region', async () => {
        const region = MOCK_DETECTED_REGIONS[0];
        console.log(`[Mock] Restorer Input Region:`, region.label);

        const result = await runAssetRestorerAgent(client, region);

        console.log(`[Mock] Restorer Output Asset:`, result.name);
        expect(result.id).toBe(MOCK_RESTORED_ASSETS[0].id);
        expect(result.inpaintingPrompt).toBeDefined();
    });
});
