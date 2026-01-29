
import { describe, it } from 'vitest';
import { config } from "dotenv";
import * as path from 'path';
import * as fs from 'fs';
import { GeminiBackend } from "../../../llm/backend";

config();

const backendEnvPath = path.resolve(__dirname, '../../../.env');
if (fs.existsSync(backendEnvPath)) config({ path: backendEnvPath });

describe('EXPERIMENT-2: Step 3 - Vision Analysis', () => {
    const key = process.env.GEMINI_API_KEY;
    const shouldRun = key && !key.includes("dummy");

    it.skipIf(!shouldRun)('should analyze sprites and return JSON', async () => {
        const currentDir = __dirname;
        const spritePath = path.join(currentDir, "sprites.png");

        if (!fs.existsSync(spritePath)) {
            throw new Error("sprites.png not found. Please run Step 2 first.");
        }

        const spriteBuffer = fs.readFileSync(spritePath);
        console.log(`\n📂 Loaded Sprites: ${spritePath}`);

        console.log("\n🧠 Phase 3: Vision Analysis...");

        const backend = new GeminiBackend(key!);

        const analysisPrompt = `
            Detect the all of the prominent items in the image. The box_2d should be [ymin, xmin, ymax, xmax] normalized to 0-1000.
            Identify individual cards, characters, or tokens.
        
            JSON Format:
            [
              { "box_2d": [0,0,1000,1000], "label": "..." }
            ]
        `;

        const config = {
            temperature: 0.5,
            responseMimeType: "application/json",
            // thinkingConfig: { thinkingLevel: 'HIGH' } // Optional depending on model
        };

        const imagePart = {
            inlineData: {
                data: spriteBuffer.toString('base64'),
                mimeType: "image/png"
            }
        };

        // Use gemini-2.5-flash or 3-flash for analysis
        const responseText = await backend.generateContent(
            [{ role: "user", parts: [{ text: analysisPrompt }, imagePart] }],
            "gemini-3-flash-preview",
            { config: config }
        );

        console.log("   🔍 Raw Analysis:", responseText.substring(0, 100) + "...");
        const detectedItems = JSON.parse(responseText);
        console.log(`   ✅ Detected ${detectedItems.length} items.`);

        const analysisPath = path.join(currentDir, "coordinates.json");
        fs.writeFileSync(analysisPath, JSON.stringify(detectedItems, null, 2));
        console.log(`   ✅ Saved Coordinates: ${analysisPath}`);

    }, 300000);
});
