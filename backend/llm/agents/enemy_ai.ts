import { LLMClient } from "../client";
import { SchemaType } from "@google/generative-ai";

export interface EnemyMoveResult {
    command: string;
}

// 1. Update Signature to accept the specific identity
export async function generateEnemyMove(
    client: LLMClient,
    currentState: any,
    rules: string,
    navMesh: any[],
    playerProfile: { id: string; team: string } = { id: 'ai', team: 'red' } // Default fallback
): Promise<EnemyMoveResult> {

    // 2. Tactical View (Speed Optimization)
    // We map the full state to a lightweight view for the AI
    const tacticalState = {
        my_identity: playerProfile, // Explicitly tell AI who it is in the JSON
        units: Object.values(currentState.entities).map((e: any) => ({
            id: e.id,
            label: e.label,
            // Normalize ownership for the AI to understand "Mine" vs "Enemy"
            // fix: if sidebar (cards), treat as mine so I can spawn them. 
            // Default to ENEMY if unknown
            relation: (e.owner === playerProfile.id || e.team === playerProfile.team || (e.location === 'sidebar' && e.type === 'item')) ? 'MY_UNIT' : 'ENEMY',
            location: e.location,
            type: e.type
        })),
        valid_tiles: navMesh ? navMesh.map((n: any) => n.label) : []
    };

    // 3. Dynamic System Prompt
    console.log(`[EnemyAI] Tactical State Trace:\n${JSON.stringify(tacticalState, null, 2)}`);
    const systemPrompt = `You are a Tactical AI Player named "${playerProfile.id}".
    
**OBJECTIVE:**
You are on Team "${playerProfile.team}".
Your goal is to defeat all units labeled 'ENEMY'.
Defend your units labeled 'MY_UNIT'.

**CONTEXT:**
1. **Game Rules:** ${rules}
2. **Map:** Valid tiles are listed in the state. Do not hallucinate coordinates.

**TASK:**
- Analyze the board state.
- Choose the SINGLE best strategic move.
- Output a natural language command.
- If you cannot do anything useful or are done, output "End turn".

**AVAILABLE ACTIONS:**
- "Move {my_unit_label} to {tile_id}"
- "Attack {enemy_label} with {my_unit_label}"
- "Spawn {card_label} at {tile_id}"
`;

    const inputData = `TACTICAL_STATE: ${JSON.stringify(tacticalState)}`;

    const schema = {
        type: SchemaType.OBJECT,
        properties: {
            command: { type: SchemaType.STRING, description: "The move command." }
        },
        required: ["command"]
    };

    console.log(`[EnemyAI] Thinking as ${playerProfile.id} (${playerProfile.team})...`);

    try {
        // 4. One-Shot Generation (Fastest)
        const result = await client.generateJSON<EnemyMoveResult>(
            systemPrompt,
            [{ role: "user", content: inputData }],
            schema,
            "enemy_ai_tactical"
        );

        return result;

    } catch (e) {
        console.error("AI failed to move:", e);
        return { command: "NARRATE('AI is confused and skips turn.')" };
    }
}