
import { describe, it } from 'vitest';
import { LLMClient } from "../../../llm/client";
import { config } from "dotenv";
import * as path from 'path';
import * as fs from 'fs';

config();

const backendEnvPath = path.resolve(__dirname, '../../../.env');
if (fs.existsSync(backendEnvPath)) config({ path: backendEnvPath });

describe('EXPERIMENT: Step 2 - Sprite Isolation', () => {
    const key = process.env.GEMINI_API_KEY;
    const shouldRun = key && !key.includes("dummy");

    it.skipIf(!shouldRun)('should isolate sprites', async () => {
        const client = new LLMClient("gemini", "gemini-2.5-flash-image", false);

        const currentDir = __dirname;
        const masterImagePath = path.join(currentDir, "gold_reference.png");

        if (!fs.existsSync(masterImagePath)) {
            throw new Error(`Master image not found at ${masterImagePath}`);
        }

        const masterImageBuffer = fs.readFileSync(masterImagePath);
        console.log(`\n📂 Loaded Master Image: ${masterImagePath}`);

        console.log("\n🎭 Phase B: Sprite Isolation...");
        const spritePrompt = "A transparent background of all the sprites and each cards in equal spacing.";

        const spriteSheetBuffer = await client.editImage(spritePrompt, masterImageBuffer, undefined, { config: { temperature: 0.5 } });
        const spritePath = path.join(currentDir, "sprites.png");
        fs.writeFileSync(spritePath, spriteSheetBuffer);
        console.log(`   ✅ Saved Sprite Sheet: ${spritePath}`);

    }, 120000);
});
