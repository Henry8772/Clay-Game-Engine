import { LLMClient } from "../client";
import { AVAILABLE_TOOLS, GameTool } from "./game_tools";
import { SchemaType } from "@google/generative-ai";

export async function resolveGameAction(
    client: LLMClient,
    currentState: any,
    rules: string,
    actionDescription: string
): Promise<GameTool[]> {

    const systemInstruction = `You are a Game Engine Logic Processor convert the User's Intent into a sequence of Engine Commands (Tools).
    
    **AVAILABLE TOOLS:**
    ${AVAILABLE_TOOLS}

    **LOGIC GUIDE:**
    1. **Card Play:** If user draws a CARD to the BOARD -> DESTROY the card, then SPAWN the corresponding unit at that location.
    2. **Movement:** If user drags a UNIT to a TILE -> MOVE the unit.
    3. **Attack:** If user drags a UNIT to an ENEMY -> ATTACK the enemy (and usually don't move the attacker).

    **OUTPUT:**
    Return a JSON object containing an array of tool calls.
    `;

    const userInput = `
    **CONTEXT:**
    - Rules: ${rules}
    - Entities: ${JSON.stringify(currentState.entities)}
    - Action: ${actionDescription}
    `;

    const inputData = [{ role: 'user', content: userInput }];

    const schema = {
        type: SchemaType.OBJECT,
        properties: {
            toolCalls: {
                type: SchemaType.ARRAY,
                items: {
                    type: SchemaType.OBJECT,
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
