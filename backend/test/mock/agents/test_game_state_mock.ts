
import { describe, it, expect, beforeAll } from 'vitest';
import { LLMClient } from "../../../llm/client";
import { extractGameState } from "../../../llm/agents/game_state";
import * as dotenv from "dotenv";

dotenv.config();

describe('MOCK: Game State Extraction', () => {
    let client: LLMClient;

    beforeAll(() => {
        if (!process.env.GEMINI_API_KEY) {
            process.env.GEMINI_API_KEY = "dummy-test-key";
        }
        client = new LLMClient("gemini", "gemini-2.5-flash", true);
    });

    it('should extract game states', async () => {
        const rules = "Rules";
        const desc = "Desc";
        console.log(`[Mock] Game State Input Rules: ${rules}`);
        console.log(`[Mock] Game State Input Desc: ${desc}`);

        const gen = extractGameState(client, rules, desc);
        let found = false;
        for await (const chunk of gen) {
            if (chunk.states) {
                console.log(`[Mock] Game State Output Chunk:`, chunk);
                found = true;
            }
        }
        expect(found).toBe(true);
    });
});
