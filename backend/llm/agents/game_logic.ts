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

    // 1. ROBUST ENTITY MAPPING
    // We assume 'currentState' has 'entities' and 'blueprints'
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
            // CRITICAL: Expose 'spawns' to LLM so it knows what card creates what unit
            spawns: bp?.spawns || null,
            // Keep type to distinguish Cards vs Units (from blueprint or instance)
            type: bp?.type || e.type
        };
    });

    const toolsDescription = engineTools.length > 0 ? engineTools.join('\n') : AVAILABLE_TOOLS;

    // Inject the Spawn Logic convention if not present
    let finalLogic = engineLogic;
    if (!finalLogic.includes("**Card Play:**")) {
        finalLogic += `\n**Card Play:** If user draws a CARD to the BOARD -> DESTROY the card, then SPAWN the corresponding unit (defined in 'spawns' property) at that location.`;
    }

    const systemInstruction = `You are a Game Engine Logic Processor convert the User's Intent into a sequence of Engine Commands (Tools).
    
    **AVAILABLE TOOLS:**
    ${toolsDescription}

    **LOGIC GUIDE:**
    ${finalLogic}

    **NAMING CONVENTION:**
    - Use the exact 'template' ID provided in the entity list.
    - If spawning a new unit, use the exact ID found in the 'spawns' field of the card.

    **OUTPUT:**
    Return a JSON object containing an array of tool calls.
    `;

    const userInput = `
    **CURRENT GAME STATE:**
    - Entities on Board: ${JSON.stringify(simplifiedEntities)}
    - Game Rules: ${rules}
    
    **USER ACTION:**
    "${actionDescription}"
    `;

    console.log("System Instruction:", systemInstruction);
    console.log("User Input:", userInput);

    const inputData = [{ role: 'user', content: userInput }];

    const schema = {
        type: SchemaType.OBJECT,
        properties: {
            toolCalls: {
                type: SchemaType.ARRAY,
                items: {
                    type: SchemaType.OBJECT,
                    required: ["name", "args"],
                    properties: {
                        name: { type: SchemaType.STRING, enum: ["MOVE", "SPAWN", "ATTACK", "DESTROY", "NARRATE"] },
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
