
"use server";
import { LLMClient } from "../../backend/llm/client";
import { processGameMove } from "../../backend/llm/agents/game_referee";

export async function processGameMoveAction(currentState: any, rules: string, command: string) {
    console.log("Processing game move:", command);
    try {
        const client = new LLMClient();
        const result = await processGameMove(client, currentState, rules, command);
        return { success: true, ...result };
    } catch (error) {
        console.error("Error processing game move:", error);
        return { success: false, error: String(error) };
    }
}
