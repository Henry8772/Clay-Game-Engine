
"use server";
import { LLMClient } from "../../backend/llm/client";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "../../convex/_generated/api";


export async function processGameMoveAction(currentState: any, rules: string, command: string, navMesh?: any[]) {
    console.log("Processing game move:", command);
    try {
        // 1. Get current active game ID if not passed (optional, for safety)
        const activeGame = await fetchQuery(api.games.get);
        if (!activeGame) throw new Error("No active game found in DB");

        // 2. Initialize Engine
        const client = new LLMClient();
        const { GameEngine } = await import("../../backend/llm/game_controller/game_engine");

        // Instantiate Engine with Current State
        const engine = new GameEngine(currentState, rules, client, navMesh);

        // 3. Process Move
        const result = await engine.processCommand(command);

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

            // AI MOVES (Via Engine)
            // We need to update the engine's state first (it already is updated internally, but new instance needed?)
            // Actually `engine` instance has the updated state in `engine.getState()`. It is persistent in memory for this function scope.

            const aiMoveResult = await engine.processCommand(aiDecision.command);

            if (aiMoveResult.newState) {
                // Persist Enemy Move
                await fetchMutation(api.games.updateState, {
                    gameId: activeGame._id,
                    newState: aiMoveResult.newState,
                    summary: `[RED TURN] ${aiDecision.reasoning}\nRef: ${aiMoveResult.summary}`,
                    role: "agent",
                    command: `(AI) ${aiDecision.command}`
                });
            }
        }

        return { success: true, ...result };
    } catch (error) {
        console.error("Error processing game move:", error);
        return { success: false, error: String(error) };
    }
}
