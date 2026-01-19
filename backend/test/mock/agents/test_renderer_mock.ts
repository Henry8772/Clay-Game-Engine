
import { describe, it, expect, beforeAll } from 'vitest';
import { LLMClient } from "../../../llm/client";
import { runRendererAgent } from "../../../llm/agents/renderer";
import * as dotenv from "dotenv";

dotenv.config();

describe('MOCK: Renderer Agent', () => {
    let client: LLMClient;

    beforeAll(() => {
        if (!process.env.GEMINI_API_KEY) {
            process.env.GEMINI_API_KEY = "dummy-test-key";
        }
        client = new LLMClient("gemini", "gemini-2.5-flash", true);
    });

    it('should generate React code from state and assets', async () => {
        const layout = ["mock_item"];
        const state = { mock: true };
        const assets = { item: "path.png" };

        console.log(`[Mock] Renderer Input Layout:`, layout);
        console.log(`[Mock] Renderer Input State:`, state);
        console.log(`[Mock] Renderer Input Assets:`, assets);

        const reactCode = await runRendererAgent(client, layout, state, assets);

        console.log(`[Mock] Renderer Output Code Length:`, reactCode?.length);
        expect(reactCode).toBeDefined();
        expect(reactCode).toContain("export");
    });
});
