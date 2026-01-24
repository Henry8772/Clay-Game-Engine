
import { describe, it, expect, beforeAll } from 'vitest';
import { LLMClient } from "../../../llm/client";
import { nodeAssetGenSwarm } from "../../../llm/graph/nodes"; // Assuming exported
import { GraphState } from "../../../llm/graph/state";
import * as dotenv from "dotenv";

dotenv.config();

describe('REAL: Graph Node - Asset Swarm', () => {
    let client: LLMClient;
    const shouldRun = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("dummy");

    beforeAll(() => {
        if (!shouldRun) {
            console.warn("⚠️  Skipping Real Asset Swarm Node Test: No valid GEMINI_API_KEY found.");
        }
        client = new LLMClient("gemini", "gemini-2.5-flash", false);
    });

    it.skipIf(!shouldRun)('should only generate assets for ASSET renderType', async () => {
        const fs = await import("fs");
        const path = await import("path");

        // 1. Setup Mock State
        // Needs entityList and generatedImage (path)

        // Ensure we have a dummy image to read
        const dummyImagePath = path.resolve(__dirname, "../../../.tmp/test_reference.png");
        // Create a 1x1 png if not exists
        if (!fs.existsSync(dummyImagePath)) {
            // minimal 1x1 transparent png
            const buffer = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", 'base64');
            fs.mkdirSync(path.dirname(dummyImagePath), { recursive: true });
            fs.writeFileSync(dummyImagePath, buffer);
        }

        const mockState: Partial<GraphState> = {
            generatedImage: dummyImagePath,
            entityList: [
                {
                    id: "asset_item_1",
                    name: "Test Asset",
                    renderType: "ASSET",
                    visualPrompt: "A pixel art red ball",
                    description: "An asset to generate"
                },
                {
                    id: "ui_component_1",
                    name: "Test Component",
                    renderType: "COMPONENT",
                    visualPrompt: "A UI text box",
                    description: "A component to skip"
                }
            ]
        };

        // 2. Call the Node
        // Need to pass config with client
        const config = { configurable: { client, useMock: false } };

        console.log("Starting nodeAssetGenSwarm execution...");
        const result = await nodeAssetGenSwarm(mockState as GraphState, config);

        console.log("Node Result:", result);

        // 3. Verify
        expect(result.assetMap).toBeDefined();

        // Should have asset_item_1
        expect(result.assetMap["asset_item_1"]).toBeDefined();
        expect(result.assetMap["asset_item_1"]).toContain("generated_assets/asset_item_1.png");

        // Should NOT have ui_component_1
        expect(result.assetMap["ui_component_1"]).toBeUndefined();
    });
});
