
import { describe, it, expect, beforeAll } from 'vitest';
import { LLMClient } from "../../../llm/client";
import { runAssetRestorerAgent } from "../../../llm/agents/asset_restorer";
import * as dotenv from "dotenv";

dotenv.config();

describe('REAL: 05 Asset Restorer Agent', () => {
    let client: LLMClient;
    const shouldRun = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("dummy");

    beforeAll(() => {
        if (!shouldRun) {
            console.warn("⚠️  Skipping Real Asset Restorer Test: No valid GEMINI_API_KEY found.");
        }
        client = new LLMClient("gemini", "gemini-2.5-flash", false);
    });

    it.skipIf(!shouldRun)('should restore asset from region', async () => {
        // Mock region data to simulate input from Decomposer
        const region = {
            label: "Sushi Chef",
            box2d: [100, 100, 200, 200],
            confidence: 0.95
        };
        console.log(`[Real] Restorer Input Region:`, region.label);

        const result = await runAssetRestorerAgent(client, region);

        console.log(`[Real] Restorer Output Asset:\n`, JSON.stringify(result, null, 2));

        expect(result).toBeDefined();
        expect(result.id).toBeDefined();
        expect(result.name).toBeDefined();
        expect(result.inpaintingPrompt).toBeDefined();
    });
});
