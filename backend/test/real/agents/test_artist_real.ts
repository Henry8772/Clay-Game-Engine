
import { describe, it, expect, beforeAll } from 'vitest';
import { LLMClient } from "../../../llm/client";
import { runArtistAgent } from "../../../llm/agents/artist";
import * as dotenv from "dotenv";

dotenv.config();

describe('REAL: Artist Agent', () => {
    let client: LLMClient;
    const shouldRun = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("dummy");

    beforeAll(() => {
        if (!shouldRun) {
            console.warn("⚠️  Skipping Real Artist Test: No valid GEMINI_API_KEY found.");
        }
        client = new LLMClient("gemini", "gemini-2.5-flash", false);
    });

    it.skipIf(!shouldRun)('should generate image prompt and visual layout from design doc', async () => {
        const designDoc = `# Game: Pong
## Theme
Retro 8-bit.
`;
        console.log(`[Real] Artist Input Doc Length: ${designDoc.length}`);

        const res = await runArtistAgent(client, designDoc);

        console.log(`[Real] Artist Output Prompt:`, res.imagePrompt);
        console.log(`[Real] Artist Output Layout:`, res.visualLayout);

        expect(res.imagePrompt).toBeDefined();
        expect(Array.isArray(res.visualLayout)).toBe(true);
    });
});
