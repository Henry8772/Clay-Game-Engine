"use server";

import { fetchMutation } from "convex/nextjs";
import { api } from "../../convex/_generated/api";
import { compileGenerationGraph } from "../../backend/llm/graph/workflow";
import { LLMClient } from "../../backend/llm/client";

export async function createGameAction(prompt: string, gameId: string) {
    if (!prompt) throw new Error("Prompt is required");
    if (!gameId) throw new Error("Game ID is required");

    console.log(`[createGameAction] Starting generation for game: ${gameId} with prompt: ${prompt}`);

    // 1. Setup Client
    const client = new LLMClient("gemini");
    const runId = `run_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

    // 2. Setup Callback to report progress to Convex
    // This allows the server to "talk" to the frontend via the DB
    const reportProgress = async (msg: string) => {
        console.log(`[createGameAction] Progress: ${msg}`);
        await fetchMutation(api.games.updateStatus, {
            gameId: gameId as any,
            status: "generating",
            progress: msg
        });

        // Optional: Log to system events if you have them, or chat
        // await fetchMutation(api.events.log, { gameId, content: msg, type: "info" });
    };

    try {
        await reportProgress("Initializing Architect Agent...");

        // 3. Run the Graph
        const app = compileGenerationGraph();

        // The graph expects { userInput, runId }
        const inputs = {
            userInput: prompt,
            runId: runId
        };

        const config = {
            configurable: {
                client,
                onProgress: reportProgress
            }
        };

        const result = await app.invoke(inputs, config);

        if (!result.finalGameState) {
            throw new Error("Generation failed: No final game state returned.");
        }

        // 4. Save Final State to Convex
        console.log(`[createGameAction] Generation complete. Saving to Convex...`);

        await fetchMutation(api.games.reset, {
            initialState: result.finalGameState,
            rules: "Standard game rules", // Or result.rules if available
            runId: runId,
            // We need to update reset mutation to accept status or do it in separate call?
            // The user plan said:
            /*
            await fetchMutation(api.games.reset, {
                initialState: result.finalGameState,
                rules: result.rules,
                runId: result.runId,
                status: "playing" // This flips the UI to "Game Mode"
            });
            */
            // I need to check if api.games.reset accepts status. 
            // If not, I'll need to update it or call updateStatus separately.
            // For now, I'll assume I need to update the mutation or make two calls.
            // Let's check api.games.reset first.
        });

        // Explicitly set status to playing after reset, if reset doesn't handle it
        await fetchMutation(api.games.updateStatus, {
            gameId: gameId as any,
            status: "playing",
            progress: "Ready!"
        });

    } catch (e: any) {
        console.error(`[createGameAction] Error:`, e);
        await fetchMutation(api.games.updateStatus, {
            gameId: gameId as any,
            status: "failed",
            progress: "Error: " + (e.message || "Unknown error")
        });
        throw e; // Re-throw to be visible in server logs/client if awaited
    }
}
