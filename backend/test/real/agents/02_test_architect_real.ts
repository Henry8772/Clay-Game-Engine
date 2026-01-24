
import { describe, it, expect, beforeAll } from 'vitest';
import { LLMClient } from "../../../llm/client";
import { runArchitectAgent } from "../../../llm/agents/architect";
import * as dotenv from "dotenv";

dotenv.config();

describe('REAL: 02 Architect Agent', () => {
    let client: LLMClient;
    const shouldRun = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("dummy");

    beforeAll(() => {
        if (!shouldRun) {
            console.warn("⚠️  Skipping Real Architect Test: No valid GEMINI_API_KEY found.");
        }
        client = new LLMClient("gemini", "gemini-2.5-flash", false);
    });

    it.skipIf(!shouldRun)('should generate initial state and rules from design doc', async () => {
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
*   **Game Over/Win/Draw Message:** Pop-up or banner display.

## Game Loop
*   **Start:** White player begins.
*   **Turn Sequence:**
    1.  Current player selects one of their pieces.
    2.  Valid moves for the selected piece are highlighted on the board.
    3.  Current player selects a valid destination square (either empty or occupied by an opponent's piece for capture).
    4.  Piece moves to the selected square. If a capture occurs, the opponent's piece is removed from the board and added to the captured pieces display.
    5.  Check for checkmate, stalemate, or draw conditions.
    6.  Turn passes to the other player.
*   **Win Condition:** A player achieves **Checkmate** (opponent's King is under attack and has no legal moves to escape).
*   **Draw Conditions:** Stalemate, insufficient material, 50-move rule, three-fold repetition.

## Interface Definition
*   **Game Board:** Central 8x8 grid occupying the majority of the screen space.
    *   Squares are clearly defined, alternating between two distinct pixel art textures (e.g., light wood/dark stone).
    *   Pieces are rendered in their respective squares, centered and clearly visible.
*   **Left Panel:** Display for White's captured pieces (if any) and White player's name/icon.
*   **Right Panel:** Display for Black's captured pieces (if any) and Black player's name/icon.
*   **Bottom Bar:** Turn indicator (e.g., "White's Turn"), possibly a timer (optional), and menu/undo buttons (optional).
*   **Move Highlighting:** When a piece is selected, valid destination squares are highlighted with a distinct pixel art effect (e.g., a glowing border or subtle color change).`;
        console.log(`[Real] Architect Input Doc Length: ${designDoc.length}`);

        const res = await runArchitectAgent(client, designDoc);

        console.log(`[Real] Architect Output State:\n`, JSON.stringify(res.initialState, null, 2));
        console.log(`[Real] Architect Output Rules:\n`, res.rules);
        console.log(`[Real] Architect Output Entity List:\n`, JSON.stringify(res.entityList, null, 2));

        expect(res.initialState).toBeDefined();
        expect(res.rules).toBeDefined();
        expect(res.entityList).toBeDefined();
        expect(Array.isArray(res.entityList)).toBe(true);
        expect(res.entityList.length).toBeGreaterThan(0);
        expect(res.entityList[0].visualPrompt).toBeDefined();
        expect(res.entityList[0].visualPrompt).toBeDefined();
    }, 120000);
});
