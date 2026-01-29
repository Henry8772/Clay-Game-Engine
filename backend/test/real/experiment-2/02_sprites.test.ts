
import { describe, it } from 'vitest';
import { LLMClient } from "../../../llm/client";
import { config } from "dotenv";
import * as path from 'path';
import * as fs from 'fs';

config();

// Load environment variables
const backendEnvPath = path.resolve(__dirname, '../../../.env');
if (fs.existsSync(backendEnvPath)) config({ path: backendEnvPath });

describe('EXPERIMENT-2: Step 2 - Sprite Generation', () => {
    const key = process.env.GEMINI_API_KEY;
    const shouldRun = key && !key.includes("dummy");

    it.skipIf(!shouldRun)('should generate sprite sheet', async () => {
        const client = new LLMClient("gemini", "gemini-2.5-flash-image", false);
        const currentDir = __dirname;

        // Load Style JSON
        const stylePath = path.join(currentDir, "style.json");
        if (!fs.existsSync(stylePath)) throw new Error("style.json not found");
        const styleData = JSON.parse(fs.readFileSync(stylePath, 'utf-8'));

        console.log("\n🎨 Phase 2: Generating Sprites...");

        const prompt = `
A 3 time 3 grid sheet of Hearthstone-style trading cards following the below style. Background in #FFFFFF.

Style Configuration:
${JSON.stringify(styleData, null, 2)}
        `;

        // Generate 1:1 Image
        const imageBuffer = await client.generateImage(
            prompt,
            // "gemini-3-pro-image-preview",
            "gemini-2.5-flash-image",
            { imageConfig: { aspectRatio: "1:1" } }
        );

        const outputPath = path.join(currentDir, "sprites.png");
        fs.writeFileSync(outputPath, imageBuffer);
        console.log(`   ✅ Saved Sprites: ${outputPath}`);

    }, 120000);
});
