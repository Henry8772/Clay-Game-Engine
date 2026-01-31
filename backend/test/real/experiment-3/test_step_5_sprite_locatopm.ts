import { describe, it } from 'vitest';
import { GeminiBackend } from '../../../llm/backend';
import { config } from "dotenv";
import * as path from 'path';
import * as fs from 'fs';
import sharp from 'sharp'; // 用于画图验证

config();
const backendEnvPath = path.resolve(__dirname, '../../../.env');
if (fs.existsSync(backendEnvPath)) config({ path: backendEnvPath });

describe('EXPERIMENT: Step 5B - AI NavMesh Generation', () => {
    const key = process.env.GEMINI_API_KEY;
    const shouldRun = key && !key.includes("dummy");

    it.skipIf(!shouldRun)('should auto-detect all playable tiles via Vision', async () => {
        const currentDir = __dirname;
        const bgPath = path.join(currentDir, "background.png"); // 使用无棋子的背景图

        if (!fs.existsSync(bgPath)) throw new Error("Background not found. Run Step 1 first.");
        const bgBuffer = fs.readFileSync(bgPath);

        console.log(`\n🗺️ Phase 5B: AI Mapping (NavMesh Generation)...`);

        const backend = new GeminiBackend(key!);

        const mappingPrompt = `
            Look at this top-down game board.
            
            **Mission:**
            Identify EVERY single "Playable Tile" or "Grid Cell" on the central floor area.
            Also identify the "Sidebar Slots" or "UI Zones".

            **Context:**
            This is a 7x6 grid game, so I expect approximately 42 floor tiles.
            I also expect 2-4 sidebar slots on the left/right.

            **Output Requirement:**
            Return a JSON list of bounding boxes [ymin, xmin, ymax, xmax] (0-1000 normalized).
            
            **Labels:**
            - Use "tile_r{row}_c{col}" if you can confidently determine rows/cols.
            - Otherwise, just use "tile" and we will sort them later.
            - Use "sidebar_slot" for UI areas.

            JSON Format:
            [
              {"box_2d": [0,0,100,100], "label": "tile"},
              ...
            ]
        `;

        const config = {
            temperature: 0.5,
            responseMimeType: "application/json",
            thinkingConfig: {
                thinkingLevel: 'HIGH',
            },
        };

        const imagePart = {
            inlineData: {
                data: bgBuffer.toString('base64'),
                mimeType: "image/png"
            }
        };

        const responseText = await backend.generateContent(
            [{ role: "user", parts: [{ text: mappingPrompt }, imagePart] }],
            "gemini-3-flash-preview",
            {
                config: config
            }
        );

        // 清理 JSON
        const navMesh = JSON.parse(responseText);

        console.log(`   ✅ AI Detected ${navMesh.length} interactive zones.`);

        console.log("   🔍 Raw Analysis:", responseText.substring(0, 100) + "...");
        const detectedItems = JSON.parse(responseText);
        console.log(`   ✅ Detected ${detectedItems.length} items.`);

        const analysisPath = path.join(currentDir, "navmesh.json");
        fs.writeFileSync(analysisPath, JSON.stringify(detectedItems, null, 2));
        console.log(`   ✅ Saved Analysis: ${analysisPath}`);

    }, 120000);
});