
import { describe, it, expect, beforeAll } from 'vitest';
import { LLMClient } from "../../../llm/client";
import { runMapperAgent } from "../../../llm/agents/mapper";
import * as dotenv from "dotenv";

dotenv.config();

describe('REAL: 05 Mapper Agent', () => {
    let client: LLMClient;
    const shouldRun = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("dummy");

    beforeAll(() => {
        if (!shouldRun) {
            console.warn("⚠️  Skipping Real Mapper Test: No valid GEMINI_API_KEY found.");
        }
        client = new LLMClient("gemini", "gemini-2.5-flash", false);
    });

    it.skipIf(!shouldRun)('should map assets from prompt and design doc', async () => {
        const prompt = "Retro Pong";
        const designDoc = `# Game: Pong
## Assets
- Paddle
- Ball
`;
        console.log(`[Real] Mapper Input Prompt: ${prompt}`);

        // We simulate the mapping without real image gen (mapper takes prompts to map assets)
        const res = await runMapperAgent(client, prompt, designDoc);

        console.log(`[Real] Mapper Output Final State:\n`, JSON.stringify(res.finalState, null, 2));
        console.log(`[Real] Mapper Output Asset Map:\n`, JSON.stringify(res.assetMap, null, 2));

        expect(res.finalState).toBeDefined();
        expect(res.assetMap).toBeDefined();
    });
});
