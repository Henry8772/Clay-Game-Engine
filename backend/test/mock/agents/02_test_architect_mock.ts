
import { describe, it, expect, beforeAll } from 'vitest';
import { LLMClient } from "../../../llm/client";
import { runArchitectAgent } from "../../../llm/agents/architect";
import * as dotenv from "dotenv";

dotenv.config();

describe('MOCK: 02 Architect Agent', () => {
    let client: LLMClient;

    beforeAll(() => {
        if (!process.env.GEMINI_API_KEY) {
            process.env.GEMINI_API_KEY = "dummy-test-key";
        }
        client = new LLMClient("gemini", "gemini-2.5-flash", true);
    });

    it('should generate initial state and blueprints from design doc', async () => {
        const designDoc = "Design Doc Mock";
        console.log(`[Mock] Architect Input: ${designDoc}`);

        const { initialState, rules, blueprints } = await runArchitectAgent(client, designDoc);

        console.log(`[Mock] Architect Output State:`, initialState);
        console.log(`[Mock] Architect Output Rules:`, rules);
        console.log(`[Mock] Architect Blueprints:`, blueprints);

        expect(initialState).toBeDefined();
        // Check for Universal State structure in mock return? 
        // NOTE: runArchitectAgent in architect.ts does NOT check for MOCK mode. 
        // It relies on client.streamJson. If client is mock, it uses the provided mockResponse?
        // Wait, runArchitectAgent in architect.ts line 52:
        /*
            const stream = client.streamJson<{ initialState: string; rules: string; entityList: any[] }>(
                ARCHITECT_PROMPT,
                designDoc,
                ArchitectSchema,
                "architect_agent"
            );
        */
        // It does NOT pass a mockResponse object as the 5th argument.
        // So `client.streamJson` in mock mode will return something generic or fail if not handled.
        // Let's check `client.ts`.

        expect(rules).toBeDefined();
        expect(blueprints).toBeDefined();
    });
});
