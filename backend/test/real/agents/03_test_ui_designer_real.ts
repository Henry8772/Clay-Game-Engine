
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
        const designDoc = `# Chess Game Design Document

## Theme & Atmosphere
*   **Vibe:** Timeless strategic duel, focused on intellect and calculated moves.
*   **Visual Style:** High-quality **Pixel Art** with a clean, classic aesthetic. Pieces are easily distinguishable with subtle animations for movement and capture. Board squares have clear light/dark contrast.

## Entity Manifest
*   **Game Board:** 8x8 grid of alternating light and dark squares.
*   **Chess Pieces (White & Black, 6 types each):**
    *   King
    *   Queen
    *   Rook
    *   Bishop
    *   Knight
    *   Pawn
*   **Player Indicators:** Visual cues for whose turn it is.
*   **Captured Pieces Display:** Area to show pieces taken by each player.
*   **Game Over/Win/Draw Message:** Pop-up or banner display.`;
        console.log(`[Real] UI Designer Input Length: ${designDoc.length}`);

        const result = await runUIDesignerAgent(client, designDoc);

        console.log(`[Real] UI Designer Output Prompt:\n`, result.imagePrompt);
        console.log(`[Real] UI Designer Output Layout:\n`, JSON.stringify(result.visualLayout, null, 2));

        expect(result.imagePrompt).toBeDefined();
        expect(result.imagePrompt.length).toBeGreaterThan(10);
        expect(result.visualLayout.length).toBeGreaterThan(0);
        expect(result.image).toBeDefined();
        expect(result.image).toBeInstanceOf(Buffer);

        const fs = await import("fs");
        const path = await import("path");
        const outputPath = path.resolve(__dirname, "../../../.tmp/ui_designer_output.png");
        const dirname = path.dirname(outputPath);
        if (!fs.existsSync(dirname)) {
            fs.mkdirSync(dirname, { recursive: true });
        }
        fs.writeFileSync(outputPath, result.image);
        console.log(`[Real] Image saved to: ${outputPath}`);
    });
});
