
import { describe, it, expect, beforeAll } from 'vitest';
import { LLMClient } from "../../../llm/client";
import { runArtistAgent } from "../../../llm/agents/artist";
import * as dotenv from "dotenv";

dotenv.config();

describe('MOCK: 03 Artist Agent', () => {
    let client: LLMClient;

    beforeAll(() => {
        if (!process.env.GEMINI_API_KEY) {
            process.env.GEMINI_API_KEY = "dummy-test-key";
        }
        client = new LLMClient("gemini", "gemini-2.5-flash", true);
    });

    it('should generate image prompt and visual layout from design doc', async () => {
        const designDoc = "Design Doc Mock";
        console.log(`[Mock] Artist Input: ${designDoc}`);

        const { imagePrompt, visualLayout } = await runArtistAgent(client, designDoc);

        console.log(`[Mock] Artist Output Prompt:`, imagePrompt);
        console.log(`[Mock] Artist Output Layout:`, visualLayout);

        expect(imagePrompt).toBeDefined();
        expect(visualLayout).toBeDefined();
    });
});
