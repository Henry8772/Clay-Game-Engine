
import { describe, it, expect } from 'vitest';
import { runStateAgent } from "../../../llm/agents/state_agent";
import fs from 'fs';
import path from 'path';
import { getTestRunDir, DEFAULT_EXPERIMENT_ID } from '../../utils';
import { LLMClient } from "../../../llm/client";

describe('REAL: State Agent', () => {
    const shouldRun = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("dummy");
    it.skipIf(!shouldRun)('should combine artifacts into game state', async () => {
        // No LLM needed, pure logic
        const runDir = getTestRunDir('run_test_real_agents');
        let analysisPath = path.join(runDir, "analysis.json");
        let navMeshPath = path.join(runDir, "navmesh.json");

        if (!fs.existsSync(analysisPath)) analysisPath = path.resolve(__dirname, `../../${DEFAULT_EXPERIMENT_ID}/analysis.json`);
        if (!fs.existsSync(navMeshPath)) navMeshPath = path.resolve(__dirname, `../../${DEFAULT_EXPERIMENT_ID}/navmesh.json`);

        if (!fs.existsSync(analysisPath) || !fs.existsSync(navMeshPath)) {
            console.warn("Skipping State Agent test because JSON inputs missing");
            return;
        }


        const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf-8'));
        const navMesh = JSON.parse(fs.readFileSync(navMeshPath, 'utf-8'));

        const runId = path.basename(runDir);

        // Mock Client
        const client = new LLMClient("gemini", "gemini-2.5-flash", false);

        const output = await runStateAgent(client, analysis, navMesh, runId);

        expect(output).toBeDefined();
        expect(output.initialState).toBeDefined();
        expect(output.blueprints).toBeDefined();

        const state = output.initialState;
        expect(state.meta.runId).toBe(runId);

        // Check entities map
        const entityKeys = Object.keys(state.entities);
        expect(entityKeys.length).toBeGreaterThan(0);

        // Verify blueprint linking
        const firstEntity = state.entities[entityKeys[0]];
        expect(firstEntity.t).toBeDefined();
        expect(output.blueprints[firstEntity.t]).toBeDefined();

        // Verify metadata generation
        const bp = output.blueprints[firstEntity.t];
        expect(bp.movement).toBeDefined();
        expect(bp.capabilities).toBeDefined();

        const outPath = path.join(runDir, "gamestate.json");
        fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
    }, 200000);
});
