
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
        const designDoc = `# Game Design Document: Pong Classic

## 1. Theme & Atmosphere

**Vibe:** A faithful recreation of the classic arcade experience. Minimalist aesthetic with a focus on competitive, fast-paced gameplay. The atmosphere should evoke a retro feel, emphasizing simple geometry and clean lines, reminiscent of early video games.

## 2. Entity Manifest

Here are all the entities required for the game:

*   **Player 1 Paddle:** A vertical rectangle on the left side of the screen, controlled by Player 1 (or the human player in single-player mode).
*   **Player 2 Paddle:** A vertical rectangle on the right side of the screen, controlled by Player 2 (or AI in single-player mode).
*   **Ball:** A small square or circle that moves across the screen, bouncing off surfaces.
*   **Scoreboard:** A display area, typically at the top of the screen, showing Player 1's score and Player 2's score.
*   **Top Wall:** An invisible boundary at the top of the play area, causing the ball to bounce.
*   **Bottom Wall:** An invisible boundary at the bottom of the play area, causing the ball to bounce.
*   **Left Goal Line:** An invisible boundary past Player 1's paddle. If the ball crosses this line, Player 2 scores.
*   **Right Goal Line:** An invisible boundary past Player 2's paddle. If the ball crosses this line, Player 1 scores.
*   **Background:** A static, dark background (e.g., black) providing contrast for the active elements.

## 3. Game Loop

**Setup Phase:**
1.  Player 1 and Player 2 paddles are initialized to the vertical center of their respective sides.
2.  The ball is placed at the exact center of the screen.
3.  Player scores are reset to 0-0.
4.  The ball is given an initial random velocity, typically towards one of the paddles.

**Main Loop (Per Frame):**
1.  **Input Processing:**
    *   Player 1's paddle moves up or down based on Player 1's input.
    *   Player 2's paddle moves up or down based on Player 2's input or AI logic.
2.  **Ball Movement:**
    *   The ball's position is updated based on its current velocity.
3.  **Collision Detection:**
    *   **Ball vs. Top/Bottom Wall:** If the ball collides with the top or bottom wall, its vertical velocity is reversed.
    *   **Ball vs. Paddle:** If the ball collides with a paddle, its horizontal velocity is reversed. The vertical velocity may be adjusted based on where it hit the paddle (e.g., hitting the top of the paddle sends it upwards more).
    *   **Ball vs. Goal Line:**
        *   If the ball crosses the Left Goal Line, Player 2 scores 1 point. Proceed to **Score & Reset**.
        *   If the ball crosses the Right Goal Line, Player 1 scores 1 point. Proceed to **Score & Reset**.
4.  **Win Condition Check:**
    *   After a score, check if either player has reached the predefined winning score (e.g., 10 points). If so, the game ends, and the winning player is declared.

**Score & Reset Phase:**
1.  Update the scoreboard display.
2.  Pause briefly to acknowledge the score.
3.  Reset the ball to the center of the screen.
4.  Give the ball a new initial velocity, often towards the player who was scored against.
5.  Resume the **Main Loop**.

## 4. CRITICAL - Interface Definition: Game Board Layout

The game board is a single, rectangular screen representing the play area. All elements are contained within this view.

*   **Play Area:** A large, dark rectangular canvas forming the main game space. Its aspect ratio should ideally be wider than it is tall (e.g., 4:3 or 16:9).
*   **Paddles:**
    *   **Player 1 Paddle:** A vertical rectangle positioned on the far-left edge of the play area, with a small margin from the top and bottom walls. It can only move vertically.
    *   **Player 2 Paddle:** A vertical rectangle positioned on the far-right edge of the play area, mirroring Player 1's paddle. It can only move vertically.
*   **Ball:** A small, distinct square or circle that travels freely within the play area boundaries, bouncing off the paddles and top/bottom walls.
*   **Scoreboard:** A horizontal display bar at the very top of the screen, typically centered. It clearly shows two numerical scores, one for Player 1 (usually on the left side of the scoreboard) and one for Player 2 (on the right side).
*   **Center Line (Optional):** A dashed or solid vertical line drawn down the exact middle of the play area, purely for visual guidance and aesthetic.
*   **Boundaries:** The top and bottom edges of the screen define the vertical limits of the ball's movement. The left and right edges beyond the paddles define the scoring zones.`;
        console.log(`[Real] Architect Input Doc Length: ${designDoc.length}`);

        const res = await runArchitectAgent(client, designDoc);

        console.log(`[Real] Architect Output State:\n`, JSON.stringify(res.initialState, null, 2));
        console.log(`[Real] Architect Output Rules:\n`, res.rules);

        expect(res.initialState).toBeDefined();
        expect(res.rules).toBeDefined();
    });
});
