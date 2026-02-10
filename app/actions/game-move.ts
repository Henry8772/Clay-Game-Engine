
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
    navMesh?: any[],
    apiKey?: string
) {
    console.log("Processing User Action:", userAction);

    try {
        const activeGame = await fetchQuery(api.games.get, {});
        if (!activeGame) throw new Error("No active game found");

        const client = new LLMClient("gemini", undefined, undefined, apiKey);

        // =========================================================
        // 0. RUNTIME LOCATION HYDRATION (Attributes from Geometry)
        // =========================================================
        const getIntersectionArea = (boxA: number[], boxB: number[]): number => {
            const [yMinA, xMinA, yMaxA, xMaxA] = boxA;
            const [yMinB, xMinB, yMaxB, xMaxB] = boxB;
            const yOverlap = Math.max(0, Math.min(yMaxA, yMaxB) - Math.max(yMinA, yMinB));
            const xOverlap = Math.max(0, Math.min(xMaxA, xMaxB) - Math.max(xMinA, xMinB));
            return yOverlap * xOverlap;
        };

        if (navMesh && currentState.entities) {
            Object.values(currentState.entities).forEach((entity: any) => {
                if (entity.pixel_box) {
                    let bestTile = null;
                    let maxArea = 0;

                    // Find maximal overlap with any tile
                    for (const tile of navMesh) {
                        const area = getIntersectionArea(entity.pixel_box, tile.box_2d);
                        if (area > maxArea) {
                            maxArea = area;
                            bestTile = tile.label;
                        }
                    }

                    // Threshold: meaningful overlap (e.g. > 100 pixels) implies "on tile"
                    if (maxArea > 100 && bestTile) {
                        entity.location = bestTile;
                    } else if (!entity.location) {
                        // Fallback if no location and no board overlap
                        entity.location = "sidebar";
                    }
                }
            });
        }

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

            console.log("--> Triggering AI Turn (REAL AI)...");

            // 1. Generate Move using the AI Agent
            // Ensure we pass the current state which reflects the user's just-completed move
            const aiMoveResult = await generateEnemyMove(client, result.newState, rules, navMesh || [], activePlayer);
            const aiCommand = aiMoveResult.command;

            console.log(`[AI] Command decided: "${aiCommand}"`);

            // 2. Prepare Engine for AI
            // FILTER OUT "END_TURN" from the tools list passed to engine to discourage AI usage,
            // though the engine itself technically still supports it if called.
            const aiToolsList = activeGame.engine_tools.filter((t: string) => !t.includes("END_TURN"));

            const aiEngine = new GameEngine(
                result.newState,
                rules,
                client,
                navMesh,
                false,
                aiToolsList,
                activeGame.engine_logic
            );

            // 3. Execute AI Command
            const aiResult = await aiEngine.processCommand(aiCommand);

            // 4. Manual FORCE END TURN (Conditional)
            let endTurnResult = { newState: aiResult.newState, logs: [], tools: [] };
            let autoEnded = false;

            if (!aiResult.turnChanged) {
                console.log("[AI] Forcing END_TURN as AI did not end it.");
                const endTurnTools = [{ name: "END_TURN", args: {} }];
                // @ts-ignore
                const etResult = aiEngine.applyTools(endTurnTools);

                endTurnResult = {
                    newState: etResult.newState,
                    logs: etResult.logs,
                    // @ts-ignore
                    tools: endTurnTools
                };
                autoEnded = true;
            } else {
                console.log("[AI] AI already ended the turn. Skipping force end.");
            }

            // 5. Merge Results for Frontend
            // The final state is the one from the *last* operation
            result.newState = endTurnResult.newState;

            // Log concatenation: User Actions -> AI Actions -> Turn Switch
            // @ts-ignore
            result.logs = [...result.logs, ...aiResult.logs, ...(endTurnResult.logs || [])];

            // Tool concatenation: User Tools -> AI Tools -> Synthetic End Turn
            // @ts-ignore
            result.tools = [...result.tools, ...aiResult.tools, ...(endTurnResult.tools || [])];

            // 6. Save AI Action + Turn End to DB
            const aiSummaryText = [...aiResult.logs, ...(endTurnResult.logs || [])].map((l: any) => l.message).join('\n');
            await fetchMutation(api.games.updateState, {
                gameId: activeGame._id,
                newState: result.newState,
                summary: aiSummaryText,
                role: "assistant",
                command: aiCommand + (autoEnded ? " [Turn Ended Automatically]" : ""),
                logs: [...aiResult.logs, ...(endTurnResult.logs || [])]
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
