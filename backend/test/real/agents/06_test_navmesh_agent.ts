
import { describe, it, expect } from 'vitest';
import { LLMClient } from "../../../llm/client";
import { runNavMeshAgent } from "../../../llm/agents/navmesh_agent";
import * as dotenv from "dotenv";
import fs from 'fs';
import path from 'path';
import { getTestRunDir } from '../../utils';
import { drawNavMesh } from '../../visualization';

dotenv.config();

describe('REAL: NavMesh Agent', () => {
    const shouldRun = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("dummy");

    it.skipIf(!shouldRun)('should generate navmesh from background', async () => {
        const client = new LLMClient("gemini", "gemini-2.5-flash-image", false);

        const runDir = getTestRunDir('run_test_real_agents');
        let bgPath = path.join(runDir, "background.png");

        if (!fs.existsSync(bgPath)) {
            bgPath = path.resolve(__dirname, "../../experiment-3/background.png");
        }

        if (!fs.existsSync(bgPath)) {
            console.warn("Skipping NavMesh Agent test because background.png not found");
            return;
        }

        const bgBuffer = fs.readFileSync(bgPath);

        const navMesh = await runNavMeshAgent(client, bgBuffer);

        expect(navMesh).toBeDefined();
        expect(Array.isArray(navMesh)).toBe(true);
        // We expect some tiles
        expect(navMesh.length).toBeGreaterThan(0);

        const outPath = path.join(runDir, "navmesh.json");
        fs.writeFileSync(outPath, JSON.stringify(navMesh, null, 2));

        // Visualization
        const segmentedBuffer = await drawNavMesh(bgBuffer, navMesh);
        const visualizationPath = path.join(runDir, "navmesh_segmented.png");
        fs.writeFileSync(visualizationPath, segmentedBuffer);
    }, 120000);
});
