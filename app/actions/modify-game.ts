"use server";

import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "../../convex/_generated/api";
import { LLMClient } from "../../backend/llm/client";
import { processModification } from "../../backend/llm/agents/modification_agent";

export async function modifyGameAction(gameId: string, userRequest: string) {
    console.log(`[ModifyGame] Request: ${userRequest} for Game: ${gameId}`);

    // 1. Fetch Current State
    // Using fetchQuery to get state from Convex
    // Casting gameId to any to avoid strict Id<"games"> check usually handled by Convex/Client
    const gameState = await fetchQuery(api.games.get, { id: gameId as any });
    if (!gameState) throw new Error("Game not found");

    const currentState = gameState.state;

    const runId = gameState.runId || "boardgame";

    // 2. Init LLM
    const client = new LLMClient("gemini", "gemini-3-flash-preview", false);

    try {
        // 3. Run Agent
        const result = await processModification(client, runId, currentState, userRequest);

        await fetchMutation(api.games.applyModification, {
            gameId: gameId as any,
            newState: result.newState,
            logMessage: result.message,
            command: userRequest
        });

        return { success: true, message: result.message };

    } catch (e) {
        console.error("Modification failed:", e);
        return { success: false, error: String(e) };
    }
}
