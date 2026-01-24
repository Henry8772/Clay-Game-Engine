
import { describe, it, expect } from 'vitest';
import { LLMClient } from "../../llm/client";
import * as dotenv from "dotenv";

dotenv.config();

describe('MOCK: LLM Client', () => {
    it('should stream mocked JSON data', async () => {
        // 1. Initialize Client in Debug Mode
        const client = new LLMClient("gemini", "gemini-2.5-flash", true);

        // 2. Mock a response manually if client allows, or test behavior
        const mockData = { test: "success", value: 42 };

        const stream = client.streamJson<typeof mockData>(
            "System Prompt",
            "User Input",
            null, // Schema
            "test_agent",
            mockData // direct mock
        );

        let received = null;
        for await (const chunk of stream) {
            received = chunk;
        }

        expect(received).toBeDefined();
        expect(received).toEqual(mockData);
    });
});
