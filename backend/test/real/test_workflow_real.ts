
import { describe, it, expect } from 'vitest';
import { compileGenerationGraph } from "../../llm/graph/workflow";
import { GraphState } from "../../llm/graph/state";
import { LLMClient } from "../../llm/client";
import * as dotenv from "dotenv";
import path from 'path';
import fs from 'fs';

dotenv.config();

const projectRoot = path.resolve(__dirname, '../../..');
const runsDir = path.join(projectRoot, '.tmp/runs');

describe('REAL: Workflow E2E', () => {
    const shouldRun = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("dummy");

    it.skipIf(!shouldRun)('should run E2E workflow with real calls', async () => {
        const client = new LLMClient("gemini", "gemini-2.5-flash", false);
        const userInput = "A minimal chess game";

        const app = compileGenerationGraph();

        // Create timestamped run folder
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const runId = `run_${timestamp}`;
        const currentRunDir = path.join(runsDir, runId);

        // We create the dir early so nodes can write to it if needed
        fs.mkdirSync(currentRunDir, { recursive: true });

        console.log(`[Test] Run ID: ${runId}`);
        console.log("Graph compiled. Invoking with useMock: false (REAL CALLS)...");
        console.log("This may take 30-60 seconds...");

        const result = await app.invoke({
            userInput: userInput,
            runId: runId
        }, {
            configurable: {
                client,
                useMock: false
            }
        }) as unknown as GraphState;

        expect(result).toBeDefined();
        expect(result.designDoc).toBeDefined();
        expect(result.initialState).toBeDefined();
        expect(result.reactCode).toBeDefined();

        console.log("Summary:", {
            designDocLength: result.designDoc?.length,
            rules: result.rules ? "Present" : "Missing",
            generatedImage: result.generatedImage,
            assetCount: result.assetMap ? Object.keys(result.assetMap).length : 0,
            reactCodeLength: result.reactCode?.length
        });

        const currentRunAssetsDir = path.join(currentRunDir, "assets");

        // fs.mkdirSync(currentRunDir, { recursive: true });
        fs.mkdirSync(currentRunAssetsDir, { recursive: true });

        console.log(`[Version Control] Saving run to: ${currentRunDir}`);

        // 2. Save Full State Dump
        fs.writeFileSync(path.join(currentRunDir, "workflow_output.json"), JSON.stringify(result, null, 2));

        // 3. Process Assets
        const publicAssetsDir = path.join(projectRoot, "public/generated-assets");
        if (!fs.existsSync(publicAssetsDir)) {
            fs.mkdirSync(publicAssetsDir, { recursive: true });
        }

        // Update assetMap to point to public URLs
        const frontendAssetMap: Record<string, string> = {};

        if (result.assetMap) {
            for (const [key, sourcePath] of Object.entries(result.assetMap)) {
                // Warning: sourcePath might be relative to backend or absolute
                // Ideally, nodes should return absolute paths or paths relative to CWD (backend)
                let absSourcePath = sourcePath as string;
                if (!path.isAbsolute(absSourcePath)) {
                    absSourcePath = path.resolve(process.cwd(), absSourcePath);
                }

                // Check if file exists
                if (fs.existsSync(absSourcePath)) {
                    const fileName = path.basename(absSourcePath);
                    const destRunPath = path.join(currentRunAssetsDir, fileName);
                    const destPublicPath = path.join(publicAssetsDir, fileName);

                    // Copy to Run Dir
                    fs.copyFileSync(absSourcePath, destRunPath);
                    // Copy to Public Dir
                    fs.copyFileSync(absSourcePath, destPublicPath);

                    // Update Map for Game Component (Public URL)
                    frontendAssetMap[key] = `/generated-assets/${fileName}`;
                } else {
                    console.warn(`[Version Control] Warning: Asset file not found at ${absSourcePath}`);
                }
            }
        }

        // Handle generatedImage (Reference Image) from UI Designer
        if (result.generatedImage) {
            let absSourcePath = result.generatedImage as string;
            if (!path.isAbsolute(absSourcePath)) {
                absSourcePath = path.resolve(process.cwd(), absSourcePath);
            }
            if (fs.existsSync(absSourcePath)) {
                const fileName = `reference_${timestamp}.png`;
                const destRunPath = path.join(currentRunDir, fileName);
                // We might not need this in public unless we want to show it, but let's back it up
                fs.copyFileSync(absSourcePath, destRunPath);
            }
        }

        // 4. Save and Sync React Code
        if (result.reactCode) {

            let finalCode = result.reactCode;
            const assetMapString = JSON.stringify(frontendAssetMap, null, 2);

            const regex = /export const ASSET_MAP = \{[\s\S]*?\};/m;
            if (regex.test(finalCode)) {
                finalCode = finalCode.replace(regex, `export const ASSET_MAP = ${assetMapString};`);
                console.log("[Version Control] Updated ASSET_MAP in generated code.");
            } else {
                console.log("[Version Control] Could not find ASSET_MAP to update in code. Appending it.");
                finalCode += `\n\nexport const ASSET_MAP = ${assetMapString};\n`;
            }

            // Save to Run Dir
            fs.writeFileSync(path.join(currentRunDir, "game-slot.tsx"), finalCode);

            // Sync to App (The "Latest")
            const appGeneratedDir = path.join(projectRoot, "app/generated");
            if (!fs.existsSync(appGeneratedDir)) {
                fs.mkdirSync(appGeneratedDir, { recursive: true });
            }
            const appGameSlotPath = path.join(appGeneratedDir, "game-slot.tsx");
            fs.writeFileSync(appGameSlotPath, finalCode);
            console.log(`[Version Control] Synced latest code to: ${appGameSlotPath}`);
        }

    }, 600000); // Increased timeout for file ops & generation (10 mins)
});
