
import { describe, it, expect } from 'vitest';
import { LLMClient } from "../../llm/client";
import { config } from "dotenv";
import * as path from 'path';
import * as fs from 'fs';

config();

describe('REAL: Image Gen', () => {
    const shouldRun = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("dummy");

    it.skipIf(!shouldRun)('should generate a real image', async () => {
        const client = new LLMClient("gemini", "gemini-2.5-flash-image", false); // debugMode = false
        const prompt = "A small red apple pixel art";
        const buffer = await client.generateImage(prompt);

        expect(buffer).toBeDefined();
        expect(buffer instanceof Buffer).toBe(true);
        expect(buffer.length).toBeGreaterThan(0);
        console.log(`Generated image size: ${buffer.length} bytes`);

        const outputPath = path.join(__dirname, "generated_real_image.png");
        fs.writeFileSync(outputPath, buffer);
        console.log(`Image saved to: ${outputPath}`);
    });
});
