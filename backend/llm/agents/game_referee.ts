
import { LLMClient } from "../client";

export interface GameUpdateResult {
    newState: any;
    summary: string;
    isValid: boolean;
}

export async function processGameMove(
    client: LLMClient,
    currentState: any,
    rules: string,
    playerCommand: string,
    useMock: boolean = false
): Promise<GameUpdateResult> {
    const systemPrompt = `You are an expert Game Referee and Engine.
Your task is to process a player's move in a turn-based game.

INPUTS:
1. Game Rules: The rules of the game.
2. Current State: The JSON representation of the current game state.
3. Player Command: A natural language description of the move (e.g., "Move knight from a1 to b3").

TASK:
1. Parse the Player Command.
2. Validate the move against the Game Rules and Current State.
3. If valid:
   - Update the Current State to reflect the move.
   - Update any derived state (e.g., turn, capture flags, scores).
   - Provide a concise summary of what happened.
4. If invalid:
   - Do NOT change the state.
   - Provide a summary explaining why the move is invalid.

OUTPUT FORMAT:
Return a JSON object with:
- "newState": The updated state object (or the original if invalid).
- "summary": A string describing the action or error.
- "isValid": Boolean, true if the move was successful.
`;

    const inputData = `
GAME RULES:
${rules}

CURRENT STATE:
${JSON.stringify(currentState, null, 2)}

PLAYER COMMAND:
${playerCommand}
`;

    // We use generate (not stream) because we need the full JSON to update the state.
    // However, the client only supports streamJson usually?
    // Let's check client.ts capabilities. Assuming streamJson is the standard way.

    // Actually, looking at other agents, they use streamJson.

    const stream = client.streamJson<GameUpdateResult>(
        systemPrompt,
        inputData,
        null,
        "game_referee",
        useMock ? mockGameReferee(currentState) : null
    );

    let finalResult: GameUpdateResult | null = null;
    for await (const item of stream) {
        finalResult = item;
    }

    if (!finalResult) {
        throw new Error("Failed to get response from Game Referee.");
    }

    return finalResult;
}

function mockGameReferee(currentState: any): any {
    // Basic mock that just returns the state unchanged with a dummy message
    return {
        newState: currentState,
        summary: "Mock: Move processed (no changes in mock mode).",
        isValid: true
    };
}
