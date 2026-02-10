import { describe, it, expect } from 'vitest';
import { runStateAgent } from "../../../llm/agents/state_agent";
import fs from 'fs';
import path from 'path';
import { getTestRunDir, DEFAULT_EXPERIMENT_ID } from '../../utils';
import { LLMClient } from "../../../llm/client";

describe('REAL: State Agent', () => {
    const shouldRun = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("dummy");

    it.skipIf(!shouldRun)('should map extracted files to blueprints', async () => {
        const runDir = getTestRunDir('run_1770725331397_328011b5');

        // 1. Setup Paths
        const analysisPath = path.join(runDir, "analysis.json");
        const navMeshPath = path.join(runDir, "navmesh.json");
        const designPath = path.join(runDir, "design.json");
        const extractedDir = path.join(runDir, "extracted");

        // Fallbacks for testing environment
        if (!fs.existsSync(analysisPath)) {
            console.warn("Skipping test: Missing analysis.json");
            return;
        }

        const analysisData = JSON.parse(fs.readFileSync(analysisPath, 'utf-8'));
        const navMeshData = fs.existsSync(navMeshPath) ? JSON.parse(fs.readFileSync(navMeshPath, 'utf-8')) : {};
        const designData = JSON.parse(fs.readFileSync(designPath, 'utf-8'));

        // 2. Build Real Manifest from File System
        // This mirrors the file structure you showed: puzzle/extracted/hero.png
        const assetManifest: Record<string, string> = {};

        if (fs.existsSync(extractedDir)) {
            const files = fs.readdirSync(extractedDir);
            files.forEach(file => {
                // The key doesn't matter much, the value is what the agent uses
                if (file.endsWith('.png')) {
                    assetManifest[path.parse(file).name] = file;
                }
            });
        }

        console.log("Asset Manifest for Agent:", assetManifest);

        // 3. Run Agent
        const client = new LLMClient("gemini", "gemini-3-flash-preview", false);
        const output = await runStateAgent(
            client,
            analysisData,
            navMeshData,
            "state",
            designData,
            assetManifest
        );

        // 4. Verify Asset Mapping
        const blueprints = Object.values(output.initialState.blueprints) as any[];

        // Check if ANY blueprint successfully linked to the extracted folder
        const hasExtractedAsset = blueprints.some(bp => bp.src.includes("extracted/"));

        console.log("Generated Blueprints:", blueprints.map(b => `${b.label} -> ${b.src}`));

        expect(output).toBeDefined();
        // We strictly expect the path to be formatted correctly
        expect(hasExtractedAsset).toBe(true);

        // Save
        fs.writeFileSync(path.join(runDir, "gamestate.json"), JSON.stringify(output, null, 2));

    }, 200000);
});