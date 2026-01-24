
import { describe, it, expect } from 'vitest';
import { LLMClient } from "../../llm/client";
import { SchemaType } from "@google/generative-ai";
import * as dotenv from "dotenv";

dotenv.config();

describe('REAL: LLM Client', () => {
    const shouldRun = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("dummy");

    it.skipIf(!shouldRun)('should stream real JSON data', async () => {
        const client = new LLMClient("gemini", "gemini-2.5-flash", false);

        // Schema
        const schema = {
            type: SchemaType.OBJECT,
            properties: {
                colors: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                count: { type: SchemaType.NUMBER }
            },
            required: ["colors", "count"]
        };

        const prompt = "List 3 colors of rankbow and the count 3.";

        console.log("Stream started...");
        const stream = client.streamJson<any>(
            "You are a helpful assistant.",
            prompt,
            schema,
            "real_test_agent"
        );

        let result = null;
        for await (const chunk of stream) {
            result = chunk;
        }

        expect(result).toBeDefined();
        expect(Array.isArray(result.colors)).toBe(true);
        expect(typeof result.count).toBe('number');
    });
});
