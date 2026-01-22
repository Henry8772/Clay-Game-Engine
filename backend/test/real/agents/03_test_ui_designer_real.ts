
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
        const designDoc = `# Game Design Document: Chess

## 1. Theme & Atmosphere

Chess is a classic, abstract strategy game representing a battle between two opposing armies. The atmosphere is one of intellectual challenge, foresight, and tactical precision. It evokes a sense of ancient warfare, nobility, and strategic depth, where every move can shift the tide of battle. The aesthetic is traditionally elegant and formal, often featuring finely crafted pieces and boards.

## 2. Entity Manifest

### Players
*   **Player 1 (White):** Controls the white pieces.
*   **Player 2 (Black):** Controls the black pieces.

### Game Board
*   **Board:** An 8x8 grid of squares, alternating in color (e.g., light and dark).

### Pieces (per player, 32 total)
*   **King (x1):** The most important piece, its capture leads to checkmate.
*   **Queen (x1):** The most powerful attacking piece.
*   **Rook (x2):** Moves horizontally and vertically.
*   **Bishop (x2):** Moves diagonally.
*   **Knight (x2):** Moves in an 'L' shape, can jump over other pieces.
*   **Pawn (x8):** Basic infantry, moves forward, captures diagonally, can promote.

### Game State Components
*   **Current Turn:** Indicates which player (White or Black) is to move.
*   **Piece Positions:** The current location of all pieces on the board.
*   **Check Status:** Whether either King is currently under attack.
*   **Castling Rights:** Records if Kings or Rooks have moved, affecting castling availability.
*   **En Passant Target Square:** A special square indicating where an en passant capture is possible.
*   **Halfmove Clock:** Counts moves since the last capture or pawn advance (for 50-move rule).
*   **Fullmove Number:** Increments after Black's move (for game tracking).

## 3. Game Loop

### Setup Phase
1.  The 8x8 board is set up with alternating light and dark squares.
2.  Pieces are placed in their standard starting positions:
    *   **White:** Rooks on a1, h1; Knights on b1, g1; Bishops on c1, f1; Queen on d1; King on e1; Pawns on the 2nd rank (a2-h2).
    *   **Black:** Rooks on a8, h8; Knights on b8, g8; Bishops on c8, f8; Queen on d8; King on e8; Pawns on the 7th rank (a7-h7).
3.  White always makes the first move.

### Player Turn Loop
1.  **Identify Current Player:** The player whose turn it is is identified.
2.  **Select Piece:** The current player selects one of their pieces.
3.  **Identify Valid Moves:** The game determines all legal moves for the selected piece based on its type and current board state (considering obstructions, capturing rules, and crucially, preventing the player from moving into or remaining in check).
4.  **Select Destination:** The player chooses a legal destination square for the selected piece.
5.  **Execute Move:** The piece is moved to the chosen destination square.
    *   **Capture:** If the destination square is occupied by an opponent's piece, that piece is removed from the board.
    *   **Special Moves:** 
        *   **Castling:** If conditions are met, the King moves two squares towards a Rook, and the Rook moves to the square the King crossed.
        *   **En Passant:** If an opponent's pawn has just moved two squares from its starting position and lands adjacent to a player's pawn, the player's pawn can capture it as if it had only moved one square. The captured pawn is removed from its actual position.
        *   **Pawn Promotion:** If a pawn reaches the eighth rank (for White) or first rank (for Black), it must be promoted to a Queen, Rook, Bishop, or Knight of the same color.
6.  **Update Game State:** All relevant game state components (piece positions, castling rights, en passant target, halfmove clock, fullmove number) are updated.
7.  **Check for Check/Checkmate/Stalemate:** After the move, the game evaluates the board state:
    *   **Check:** If the opponent's King is under attack, it's 'in check'.
    *   **Checkmate:** If the opponent's King is in check and there are no legal moves to get out of check, the game ends. The current player wins.
    *   **Stalemate:** If the opponent's King is *not* in check, but the opponent has no legal moves to make, the game ends in a draw.
8.  **Check for Other Draw Conditions:**
    *   **Insufficient Material:** If neither side has enough pieces to force a checkmate (e.g., King and Knight vs. King).
    *   **50-Move Rule:** If 50 consecutive moves have been made by each player without a pawn move or a capture, the game is a draw.
    *   **Threefold Repetition:** If the exact same board position (with the same player to move, castling rights, and en passant possibility) occurs three times, the game is a draw.
9.  **Next Turn:** If the game has not ended, the turn switches to the other player, and the loop repeats from step 1.

### Win Condition
*   **Checkmate:** The player who delivers checkmate to the opponent's King wins.

### Loss Condition
*   Being checkmated by the opponent.

### Draw Conditions
*   Stalemate.
*   Insufficient material.
*   50-move rule.
*   Threefold repetition.
*   Mutual agreement.

## 4. CRITICAL - Interface Definition: Game Board Layout

### Board Structure
*   **Grid:** An 8x8 square grid, visually presented with alternating background colors (e.g., light brown/white and dark brown/black) to distinguish squares.
*   **Coordinates:** Each square is labeled with algebraic notation:
    *   **Files (columns):** Labeled 'a' through 'h' from left to right (from White's perspective).
    *   **Ranks (rows):** Labeled '1' through '8' from bottom to top (from White's perspective).
    *   (Example: The bottom-left square for White is 'a1', the top-right is 'h8').

### Piece Representation
*   Each piece will have a distinct visual icon or symbol. These symbols should be easily recognizable for their type (King, Queen, Rook, Bishop, Knight, Pawn) and color (White or Black).
*   Pieces will be rendered on their respective squares.

### Interactive Elements
*   **Piece Selection:** When a player clicks/taps on one of their own pieces, the piece should be highlighted.
*   **Valid Move Indication:** Upon selecting a piece, all legally possible destination squares for that piece should be visually indicated (e.g., with a colored dot, a glowing border, or a semi-transparent overlay).
*   **Move Execution:** When a player clicks/taps on a valid destination square, the selected piece visually animates or instantly moves to that square.

### Status Displays
*   **Current Turn Indicator:** A clear visual element (e.g., text, an icon) indicating whether it is 'White's Turn' or 'Black's Turn'.
*   **Check Notification:** If a King is in check, its square or the King piece itself should be highlighted (e.g., with a red glow or pulsating effect) to alert the player.
*   **Game Over Notification:** Upon checkmate, stalemate, or other draw conditions, a prominent message should appear indicating the game's outcome (e.g., 'White Wins by Checkmate!', 'Draw by Stalemate').

### Optional Information Displays (Enhancements)
*   **Captured Pieces:** A small area on the side of the board displaying the captured pieces for each player, categorized by color and type, giving an overview of material advantage.
*   **Move History/Notation:** A running log of moves made in algebraic notation (e.g., '1. e4 e5 2. Nf3 Nc6').
*   **Timer:** For timed games, a countdown timer for each player.`;
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
        fs.writeFileSync(outputPath, result.image);
        console.log(`[Real] Image saved to: ${outputPath}`);
    });
});
