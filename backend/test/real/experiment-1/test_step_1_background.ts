
import { describe, it } from 'vitest';
import { LLMClient } from "../../../llm/client";
import { config } from "dotenv";
import * as path from 'path';
import * as fs from 'fs';

config();

// Load environment variables
const backendEnvPath = path.resolve(__dirname, '../../../.env');
if (fs.existsSync(backendEnvPath)) config({ path: backendEnvPath });

describe('EXPERIMENT: Step 1 - Background Extraction', () => {
    const key = process.env.GEMINI_API_KEY;
    const shouldRun = key && !key.includes("dummy");

    it.skipIf(!shouldRun)('should extract background', async () => {
        const client = new LLMClient("gemini", "gemini-2.5-flash-image", false);

        const currentDir = __dirname;
        const masterImagePath = path.join(currentDir, "gold_reference.png");

        if (!fs.existsSync(masterImagePath)) {
            throw new Error(`Master image not found at ${masterImagePath}`);
        }

        const masterImageBuffer = fs.readFileSync(masterImagePath);
        console.log(`\n📂 Loaded Master Image: ${masterImagePath}`);

        console.log("\n🎬 Phase A: Background Extraction...");
        const bgPrompt = "A game background of no sprites and cards.";

        const backgroundBuffer = await client.editImage(bgPrompt, masterImageBuffer, undefined, { config: { temperature: 0.5 } });
        const bgPath = path.join(currentDir, "background.png");
        fs.writeFileSync(bgPath, backgroundBuffer);
        console.log(`   ✅ Saved Background: ${bgPath}`);

    }, 120000);
});
