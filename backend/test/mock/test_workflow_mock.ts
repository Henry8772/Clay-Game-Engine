
import { describe, it, expect, beforeAll } from 'vitest';
import { compileGenerationGraph } from "../../llm/graph/workflow";
import { GraphState } from "../../llm/graph/state";
import { LLMClient } from "../../llm/client";
import * as dotenv from "dotenv";

dotenv.config();

describe('MOCK: Workflow E2E', () => {
    beforeAll(() => {
        if (!process.env.GEMINI_API_KEY) {
            process.env.GEMINI_API_KEY = "dummy-test-key";
        }
    });

    it('should run E2E workflow with mocks', async () => {
        const client = new LLMClient("gemini", "gemini-2.5-flash", true);
        const userInput = "Test Input";

        const app = compileGenerationGraph();

        const result = await app.invoke({
            userInput: userInput
        }, {
            configurable: {
                client,
                useMock: true
            }
        }) as unknown as GraphState;

        expect(result).toBeDefined();
        expect(result.designDoc).toBeDefined();
        expect(result.initialState).toBeDefined();
        expect(result.rules).toBeDefined();
        expect(result.imagePrompt).toBeDefined();
        expect(result.generatedImage).toBeDefined();
        expect(result.assetMap).toBeDefined();
        expect(Object.keys(result.assetMap || {}).length).toBeGreaterThan(0);
        expect(result.reactCode).toBeDefined();

        // Versioning and Sync Logic (Mock)
        const fs = await import("fs");
        const path = await import("path");

        // 1. Setup Directories
        const projectRoot = path.resolve(__dirname, "../../../");
        const runsDir = path.resolve(projectRoot, ".tmp/runs");

        if (!fs.existsSync(runsDir)) {
            fs.mkdirSync(runsDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const runId = `mock_run_${timestamp}`;
        const currentRunDir = path.join(runsDir, runId);
        const currentRunAssetsDir = path.join(currentRunDir, "assets");

        fs.mkdirSync(currentRunDir, { recursive: true });
        fs.mkdirSync(currentRunAssetsDir, { recursive: true });

        console.log(`[Version Control - Mock] Saving run to: ${currentRunDir}`);
        fs.writeFileSync(path.join(currentRunDir, "workflow_output.json"), JSON.stringify(result, null, 2));

        // 2. Process Assets (Mock)
        const publicAssetsDir = path.join(projectRoot, "public/generated-assets");
        if (!fs.existsSync(publicAssetsDir)) {
            fs.mkdirSync(publicAssetsDir, { recursive: true });
        }

        const frontendAssetMap: Record<string, string> = {};
        if (result.assetMap) {
            for (const [key, sourcePath] of Object.entries(result.assetMap)) {
                // In mock, sourcePath might be relative or dummy
                // MOCK_ASSET_MAP usually has plain strings. 
                // We should simulate creating/copying for the mock to verify the mechanism.
                // Let's create dummy files if they don't exist.

                const fileName = path.basename(sourcePath as string); // e.g. "path.png" or "generated_assets/id.png" -> "id.png"

                // For mock verification, let's create a dummy file in the run dir
                const destRunPath = path.join(currentRunAssetsDir, fileName);
                const destPublicPath = path.join(publicAssetsDir, fileName);

                fs.writeFileSync(destRunPath, "MOCK IMAGE CONTENT");
                fs.writeFileSync(destPublicPath, "MOCK IMAGE CONTENT");

                frontendAssetMap[key] = `/generated-assets/${fileName}`;
            }
        }

        // 3. Save and Sync React Code
        if (result.reactCode) {
            let finalCode = result.reactCode;
            const assetMapString = JSON.stringify(frontendAssetMap, null, 2);

            const regex = /export const ASSET_MAP = \{[\s\S]*?\};/m;
            if (regex.test(finalCode)) {
                finalCode = finalCode.replace(regex, `export const ASSET_MAP = ${assetMapString};`);
            } else {
                finalCode += `\n\nexport const ASSET_MAP = ${assetMapString};\n`;
            }

            fs.writeFileSync(path.join(currentRunDir, "game-slot.tsx"), finalCode);

            const appGeneratedDir = path.join(projectRoot, "app/generated");
            if (!fs.existsSync(appGeneratedDir)) {
                fs.mkdirSync(appGeneratedDir, { recursive: true });
            }
            fs.writeFileSync(path.join(appGeneratedDir, "game-slot.tsx"), finalCode);
            console.log(`[Version Control - Mock] Synced latest code to: ${path.join(appGeneratedDir, "game-slot.tsx")}`);
        }
    });
});
