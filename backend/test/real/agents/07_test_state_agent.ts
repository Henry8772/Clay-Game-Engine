
import { describe, it, expect } from 'vitest';
import { runStateAgent } from "../../../llm/agents/state_agent";
import fs from 'fs';
import path from 'path';
import { getTestRunDir } from '../../utils';

describe('REAL: State Agent', () => {

    it('should combine artifacts into game state', async () => {
        // No LLM needed, pure logic
        const runDir = getTestRunDir('run_test_real_agents');
        let analysisPath = path.join(runDir, "analysis.json");
        let navMeshPath = path.join(runDir, "navmesh.json");

        if (!fs.existsSync(analysisPath)) analysisPath = path.resolve(__dirname, "../../experiment-3/analysis.json");
        if (!fs.existsSync(navMeshPath)) navMeshPath = path.resolve(__dirname, "../../experiment-3/navmesh.json");

        if (!fs.existsSync(analysisPath) || !fs.existsSync(navMeshPath)) {
            console.warn("Skipping State Agent test because JSON inputs missing");
            return;
        }


        const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf-8'));
        const navMesh = JSON.parse(fs.readFileSync(navMeshPath, 'utf-8'));

        const runId = path.basename(runDir);

        // Mock Client
        const mockClient = { isDebug: true, generateJson: async () => ({}) } as any;

        const output = await runStateAgent(mockClient, analysis, navMesh, runId);

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
    });
});
