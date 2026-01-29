import { describe, it, expect } from 'vitest';
import { LLMClient } from "../../llm/client";
import { runAssetGeneratorAgent } from "../../llm/agents/asset_generator";
import { config } from "dotenv";
import * as path from 'path';
import * as fs from 'fs';

config();

// Load environment variables
const backendEnvPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(backendEnvPath)) config({ path: backendEnvPath });

const ASSETS = [
    {
        id: 'card-1',
        name: 'Azure Drake',
        // Detailed "One-Shot" Prompt
        visualPrompt: `
            A full Hearthstone-style trading card in high-quality 8-bit pixel art.
            
            Subject: A Azure Drake (Blue Dragon) flying in the center oval.
            
            Card Elements:
            1. Frame: Neutral grey stone texture with ornate borders.
            2. Top Left: Blue Mana Crystal with number "5".
            3. Bottom Left: Yellow Sword icon with number "4".
            4. Bottom Right: Red Blood Drop icon with number "4".
            5. Center: Name banner reading "Azure Drake".
            6. Bottom: Text box with parchment texture reading "Spell Damage +1".
            7. Rarity: A blue gem in the center below the art.
            
            Style: Strictly 8-bit SNES pixel art. Vibrant colors. Sharp edges.
            Composition: Full card visible, isolated on a black background.
            `
    },
    {
        id: 'card-2',
        name: 'Ragnaros',
        visualPrompt: `
            A full Hearthstone-style trading card in high-quality 8-bit pixel art.
            
            Subject: Ragnaros the Firelord (Magma Elemental) rising from fire in the center oval.
            
            Card Elements:
            1. Frame: Neutral grey stone texture with ornate borders.
            2. Top Left: Blue Mana Crystal with number "8".
            3. Bottom Left: Yellow Sword icon with number "8".
            4. Bottom Right: Red Blood Drop icon with number "8".
            5. Center: Name banner reading "Ragnaros".
            6. Bottom: Text box with parchment texture reading "Can't Attack.".
            7. Rarity: An orange legendary gem in the center below the art.
            
            Style: Strictly 8-bit SNES pixel art. Vibrant colors. Sharp edges.
            Composition: Full card visible, isolated on a black background.
            `
    }
];

describe('REAL: Hearthstone Asset Swarm (Raw Generation)', () => {
    const key = process.env.GEMINI_API_KEY;
    const shouldRun = key && !key.includes("dummy");

    it.skipIf(!shouldRun)('should generate full cards using Gemini 2.0', async () => {
        // Switch to the high-capability experimental model
        const client = new LLMClient("gemini", "gemini-2.5-flash-image", false);

        const publicAssetsDir = path.resolve(__dirname, "../../../public/assets/hearthstone");
        if (!fs.existsSync(publicAssetsDir)) fs.mkdirSync(publicAssetsDir, { recursive: true });

        console.log(`\n🎨 Generating ${ASSETS.length} Raw Hearthstone Cards...\n`);

        for (const asset of ASSETS) {
            console.log(`[Generating] ${asset.name}...`);

            // 1. Generate Raw Image (Native 2:3 Ratio)
            // No post-processing. We trust the model.
            const rawCard = await runAssetGeneratorAgent(
                client,
                asset.visualPrompt,
                { aspectRatio: "2:3" } // Matches the TCG shape perfectly
            );

            // 2. Save directly
            const outputPath = path.join(publicAssetsDir, `${asset.id}.png`);
            fs.writeFileSync(outputPath, rawCard);
            console.log(`✅ Saved Raw: ${outputPath}`);
        }
    }, 300000);
});