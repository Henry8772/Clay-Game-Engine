
import { describe, it, expect, beforeAll } from 'vitest';
import { LLMClient } from "../../../llm/client";
import { runRendererAgent } from "../../../llm/agents/renderer";
import * as dotenv from "dotenv";

dotenv.config();

describe('REAL: Renderer Agent', () => {
    let client: LLMClient;
    const shouldRun = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("dummy");

    beforeAll(() => {
        if (!shouldRun) {
            console.warn("⚠️  Skipping Real Renderer Test: No valid GEMINI_API_KEY found.");
        }
        client = new LLMClient("gemini", "gemini-2.5-flash", false);
    });

    it.skipIf(!shouldRun)('should generate React code from state and assets', async () => {
        const layout = ["paddle", "ball"];
        const state = { score: 0, player1: 0, player2: 0 };
        const assets = { paddle: "paddle.png", ball: "ball.png" };

        console.log(`[Real] Renderer Input Layout:`, layout);

        const res = await runRendererAgent(client, layout, state, assets);

        console.log(`[Real] Renderer Output Code Length:`, res?.length);
        console.log(`[Real] Renderer Output Preview:`, res?.substring(0, 50));

        expect(res).toBeDefined();
        expect(res).toContain("React");
    });
});
