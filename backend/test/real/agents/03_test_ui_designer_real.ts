
import { describe, it, expect, beforeAll } from 'vitest';
import { LLMClient } from "../../../llm/client";
import { runUIDesignerAgent } from "../../../llm/agents/ui_designer";
import * as dotenv from "dotenv";

dotenv.config();

describe('REAL: 03 UI Designer Agent', () => {
    let client: LLMClient;
    const shouldRun = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("dummy");

    beforeAll(() => {
        if (!shouldRun) {
            console.warn("⚠️  Skipping Real UI Designer Test: No valid GEMINI_API_KEY found.");
        }
        client = new LLMClient("gemini", "gemini-2.5-flash", false);
    });

    it.skipIf(!shouldRun)('should generate target scene prompt and layout', async () => {
        const designDoc = `
# Game: Cyberpunk Sushi
## Theme
Neon-lit kitchen.
## Entity Manifest
- Chef
- Conveyor Belt
`;
        console.log(`[Real] UI Designer Input Length: ${designDoc.length}`);

        const result = await runUIDesignerAgent(client, designDoc);

        console.log(`[Real] UI Designer Output Prompt:\n`, result.imagePrompt);
        console.log(`[Real] UI Designer Output Layout:\n`, JSON.stringify(result.visualLayout, null, 2));

        expect(result.imagePrompt).toBeDefined();
        expect(result.imagePrompt.length).toBeGreaterThan(10);
        expect(result.visualLayout.length).toBeGreaterThan(0);
    });
});
