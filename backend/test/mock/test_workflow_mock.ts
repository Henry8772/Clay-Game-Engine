
import { describe, it, expect, beforeAll } from 'vitest';
import { compileGenerationGraph } from "../../llm/graph/workflow";
import { GraphState } from "../../llm/graph/state";
import { LLMClient } from "../../llm/client";
import * as dotenv from "dotenv";

dotenv.config();

describe('MOCK: Workflow E2E', () => {
    beforeAll(() => {
        if (!process.env.GEMINI_API_KEY) {
            process.env.GEMINI_API_KEY = "dummy-test-key";
        }
    });

    it('should run E2E workflow with mocks', async () => {
        const client = new LLMClient("gemini", "gemini-2.5-flash", true);
        const userInput = "Test Input";

        const app = compileGenerationGraph();

        const result = await app.invoke({
            userInput: userInput
        }, {
            configurable: {
                client,
                useMock: true
            }
        }) as unknown as GraphState;

        expect(result).toBeDefined();
        expect(result.designDoc).toBeDefined();
        expect(result.initialState).toBeDefined();
        expect(result.rules).toBeDefined();
        expect(result.imagePrompt).toBeDefined();
    });
});
