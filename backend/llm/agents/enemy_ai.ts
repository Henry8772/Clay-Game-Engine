
import { LLMClient } from "../client";
import { SchemaType } from "@google/generative-ai";
import { enrichStateWithLogicalLocations, stripGeometricData } from "./game_referee";

export interface EnemyMoveResult {
    command: string;
}

export async function generateEnemyMove(
    client: LLMClient,
    currentState: any,
    rules: string,
    navMesh: any[]
): Promise<EnemyMoveResult> {

    // 1. Prepare Logical State
    let processingState = currentState;
    if (navMesh) {
        processingState = enrichStateWithLogicalLocations(currentState, navMesh);
        processingState = stripGeometricData(processingState);
    }

    const systemPrompt = `You are the Artificial Intelligence controlling the RED TEAM in a turn-based strategy game.
Your goal is to defeat the BLUE TEAM.

**CONTEXT:**
1. **Game Rules:** ${rules}
2. **Current State:** A JSON representation of the board.
   - You control units where 'team' is 'red' or 'enemy'.
   - Opponents are 'blue' or 'player'.

**TASK:**
- Analyze the board.
- Choose the SINGLE best strategic move for one of your units.
- Output a natural language command for that move (e.g., "Move fire demon to tile_r3_c3" or "Attack archer with skeleton").

**CONSTRAINTS:**
- Make valid moves only (check grid bounds, unit movement types).
- Be aggressive but tactical.

**AVAILABLE ACTIONS**
- Move {unit_name} to {tile_name}
`;

    const inputData = `
STATE:
${JSON.stringify(processingState, null, 2)}
`;

    const schema = {
        type: SchemaType.OBJECT,
        properties: {
            command: { type: SchemaType.STRING, description: "The natural language move command." },
            // reasoning: { type: SchemaType.STRING, description: "Short explanation of why this move was chosen." }
        },
        required: ["command"]
    };

    const stream = client.streamJson<EnemyMoveResult>(
        systemPrompt,
        inputData,
        schema,
        "enemy_ai"
    );

    let finalResult: EnemyMoveResult = { command: "Pass turn" };

    for await (const item of stream) {
        if (item) finalResult = item;
    }

    return finalResult;
}
