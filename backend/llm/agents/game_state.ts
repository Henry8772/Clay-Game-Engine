import { LLMClient } from "../client";
import { GameStateList } from "../../models/game_state";
import { mockGameStateExtraction } from "./mocks";

export async function* extractGameState(
    client: LLMClient,
    rules: string,
    description: string,
    useMock: boolean = false
): AsyncGenerator<GameStateList, void, unknown> {
    const systemPrompt = `You are an expert Game Designer and System Architect.
Your goal is to analyze a Game Design Document (Rules + Description) and extract the necessary "Game State" variables required to implement the game in code.

OUTPUT RULES:
1. Identify every dynamic piece of data that changes during gameplay (e.g., scores, turn counters, inventories, board positions).
2. For each state, provide a descriptive 'name', a clear 'description', its data 'type' (integer, string, boolean, object, array), and an 'initialValue'.
3. Return a JSON object with a 'states' array containing these objects.

EXAMPLE:
Input: "Chess"
Output: { "states": [{ "name": "turn", "type": "string", "initialValue": "white" }, { "name": "board", "type": "array", "initialValue": "..." }] }`;

    const inputData = `Game Rules:\n${rules}\n\nGame Description:\n${description}`;

    const stream = client.streamJson<GameStateList>(
        systemPrompt,
        inputData,
        null,
        "game_state_extraction",
        useMock ? mockGameStateExtraction() : null
    );

    for await (const item of stream) {
        yield item;
    }
}
