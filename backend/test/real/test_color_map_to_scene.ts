
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
        const client = new LLMClient("gemini", "gemini-3-pro-image-preview", false);

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
        const prompt = `You are a master pixel artist for a 1990s SNES fantasy RPG.

Task: Transform the provided layout image into a high-fidelity top-down tavern scene, treating the input image as a STRICT BLUEPRINT.

STRICT LAYOUT RULES (Crucial):
- The provided image is a **pixel-perfect blueprint**. Do not deviate from the geometry.
- The colored rectangles are **NOT** just "zones" to place small objects in. They **ARE** the objects. You must fill the entire colored area with the specified material.
- **Red Rectangle (Top):** This entire block is the Opponent's Hand Zone. Texture this exact rectangle as a red velvet mat or dark wooden rack that spans the full width of the block.
- **Green Rectangle (Bottom):** This entire block is the Player's Hand Zone. Texture this exact rectangle as a hunter-green felt mat or wooden rack. It must fill the green footprint completely.
- **Black/Dark Rectangle (Center):** This is the Battlefield. Texture it as a dark green or grey felt battle mat.
- **Brown Side Areas:** These are the wooden tavern table visible on the sides.

Style & Perspective:
- **Strict top-down, orthographic perspective.**
- 16-bit pixel art style with sharp, crisp pixels. No blur.
- Warm, cozy tavern lighting.

Art Direction:
1.  **The Table (Background):** Worn, cluttered wooden surface (scratches, stains) visible *only* in the empty space around the central board. Add organic details like coins or a spilled mug here, but keep them outside the play zones.
2.  **The Board (Center Column):** The Red, Black, and Green zones should look like they are parts of a single cohesive game board or a set of mats laid out on the table.
    -   **Important:** Do not draw small isolated trays. The "Deck Areas" must be wide rectangular surfaces that match the input image's width.`;

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

