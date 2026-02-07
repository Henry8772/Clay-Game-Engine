
"use server";
import { LLMClient } from "../../backend/llm/client";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "../../convex/_generated/api";
import { GameEngine } from "../engine/game_engine";


export async function processGameMoveAction(currentState: any, rules: string, command: string, navMesh?: any[], username?: string) {
    console.log("Processing game move:", command);
    try {
        if (!username) throw new Error("Username is required");

        // 1. Get current active game ID if not passed (optional, for safety)
        const activeGame = await fetchQuery(api.games.get, { username });
        if (!activeGame) throw new Error("No active game found in DB");

        // 1. Validate Turn (Security check)
        // @ts-ignore
        const activePlayer = currentState.meta?.activePlayerId || 'player';
        // if (activePlayer !== 'player') {
        //      return { success: false, error: "It is not your turn." };
        // }

        // 2. Setup Engine with automatic API key fetching
        const client = await LLMClient.createWithConvexKey(username);

        // console.log("rules", rules);
        // console.log("currentState", currentState);
        // console.log("navMesh", navMesh);


        // Instantiate Engine with Current State
        const engine = new GameEngine(
            currentState,
            rules,
            client,
            navMesh,
            false,
            [...activeGame.engine_tools, "6. END_TURN() -> Pass play to the opponent."], // Inject End Turn tool
            activeGame.engine_logic
        );

        // 3. Process Move
        const result = await engine.processCommand(command);

        // 3. Persist to Convex (including invalid moves to show error in chat)
        if (result.newState) {
            await fetchMutation(api.games.updateState, {
                gameId: activeGame._id,
                newState: result.newState,
                summary: result.logs.join('\n'), // Save the logs as the summary
                role: "agent",
                command: command
            });
        }

        // 4. Enemy AI Turn (Only if user move was valid AND navMesh exists)
        // if (result.isValid && result.newState && navMesh) {
        //     console.log("Triggering Enemy AI turn...");
        //     const { generateEnemyMove } = await import("../../backend/llm/agents/enemy_ai");

        //     // AI THINKS
        //     // We use the NEW state from the user's move
        //     const aiDecision = await generateEnemyMove(client, result.newState, rules, navMesh);
        //     console.log("Enemy AI Decision:", aiDecision);

        //     // AI MOVES (Via Engine)
        //     // We need to update the engine's state first (it already is updated internally, but new instance needed?)
        //     // Actually `engine` instance has the updated state in `engine.getState()`. It is persistent in memory for this function scope.

        //     const aiMoveResult = await engine.processCommand(aiDecision.command);

        //     if (aiMoveResult.newState) {
        //         // Persist Enemy Move
        //         await fetchMutation(api.games.updateState, {
        //             gameId: activeGame._id,
        //             newState: aiMoveResult.newState,
        //             summary: `[RED TURN] ${aiDecision.reasoning}\nRef: ${aiMoveResult.summary}`,
        //             role: "agent",
        //             command: `(AI) ${aiDecision.command}`
        //         });
        //     }
        // }

        // ======================================================
        // THE "FROZEN" & AI UPDATE LOOP
        // If the tool execution resulted in a turn change (to AI), 
        // we process the AI move immediately in this request.
        // ======================================================

        // @ts-ignore
        if (result.turnChanged && result.newState.meta.activePlayerId === 'ai') {

            // 5. Run AI Logic (Simplified for example)
            console.log("--> Triggering AI Turn...");

            // Artificial delay to let the frontend "Feel" the thinking (optional)
            // await new Promise(r => setTimeout(r, 1000));

            const aiCommand = await generateEnemyMove(client, result.newState, rules);

            const aiResult = await engine.processCommand(aiCommand);

            // Update final state to return to client
            // @ts-ignore
            result.newState = aiResult.newState;
            // @ts-ignore
            result.logs = [...result.logs, ...aiResult.logs];

            // 6. Save AI State to DB
            await fetchMutation(api.games.updateState, {
                gameId: activeGame._id,
                newState: aiResult.newState,
                summary: aiResult.logs.join('\n'),
                role: "assistant", // Mark as AI
                command: aiCommand
            });
        }

        return {
            success: true,
            toolCalls: result.tools, // Map tools -> toolCalls for frontend compatibility
            newState: result.newState,
            logs: result.logs
        };
    } catch (error) {
        console.error("Error processing game move:", error);
        return { success: false, error: String(error) };
    }
}
// Simple Helper for AI decision
async function generateEnemyMove(client: LLMClient, state: any, rules: string) {
    // Artificial delay to simulate thinking
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 1. Check if AI has any units
    const aiUnits = state.entities?.filter((e: any) => e.owner === 'ai') || [];

    if (aiUnits.length === 0) {
        // AI spawns a unit if it has none
        /* 
           Ideally we would spawn here, but we need a valid tile.
           For now, we just pass the turn back. 
           Future: return `ACTION: SPAWN entity minion AT tile_...`;
        */
        console.log("AI has no units, ending turn.");
    }

    return "ACTION: END_TURN";
}
