
import { describe, it, expect, beforeAll } from 'vitest';
import { LLMClient } from "../../../llm/client";
import { runAssetGeneratorAgent } from "../../../llm/agents/asset_generator";
import * as dotenv from "dotenv";

dotenv.config();

describe('REAL: 04 Asset Generator Agent', () => {
    let client: LLMClient;
    const shouldRun = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("dummy");

    beforeAll(() => {
        if (!shouldRun) {
            console.warn("⚠️  Skipping Real Asset Generator Test: No valid GEMINI_API_KEY found.");
        }
        client = new LLMClient("gemini", "gemini-2.5-flash", false);
    });

    it.skipIf(!shouldRun)('should generate asset from reference image', async () => {
        const fs = await import("fs");
        const path = await import("path");
        const chainDir = path.resolve(__dirname, "../../../.tmp/real_chain");
        const architectFile = path.join(chainDir, "architect_output.json");
        const uiImageFile = path.join(chainDir, "ui_designer_output.png");
        const assetsDir = path.join(chainDir, "assets");
        const outputJsonFile = path.join(chainDir, "asset_generator_output.json");

        let assetList: any[] = [];

        if (fs.existsSync(architectFile)) {
            const data = JSON.parse(fs.readFileSync(architectFile, "utf-8"));
            if (data.entityList) {
                assetList = data.entityList.filter((e: any) => e.renderType === "ASSET");
                console.log(`[Real] Loaded ${assetList.length} assets from chain.`);
            }
        }

        if (assetList.length === 0) {
            console.warn("[Real] Chain input not found or empty, using default varied assets.");
            assetList = [
                {
                    id: "king",
                    name: "Chess King",
                    visualPrompt: "A pixel art chess king piece, regal gold and purple",
                    renderType: "ASSET"
                },
                {
                    id: "white_tile",
                    name: "White Tile",
                    visualPrompt: "A single white square grid tile for a game board, pixel art, flat top-down",
                    renderType: "ASSET"
                },
                {
                    id: "black_tile",
                    name: "Black Tile",
                    visualPrompt: "A single black square grid tile for a game board, pixel art, flat top-down",
                    renderType: "ASSET"
                },
                {
                    id: "game_board",
                    name: "Chess Board",
                    visualPrompt: "A top-down 8x8 chess board, strict checkerboard pattern, black and white squares, pixel art, no pieces, empty board",
                    renderType: "ASSET"
                }
            ];
        }

        // Ensure assets directory exists
        if (!fs.existsSync(assetsDir)) {
            fs.mkdirSync(assetsDir, { recursive: true });
        }

        // Reference image check removed as we don't use it anymore
        // let referenceImageBuffer: Buffer;
        // ...

        // Generate for up to 4 assets to cover the requested variety
        const assetsToGenerate = assetList.slice(0, 10);
        const generatedAssets: Record<string, string> = {};

        for (const targetAsset of assetsToGenerate) {
            console.log(`[Real] Generating Asset: ${targetAsset.name} (${targetAsset.id})`);

            // Use the new agent function (no reference image needed)
            const resultImageBuffer = await runAssetGeneratorAgent(client, targetAsset.visualPrompt);

            expect(resultImageBuffer).toBeDefined();
            expect(resultImageBuffer.length).toBeGreaterThan(0);

            // Save into .tmp/real_chain/assets/
            const assetFilename = `${targetAsset.id}.png`;
            const assetPath = path.join(assetsDir, assetFilename);
            fs.writeFileSync(assetPath, resultImageBuffer);
            console.log(`[Real] Saved asset to: ${assetPath}`);

            generatedAssets[targetAsset.id] = assetPath;
        }

        fs.writeFileSync(outputJsonFile, JSON.stringify(generatedAssets, null, 2));
        console.log(`[Real] Saved asset manifest to: ${outputJsonFile}`);
    }, 300000); // Increased timeout for multiple generations
});
