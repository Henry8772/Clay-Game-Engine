
import { describe, it, expect } from 'vitest';
import { LLMClient } from "../../llm/client";
import { config } from "dotenv";
import * as path from 'path';
import * as fs from 'fs';
import sharp from 'sharp';

config();

// Load backend/.env if it exists
const backendEnvPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(backendEnvPath)) config({ path: backendEnvPath });
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) config({ path: envPath });

describe('REAL: Hearthstone Background Gen', () => {
    const key = process.env.GEMINI_API_KEY;
    const shouldRun = key && !key.includes("dummy");

    it.skipIf(!shouldRun)('should generate a background from color map', async () => {
        const client = new LLMClient("gemini", "gemini-2.5-flash-image", false);

        // 1. Create a Synthetic Color Map (16:9)
        // Opponent Hand (Top) = Red
        // Battlefield (Middle) = Green
        // Player Hand (Bottom) = Blue
        // Background = Dark Gray
        const width = 640;
        const height = 360; // 16:9

        // Ensure sharp or canvas is available, or just create a raw buffer?
        // Using sharp is cleaner if installed, or we can just construct a simple PNG if we don't want deps.
        // For this test environment, let's assume we can use 'sharp' or install it. 
        // If not, I can create a simple BMP or raw pixel buffer.
        // Let's try to just write a simple SVG and convert it or just use a helper if we have one.
        // Actually, the user asked to "Load the color map image", but I don't have one.
        // I will generate one using sharp.

        const svgImage = `
        <svg width="${width}" height="${height}" version="1.1" xmlns="http://www.w3.org/2000/svg">
            <!-- Background -->
            <rect x="0" y="0" width="${width}" height="${height}" fill="#1a0b00"/>

            <!-- Opponent Hand (Red) -->
            <rect x="120" y="0" width="400" height="60" fill="#4a0404"/>

            <!-- Battlefield (Black/Invisible usually, but let's make it distinct for map) -->
            <rect x="120" y="90" width="400" height="180" fill="#000000"/>

            <!-- Player Hand (Green) -->
            <rect x="120" y="300" width="400" height="60" fill="#004400"/>
        </svg>
        `;

        const layoutMapBuffer = await sharp(Buffer.from(svgImage)).png().toBuffer();

        // Save Map for verification
        fs.writeFileSync(path.join(__dirname, "ref_color_map.png"), layoutMapBuffer);
        console.log("Color map created.");

        // 2. Style Reference - REMOVED to avoid IMAGE_OTHER error from Gemini
        // Passing multiple images (layout + style) seems to trigger refusals.
        // We rely on the prompt for style.

        // 3. Prompt
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
        const buffer = await client.editImage(prompt, [layoutMapBuffer]);

        expect(buffer).toBeDefined();
        expect(buffer.length).toBeGreaterThan(0);
        console.log(`Generated size: ${buffer.length}`);

        const outputPath = path.join(__dirname, "generated_hearthstone_background.png");
        fs.writeFileSync(outputPath, buffer);
        console.log(`Saved to ${outputPath}`);
    }, 60000); // Increased timeout for image generation
});
