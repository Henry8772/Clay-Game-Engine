import { LLMClient } from "../client";
import { AVAILABLE_TOOLS, GameTool } from "./game_tools";
import { SchemaType } from "@google/generative-ai";

export async function resolveGameAction(
    client: LLMClient,
    currentState: any,
    rules: string,
    actionDescription: string,
    engineTools: string[] = [],
    engineLogic: string = ""
): Promise<GameTool[]> {


    const blueprints = currentState.blueprints || {};

    const simplifiedEntities = Object.values(currentState.entities).map((e: any) => {
        // Lookup blueprint
        const bp = blueprints[e.t];

        return {
            id: e.id,
            // Use blueprint label if available, fallback to ID
            label: bp?.label || e.id,
            location: e.location || "sidebar",
            team: e.team,
            template: e.t,
            spawns: bp?.spawns || null,
            type: bp?.type || e.type
        };
    });

    const toolsDescription = engineTools.length > 0 ? engineTools.join('\n') : AVAILABLE_TOOLS;


    let finalLogic = engineLogic;
    if (!finalLogic.includes("**Card Play:**")) {
        finalLogic += `\n**Card Play:** If user draws a CARD to the BOARD -> DESTROY the card, then SPAWN the corresponding unit (defined in 'spawns' property) at that location.`;
    }


    if (!finalLogic.includes("**Combat:**")) {
        finalLogic += `\n**Combat:** If a user moves a unit to a tile occupied by a hostile unit (different team), this is an ATTACK. Use ATTACK(attacker, target), not MOVE.`;
    }


    const systemInstruction = `You are a Game Engine Logic Processor convert the User's Intent into a sequence of Engine Commands (Tools).
    
    **AVAILABLE TOOLS:**
    ${toolsDescription}

    **LOGIC GUIDE:**
    ${finalLogic}

    **NAMING CONVENTION:**
    - Use the exact 'template' ID provided in the entity list.
    - If spawning a new unit, use the exact ID found in the 'spawns' field of the card.
    - If the user's action concludes their turn (like moving), DO NOT forget to call END_TURN().

    **OUTPUT:**
    Return a JSON object containing an array of tool calls.
    `;



    let interactionContext = "";
    if (currentState.focused_interaction) {
        const { target_zone_id, target_zone_type, target_zone_metadata } = currentState.focused_interaction;

        interactionContext = `
    **INTERACTION CONTEXT:**
    - Target Zone: ${target_zone_id}
    - Zone Type: ${target_zone_type.toUpperCase()}
    - Hazard Info: ${(target_zone_type === 'hazard' || target_zone_type === 'lava') ? "DANGER! This tile is DEADLY." : "Safe."}
        `;
    }

    const userInput = `
    **CURRENT GAME STATE:**
    - Entities on Board: ${JSON.stringify(simplifiedEntities)}
    - Game Rules: ${rules}
    ${interactionContext}
    
    **USER ACTION:**
    "${actionDescription}"
    `;


    console.log("System Instruction:", systemInstruction);
    console.log("User Input:", userInput);

    const inputData = [{ role: 'user', content: userInput }];


    console.log(`
    [GameLogic] Resolving Action: "${actionDescription}"
    ---------------------------------------------------
    Entities: ${JSON.stringify(simplifiedEntities.map(e => `${e.label}(${e.team}) @ ${e.location}`), null, 2)}
    Interaction: ${currentState.focused_interaction ? JSON.stringify(currentState.focused_interaction) : "None"}
    Rules Snippet: ${finalLogic.slice(-200)}
    ---------------------------------------------------
    `);


    const schema = {
        type: SchemaType.OBJECT,
        properties: {
            toolCalls: {
                type: SchemaType.ARRAY,
                items: {
                    type: SchemaType.OBJECT,
                    required: ["name", "args"],
                    properties: {
                        name: { type: SchemaType.STRING, enum: ["MOVE", "SPAWN", "ATTACK", "DESTROY", "NARRATE", "END_TURN"] },
                        args: {
                            type: SchemaType.OBJECT,
                            properties: {
                                entityId: { type: SchemaType.STRING },
                                toZoneId: { type: SchemaType.STRING },
                                templateId: { type: SchemaType.STRING },
                                owner: { type: SchemaType.STRING },
                                attackerId: { type: SchemaType.STRING },
                                targetId: { type: SchemaType.STRING },
                                damage: { type: SchemaType.NUMBER },
                                message: { type: SchemaType.STRING }
                            }
                        }
                    }
                }
            }
        }
    };

    const response = await client.generateJSON(systemInstruction, inputData, schema);
    return (response as any).toolCalls || [];
}
