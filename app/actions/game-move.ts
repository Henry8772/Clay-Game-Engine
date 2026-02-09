
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

            // Map logs to string for the summary field (backward compatibility / simple view)
            const summaryText = result.logs.map((l: any) => l.message).join('\n');

            await fetchMutation(api.games.updateState, {
                gameId: activeGame._id,
                newState: result.newState,
                summary: summaryText,
                role: "user",
                command: userAction.description, // Log the text
                logs: result.logs // Pass structured logs
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

            console.log("--> Triggering AI Turn (FAKE/DEMO MODE)...");

            // FAKE AI LOGIC FOR DEMO
            const currentTurn = result.newState.meta.turnCount;
            let aiCommand = "End turn."; // Default fallback

            // 1. Aggressive Attack Logic (Check for adjacency)
            // Parse grid coordinates
            const getCoords = (loc: string) => {
                const match = loc.match(/tile_r(\d+)_c(\d+)/);
                return match ? { r: parseInt(match[1]), c: parseInt(match[2]) } : null;
            };

            console.log("result.newState.entities", result.newState.entities);

            const entities = Object.values(result.newState.entities) as any[];

            console.log("entities", entities);

            const aiUnits = entities.filter(e => e.team === 'red');

            console.log("aiUnits", aiUnits);

            const playerUnits = entities.filter(e => e.team === 'blue');

            console.log("playerUnits", playerUnits);

            let attackCommand = null;

            for (const ai of aiUnits) {
                if (!ai.location) continue;
                const aiPos = getCoords(ai.location);
                if (!aiPos) continue;

                for (const player of playerUnits) {
                    if (!player.location) continue;
                    const pPos = getCoords(player.location);



                    if (!pPos) continue;

                    // Manhattan Distance
                    const dist = Math.abs(aiPos.r - pPos.r) + Math.abs(aiPos.c - pPos.c);
                    console.log("pPos, aiPos, dist", pPos, aiPos, dist);
                    // If adjacent (dist === 1), ATTACK!
                    if (dist === 1) {
                        attackCommand = `Entity ${ai.id} attacks ${player.id}. End turn.`;
                        break;
                    }
                }
                if (attackCommand) break;
            }

            if (attackCommand) {
                aiCommand = attackCommand;
            } else if (currentTurn === 2) {
                // Move Zombie (entity_8) forward
                // Ensure it doesn't move on top of someone unless it's an attack (which we caught above)
                aiCommand = "Move entity entity_8 to tile_r2_c4. End turn.";
            } else if (currentTurn === 4) {
                // Move Orc (entity_9) forward
                aiCommand = "Move entity entity_9 to tile_r2_c5. End turn.";
            } else {
                // Random fallback or just pass
                aiCommand = "End turn.";
            }

            // const aiMoveResult = await generateEnemyMove(client, result.newState, rules, navMesh || [], activePlayer);
            // const aiCommand = aiMoveResult.command;

            console.log(`[AI] Command decided: "${aiCommand}"`);

            // Create a new engine instance for the AI using the FRESH state
            // This ensures the LLM knows exactly who the active player is right now
            const aiEngine = new GameEngine(
                result.newState,
                rules,
                client,
                navMesh,
                false,
                [...activeGame.engine_tools, "6. END_TURN() -> Pass play to the opponent."],
                activeGame.engine_logic
            );

            // Execute on the NEW aiEngine, not the old 'engine'
            const aiResult = await aiEngine.processCommand(aiCommand);

            // Update final state to return to client
            // @ts-ignore
            result.newState = aiResult.newState;
            // @ts-ignore
            result.logs = [...result.logs, ...aiResult.logs];

            // Save AI State to DB
            const aiSummaryText = aiResult.logs.map((l: any) => l.message).join('\n');
            await fetchMutation(api.games.updateState, {
                gameId: activeGame._id,
                newState: aiResult.newState,
                summary: aiSummaryText,
                role: "assistant",
                command: aiCommand,
                logs: aiResult.logs
            });
            // Merge AI tools into the response so the frontend sees them
            // @ts-ignore
            result.tools = [...result.tools, ...aiResult.tools];
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
