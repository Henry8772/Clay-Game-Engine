
import { describe, it, expect, beforeAll } from 'vitest';
import { LLMClient } from "../../../llm/client";
import { runPlannerAgent } from "../../../llm/agents/planner";
import * as dotenv from "dotenv";

dotenv.config();

describe('REAL: 01 Planner Agent', () => {
    let client: LLMClient;
    const shouldRun = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("dummy");

    beforeAll(() => {
        if (!shouldRun) {
            console.warn("⚠️  Skipping Real Planner Test: No valid GEMINI_API_KEY found.");
        }
        client = new LLMClient("gemini", "gemini-2.5-flash", false);
    });

    it.skipIf(!shouldRun)('should generate a design doc from input', async () => {
        const input = "A simple Pong game.";
        console.log(`[Real] Planner Input: ${input}`);

        const designDoc = await runPlannerAgent(client, input);

        console.log(`[Real] Planner Output Length:`, designDoc?.length);
        console.log(`[Real] Planner Output Preview:`, designDoc?.substring(0, 100));

        expect(designDoc).toBeDefined();
        expect(designDoc.length).toBeGreaterThan(10);
    });
});
