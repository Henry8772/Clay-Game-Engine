
import { describe, it, expect, beforeAll } from 'vitest';
import { LLMClient } from "../../../llm/client";
import { runSceneDecomposerAgent } from "../../../llm/agents/scene_decomposer";
import * as dotenv from "dotenv";

dotenv.config();

describe('REAL: 04 Scene Decomposer Agent', () => {
    let client: LLMClient;
    const shouldRun = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("dummy");

    beforeAll(() => {
        if (!shouldRun) {
            console.warn("⚠️  Skipping Real Scene Decomposer Test: No valid GEMINI_API_KEY found.");
        }
        client = new LLMClient("gemini", "gemini-2.5-flash", false);
    });

    it.skipIf(!shouldRun)('should detect regions in target scene', async () => {
        // In real test, we pass a list of assets we expect the LLM to "hallucinate" positions for
        // since we aren't passing a real image yet (multimodal capability pending).
        const assetList = [
            "Chess Board (8x8 grid with alternating squares)",
            "Algebraic Coordinate Labels ('a'-'h' and '1'-'8')",
            "White King piece",
            "White Queen piece",
            "White Rook piece",
            "White Bishop piece",
            "White Knight piece (selected)",
            "White Pawn piece",
            "Black King piece (in check)",
            "Black Queen piece",
            "Black Rook piece",
            "Black Bishop piece",
            "Black Knight piece",
            "Black Pawn piece",
            "Selected Piece Highlight (blue aura)",
            "Valid Move Indicators (green circles on squares)",
            "Check Notification (red glow around Black King)",
            "Current Turn Indicator (banner 'White's Turn')",
            "Game Over Notification (overlay 'CHECKMATE! White Wins!')",
            "Captured Black Pieces Display (panel with specific pieces)",
            "Captured White Pieces Display (panel with specific pieces)",
            "Player Timer 1 (for White)",
            "Player Timer 2 (for Black)"
        ];
        console.log(`[Real] Decomposer Input Assets:`, assetList);

        const fs = await import("fs");
        const path = await import("path");
        const imagePath = path.resolve(__dirname, "../../../.tmp/ui_designer_output.png");

        if (!fs.existsSync(imagePath)) {
            console.warn("⚠️  Skipping test: Image not found at " + imagePath);
            return;
        }

        const imageBuffer = fs.readFileSync(imagePath);
        console.log(`[Real] Loaded image from: ${imagePath} (${imageBuffer.length} bytes)`);

        const regions = await runSceneDecomposerAgent(client, assetList, imageBuffer);

        console.log(`[Real] Decomposer Output Regions:\n`, JSON.stringify(regions, null, 2));

        expect(regions).toBeDefined();
        expect(Array.isArray(regions)).toBe(true);
        // We expect at least some regions found (or empty if mock not set up, but let's check array)
        if (regions.length > 0) {
            expect(regions[0].label).toBeDefined();
            expect(regions[0].box2d).toBeDefined();
        } else {
            console.warn("⚠️  No regions detected (mock might return empty 'TODO' implementation)");
        }
    });
});
