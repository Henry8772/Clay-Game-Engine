
"use server";
import { LLMClient } from "../../backend/llm/client";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "../../convex/_generated/api";
import { GameEngine } from "../engine/game_engine";
import { UserCommand } from "../components/engine/types";
import { generateEnemyMove } from "../../backend/llm/agents/enemy_ai";

export async function processGameMoveAction(
    currentState: any,
    rules: string,
    userAction: UserCommand,
    navMesh?: any[]
) {
    console.log("Processing User Action:", userAction);



    try {
        const activeGame = await fetchQuery(api.games.get, {});
        if (!activeGame) throw new Error("No active game found");

        const client = new LLMClient();

        // =========================================================
        // 1. CONTEXT INJECTION (The "Hazard" Fix)
        // =========================================================
        let stateForLLM = { ...currentState };

        // If this is a move, peek at the target tile
        if (userAction.type === 'MOVE' && userAction.payload?.targetId && navMesh) {
            const targetId = userAction.payload.targetId;

            // Find the specific tile data
            const targetTile = navMesh.find((zone: any) => zone.label === targetId);

            if (targetTile) {
                console.log(`[Context] Focused Zone: ${targetId} (Type: ${targetTile.type})`);

                // INJECT into State so LLM sees it
                stateForLLM = {
                    ...currentState,
                    // We add a temporary field "focused_interaction"
                    focused_interaction: {
                        target_zone_id: targetTile.label,
                        target_zone_type: targetTile.type || "normal",
                        target_zone_metadata: targetTile
                    }
                };
            }
        }

        // =========================================================
        // 2. SETUP ENGINE
        // =========================================================
        const engine = new GameEngine(
            stateForLLM, // Pass the Enriched State
            rules,
            client,
            navMesh,
            false,
            [...activeGame.engine_tools, "6. END_TURN() -> Pass play to the opponent."],
            activeGame.engine_logic
        );

        // =========================================================
        // 3. EXECUTE WITH DESCRIPTION
        // =========================================================
        // We pass the natural language description to the LLM
        const result = await engine.processCommand(userAction.description);

        // Persist to Convex
        if (result.newState) {
            // Clean up the temporary 'focused_interaction' before saving to DB
            // so we don't pollute persistent state
            if (result.newState.focused_interaction) {
                delete result.newState.focused_interaction;
            }

            await fetchMutation(api.games.updateState, {
                gameId: activeGame._id,
                newState: result.newState,
                summary: result.logs.join('\n'),
                role: "user",
                command: userAction.description // Log the text
            });
        }

        const players = result.newState.meta.players;
        let activeIndex = result.newState.meta.activePlayerIndex;
        let activePlayer = players[activeIndex];

        // ======================================================
        // THE "FROZEN" & AI UPDATE LOOP
        // ======================================================
        // @ts-ignore
        console.log("Active Player:", activePlayer);
        console.log(result.turnChanged, activePlayer.type === 'ai');
        if (result.turnChanged && activePlayer.type === 'ai') {

            console.log("--> Triggering AI Turn...");
            // Use result.newState as the latest state
            const aiMoveResult = await generateEnemyMove(client, result.newState, rules, navMesh || [], activePlayer);
            const aiCommand = aiMoveResult.command;

            console.log(`[AI] Command decided: "${aiCommand}"`);

            const aiResult = await engine.processCommand(aiCommand);

            // Update final state to return to client
            // @ts-ignore
            result.newState = aiResult.newState;
            // @ts-ignore
            result.logs = [...result.logs, ...aiResult.logs];

            // Save AI State to DB
            await fetchMutation(api.games.updateState, {
                gameId: activeGame._id,
                newState: aiResult.newState,
                summary: aiResult.logs.join('\n'),
                role: "assistant",
                command: aiCommand
            });
        }

        return {
            success: true,
            newState: result.newState,
            logs: result.logs,
            toolCalls: result.tools
        };

    } catch (error) {
        console.error("Error processing move:", error);
        // @ts-ignore
        return { success: false, error: String(error) };
    }
}
