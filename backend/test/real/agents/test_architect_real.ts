
import { describe, it, expect, beforeAll } from 'vitest';
import { LLMClient } from "../../../llm/client";
import { runArchitectAgent } from "../../../llm/agents/architect";
import * as dotenv from "dotenv";

dotenv.config();

describe('REAL: Architect Agent', () => {
    let client: LLMClient;
    const shouldRun = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("dummy");

    beforeAll(() => {
        if (!shouldRun) {
            console.warn("⚠️  Skipping Real Architect Test: No valid GEMINI_API_KEY found.");
        }
        client = new LLMClient("gemini", "gemini-2.5-flash", false);
    });

    it.skipIf(!shouldRun)('should generate initial state and rules from design doc', async () => {
        const designDoc = `# Game: Pong
## Theme
Retro arcade minimalist.
## Game Loop
Ball bounces between paddle and walls. Players score when ball passes opponent paddle.
`;
        console.log(`[Real] Architect Input Doc Length: ${designDoc.length}`);

        const res = await runArchitectAgent(client, designDoc);

        console.log(`[Real] Architect Output State:`, res.initialState);
        console.log(`[Real] Architect Output Rules Length:`, res.rules?.length);

        expect(res.initialState).toBeDefined();
        expect(res.rules).toBeDefined();
    });
});
