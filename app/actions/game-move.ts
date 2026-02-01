
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

        return { success: true, ...result };
    } catch (error) {
        console.error("Error processing game move:", error);
        return { success: false, error: String(error) };
    }
}
