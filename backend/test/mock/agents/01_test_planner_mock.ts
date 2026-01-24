
import { describe, it, expect, beforeAll } from 'vitest';
import { LLMClient } from "../../../llm/client";
import { runPlannerAgent } from "../../../llm/agents/planner";
import * as dotenv from "dotenv";
import { MOCK_DESIGN_DOC } from "../../../llm/graph/mocks";

dotenv.config();

describe('MOCK: 01 Planner Agent', () => {
    let client: LLMClient;

    beforeAll(() => {
        if (!process.env.GEMINI_API_KEY) {
            process.env.GEMINI_API_KEY = "dummy-test-key";
        }
        client = new LLMClient("gemini", "gemini-2.5-flash", true);
    });

    it('should generate a design doc from input', async () => {
        const input = "Test Input";
        console.log(`[Mock] Planner Input: ${input}`);

        const designDoc = await runPlannerAgent(client, input);

        console.log(`[Mock] Planner Output:`, designDoc);
        expect(designDoc).toBeDefined();
        expect(designDoc).toBe(MOCK_DESIGN_DOC);
    });
});
