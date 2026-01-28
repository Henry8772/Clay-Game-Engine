
import { describe, it, expect } from 'vitest';
import { LLMClient } from "../../llm/client";
import { config } from "dotenv";
import * as path from 'path';
import * as fs from 'fs';

config();

// Load backend/.env if it exists
const backendEnvPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(backendEnvPath)) config({ path: backendEnvPath });
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) config({ path: envPath });
// Also check root .env.local explicitly in case we are running from backend dir
const rootEnvPath = path.resolve(__dirname, '../../../.env.local');
if (fs.existsSync(rootEnvPath)) config({ path: rootEnvPath });

describe('REAL: Hearthstone Background Gen', () => {
    const key = process.env.GEMINI_API_KEY;
    const shouldRun = key && !key.includes("dummy");

    it.skipIf(!shouldRun)('should generate a background from color map', async () => {
        const client = new LLMClient("gemini", "gemini-2.5-flash-image", false);

        // 1. Read the Saved Color Map
        // This file is saved by the Frontend via /api/save-colormap
        const colorMapPath = path.join(__dirname, "ref_color_map.png");

        if (!fs.existsSync(colorMapPath)) {
            console.warn("No color map found at " + colorMapPath + ". Skipping test logic or using fallback.");
            // For now, fail if no map exists - the user must run the frontend step first.
            throw new Error("No ref_color_map.png found. Please run the Frontend 'Generate Color Map' first.");
        }

        const layoutMapBuffer = fs.readFileSync(colorMapPath);
        console.log(`Loaded color map from ${colorMapPath}`);

        // 2. Prompt
        const prompt = `
            You are a master pixel artist for a 1990s SNES fantasy RPG.

Task: Create a detailed, organic top-down game board scene situated on a tavern table.

Layout Guide:
Use the provided image as a **loose geometric guide** for the placement of the main game elements. Do not treat the colored areas as strict, rigid boundaries. Instead, view them as general zones where objects are placed on the table.

Style & Perspective:
- **Strict top-down, orthographic perspective.**
- 16-bit pixel art style with sharp, crisp pixels. No blur.
- Warm, cozy tavern lighting from unseen candles, creating soft cast shadows.

Detailed Instructions for "Free Drawing":
1.  **The Table Surface (Brown Area):** Do not just fill this with a flat wood texture. Illustrate a worn, cluttered wooden tavern table. **Add organic details** like scattered coins, a spilled ale mug, a few loose playing cards, candle stubs, and crumbs. The wood should have natural grain, scratches, and stains.
2.  **The Game Board Zones:**
    -   **Top Zone (Red Area):** Design an ornate, dark red velvet tray for the opponent's deck (NO CARDS). It should have a carved wooden frame with iron accents.
    -   **Bottom Zone (Green Area):** Design a similar wooden tray for the player's deck (NO CARDS), with a hunter-green felt lining and polished gold trim.
    -   **Center Zone (Dark Area):** Create a large, textured felt battle mat (like green baize on a pool table) in the center.
The goal is a lived-in, natural scene, not a rigid geometric pattern.
        `;

        console.log("Generating image with prompt...");
        // Pass only layout map to avoid multimodal confusion
        // Use a high integer parameter for "timeout" if supported or handle via test timeout
        const buffer = await client.editImage(prompt, [layoutMapBuffer]);

        expect(buffer).toBeDefined();
        expect(buffer.length).toBeGreaterThan(0);
        console.log(`Generated size: ${buffer.length}`);

        // 3. Save to Public Assets
        // public is at project root: backend/test/real -> ../../../public
        const publicAssetsDir = path.resolve(__dirname, "../../../public/assets/hearthstone");
        if (!fs.existsSync(publicAssetsDir)) {
            fs.mkdirSync(publicAssetsDir, { recursive: true });
        }

        const outputPath = path.join(publicAssetsDir, "generated_background.png");
        fs.writeFileSync(outputPath, buffer);
        console.log(`Saved to ${outputPath}`);
    }, 120000); // Increased timeout for image generation
});

