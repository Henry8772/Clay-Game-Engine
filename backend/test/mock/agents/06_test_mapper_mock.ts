
import { describe, it, expect, beforeAll } from 'vitest';
import { LLMClient } from "../../../llm/client";
import { runMapperAgent } from "../../../llm/agents/mapper";
import * as dotenv from "dotenv";

dotenv.config();

describe('MOCK: 05 Mapper Agent', () => {
    let client: LLMClient;

    beforeAll(() => {
        if (!process.env.GEMINI_API_KEY) {
            process.env.GEMINI_API_KEY = "dummy-test-key";
        }
        client = new LLMClient("gemini", "gemini-2.5-flash", true);
    });

    it('should map assets from prompt and design doc', async () => {
        const prompt = "Prompt";
        const designDoc = "Design Doc Mock";
        console.log(`[Mock] Mapper Inputs: Prompt="${prompt}", Doc="${designDoc}"`);

        const { finalState, assetMap } = await runMapperAgent(client, prompt, designDoc);

        console.log(`[Mock] Mapper Output Final State:`, finalState);
        console.log(`[Mock] Mapper Output Asset Map:`, assetMap);

        expect(finalState).toBeDefined();
        expect(assetMap).toBeDefined();
    });
});
