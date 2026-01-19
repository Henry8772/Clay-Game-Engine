
import { describe, it, expect, beforeAll } from 'vitest';
import { LLMClient } from "../../../llm/client";
import { runArchitectAgent } from "../../../llm/agents/architect";
import * as dotenv from "dotenv";

dotenv.config();

describe('MOCK: Architect Agent', () => {
    let client: LLMClient;

    beforeAll(() => {
        if (!process.env.GEMINI_API_KEY) {
            process.env.GEMINI_API_KEY = "dummy-test-key";
        }
        client = new LLMClient("gemini", "gemini-2.5-flash", true);
    });

    it('should generate initial state and rules from design doc', async () => {
        const designDoc = "Design Doc Mock";
        console.log(`[Mock] Architect Input: ${designDoc}`);

        const { initialState, rules } = await runArchitectAgent(client, designDoc);

        console.log(`[Mock] Architect Output State:`, initialState);
        console.log(`[Mock] Architect Output Rules:`, rules);

        expect(initialState).toBeDefined();
        expect(rules).toBeDefined();
    });
});
