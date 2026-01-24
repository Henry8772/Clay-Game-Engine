
import { describe, it, expect } from 'vitest';
import { LLMClient } from "../../llm/client";

describe('MOCK: Image Gen', () => {
    it('should generate a mock image', async () => {
        const client = new LLMClient("gemini", undefined, true); // debugMode = true
        const prompt = "A test image";
        const buffer = await client.generateImage(prompt);

        expect(buffer).toBeDefined();
        expect(buffer instanceof Buffer).toBe(true);

        // Check if it matches our mock 1x1 pixel
        const mockPngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
        expect(buffer.toString('base64')).toBe(mockPngBase64);
    });

    it('should edit a mock image', async () => {
        const client = new LLMClient("gemini", undefined, true); // debugMode = true
        const prompt = "Edit this image";
        const fakeInput = Buffer.from("fake");
        const buffer = await client.editImage(prompt, fakeInput);

        expect(buffer instanceof Buffer).toBe(true);
        const mockPngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
        expect(buffer.toString('base64')).toBe(mockPngBase64);
    });
});
