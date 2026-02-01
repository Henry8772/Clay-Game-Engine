
import { describe, it, expect } from 'vitest';
import { LLMClient } from "../../../llm/client";
import { runVisionAgent } from "../../../llm/agents/vision_agent";
import { MOCK_VISION_ANALYSIS } from "../../../llm/graph/mocks";

describe('MOCK: Vision Agent', () => {
    it('should return mock vision analysis', async () => {
        const client = new LLMClient("gemini", "gemini-3-flash-preview", true);
        const spriteBuffer = Buffer.from("MOCK_SPRITES");

        const data = await runVisionAgent(client, spriteBuffer);

        expect(data).toBeDefined();
        expect(data).toEqual(MOCK_VISION_ANALYSIS);
    });
});
