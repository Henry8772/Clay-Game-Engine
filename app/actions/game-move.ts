
"use server";
import { LLMClient } from "../../backend/llm/client";
import { processGameMove } from "../../backend/llm/agents/game_referee";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "../../convex/_generated/api";

export async function processGameMoveAction(currentState: any, rules: string, command: string, navMesh?: any[]) {
    console.log("Processing game move:", command);
    try {
        // 1. Get current active game ID if not passed (optional, for safety)
        const activeGame = await fetchQuery(api.games.get);
        if (!activeGame) throw new Error("No active game found in DB");

        // 2. Run Agent
        const client = new LLMClient();
        const result = await processGameMove(client, currentState, rules, command, false, navMesh);

        // 3. Persist to Convex (including invalid moves to show error in chat)
        if (result.newState) {
            await fetchMutation(api.games.updateState, {
                gameId: activeGame._id,
                newState: result.newState,
                summary: result.summary,
                role: "agent",
                command: command
            });
        }

        // 4. Enemy AI Turn (Only if user move was valid AND navMesh exists)
        if (result.isValid && result.newState && navMesh) {
            console.log("Triggering Enemy AI turn...");
            const { generateEnemyMove } = await import("../../backend/llm/agents/enemy_ai");

            // AI THINKS
            // We use the NEW state from the user's move
            const aiDecision = await generateEnemyMove(client, result.newState, rules, navMesh);
            console.log("Enemy AI Decision:", aiDecision);

            // AI MOVES (Through Referee)
            const aiMoveResult = await processGameMove(
                client,
                result.newState,
                rules,
                aiDecision.command,
                false,
                navMesh
            );

            if (aiMoveResult.newState) {
                // Persist Enemy Move
                await fetchMutation(api.games.updateState, {
                    gameId: activeGame._id,
                    newState: aiMoveResult.newState,
                    summary: `[RED TURN] ${aiDecision.reasoning}\nRef: ${aiMoveResult.summary}`,
                    role: "agent",
                    command: `(AI) ${aiDecision.command}`
                });

                // Return final state? Or just let the UI update via subscription?
                // We return the USER's result, but UI updates via Convex subscription anyway.
            }
        }

        return { success: true, ...result };
    } catch (error) {
        console.error("Error processing game move:", error);
        return { success: false, error: String(error) };
    }
}
