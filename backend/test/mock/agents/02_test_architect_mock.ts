
import { describe, it, expect, beforeAll } from 'vitest';
import { LLMClient } from "../../../llm/client";
import { runArchitectAgent } from "../../../llm/agents/architect";
import * as dotenv from "dotenv";

dotenv.config();

describe('MOCK: 02 Architect Agent', () => {
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

        const { initialState, rules, entityList } = await runArchitectAgent(client, designDoc);

        console.log(`[Mock] Architect Output State:`, initialState);
        console.log(`[Mock] Architect Output Rules:`, rules);
        console.log(`[Mock] Architect Output Entity List:`, entityList);

        expect(initialState).toBeDefined();
        expect(rules).toBeDefined();
        expect(entityList).toBeDefined();
        expect(Array.isArray(entityList)).toBe(true);
    });
});
