
import { describe, it, expect, beforeAll } from 'vitest';
import { LLMClient } from "../../../llm/client";
import { runUIDesignerAgent } from "../../../llm/agents/ui_designer";
import * as dotenv from "dotenv";
import { MOCK_IMAGE_PROMPT, MOCK_VISUAL_LAYOUT } from "../../../llm/graph/mocks";

dotenv.config();

describe('MOCK: 03 UI Designer Agent', () => {
    let client: LLMClient;

    beforeAll(() => {
        if (!process.env.GEMINI_API_KEY) {
            process.env.GEMINI_API_KEY = "dummy-test-key";
        }
        client = new LLMClient("gemini", "gemini-2.5-flash", true);
    });

    it('should generate target scene prompt and layout', async () => {
        const designDoc = "Design Doc Mock";
        console.log(`[Mock] UI Designer Input: ${designDoc}`);

        const result = await runUIDesignerAgent(client, designDoc);

        console.log(`[Mock] UI Designer Output Prompt:`, result.imagePrompt);
        expect(result.imagePrompt).toBe(MOCK_IMAGE_PROMPT);
        expect(result.visualLayout).toEqual(MOCK_VISUAL_LAYOUT);
    });
});
