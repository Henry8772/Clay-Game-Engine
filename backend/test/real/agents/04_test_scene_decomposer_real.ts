
import { describe, it, expect, beforeAll } from 'vitest';
import { LLMClient } from "../../../llm/client";
import { runSceneDecomposerAgent } from "../../../llm/agents/scene_decomposer";
import * as dotenv from "dotenv";

dotenv.config();

describe('REAL: 04 Scene Decomposer Agent', () => {
    let client: LLMClient;
    const shouldRun = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("dummy");

    beforeAll(() => {
        if (!shouldRun) {
            console.warn("⚠️  Skipping Real Scene Decomposer Test: No valid GEMINI_API_KEY found.");
        }
        client = new LLMClient("gemini", "gemini-2.5-flash", false);
    });

    it.skipIf(!shouldRun)('should detect regions in target scene', async () => {
        // In real test, we pass a list of assets we expect the LLM to "hallucinate" positions for
        // since we aren't passing a real image yet (multimodal capability pending).
        const assetList = ["Chef", "Conveyor Belt", "Sushi Roll"];
        console.log(`[Real] Decomposer Input Assets:`, assetList);

        const regions = await runSceneDecomposerAgent(client, assetList);

        console.log(`[Real] Decomposer Output Regions:\n`, JSON.stringify(regions, null, 2));

        expect(regions).toBeDefined();
        expect(Array.isArray(regions)).toBe(true);
        // We expect at least some regions found
        expect(regions.length).toBeGreaterThan(0);
        expect(regions[0].label).toBeDefined();
        expect(regions[0].box2d).toBeDefined();
    });
});
