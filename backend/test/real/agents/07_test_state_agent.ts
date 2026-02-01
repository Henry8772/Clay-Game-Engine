
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
        const gameState = runStateAgent(analysis, navMesh, runId);

        expect(gameState).toBeDefined();
        expect(gameState.meta.runId).toBe(runId);
        expect(gameState.entities.length).toBeGreaterThan(0);
        expect(gameState.entities[0].src).toContain(runId);

        const outPath = path.join(runDir, "gamestate.json");
        fs.writeFileSync(outPath, JSON.stringify(gameState, null, 2));
    });
});
