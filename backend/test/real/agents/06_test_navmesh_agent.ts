
import { describe, it, expect } from 'vitest';
import { LLMClient } from "../../../llm/client";
import { runNavMeshAgent } from "../../../llm/agents/navmesh_agent";
import { drawNavMeshCentroid, runNavMesCentroidhAgent } from "../../../llm/agents/navmesh_agent_centroid";
import * as dotenv from "dotenv";
import fs from 'fs';
import path from 'path';
import { getTestRunDir, DEFAULT_EXPERIMENT_ID } from '../../utils';
import { drawNavMesh } from '../../../llm/utils/image_processor';
// remove drawNavMesh import as we use the one from agent now

dotenv.config();

describe('REAL: NavMesh Agent', () => {
    const shouldRun = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("dummy");

    it.skipIf(!shouldRun)('should generate navmesh from background', async () => {
        const client = new LLMClient("gemini", "gemini-3-flash-preview", false);

        const runDir = getTestRunDir('puzzle');
        let bgPath = path.join(runDir, "background.png");

        if (!fs.existsSync(bgPath)) {
            bgPath = path.resolve(__dirname, `../../${DEFAULT_EXPERIMENT_ID}/background.png`);
        }

        if (!fs.existsSync(bgPath)) {
            console.warn("Skipping NavMesh Agent test because background.png not found");
            return;
        }

        const bgBuffer = fs.readFileSync(bgPath);


        const designPath = path.join(runDir, "design.json");
        if (!fs.existsSync(designPath)) {
            console.warn("Skipping NavMesh Agent test because design.json not found");
            return;
        }
        const design = JSON.parse(fs.readFileSync(designPath, 'utf-8'));

        const result = await runNavMeshAgent(client, bgBuffer, design);

        // expect(result).toBeDefined();
        // expect(result.nav_mesh).toBeDefined();
        // expect(Array.isArray(result.nav_mesh)).toBe(true);
        // expect(result.calibration).toBeDefined();

        // // We expect some tiles
        // expect(result.nav_mesh.length).toBeGreaterThan(0);

        const outPath = path.join(runDir, "navmesh.json");
        fs.writeFileSync(outPath, JSON.stringify(result, null, 2));

        // Visualization
        // const segmentedBuffer = await drawNavMesh(bgBuffer, result);
        const segmentedBuffer = await drawNavMesh(bgBuffer, result);
        const visualizationPath = path.join(runDir, "navmesh_segmented.png");
        fs.writeFileSync(visualizationPath, segmentedBuffer);
    }, 120000);
});
