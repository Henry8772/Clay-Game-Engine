
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
        const runDir = getTestRunDir('boardgame');
        let analysisPath = path.join(runDir, "analysis.json");
        let navMeshPath = path.join(runDir, "navmesh.json");

        if (!fs.existsSync(analysisPath)) analysisPath = path.resolve(__dirname, `../../${DEFAULT_EXPERIMENT_ID}/analysis.json`);
        if (!fs.existsSync(navMeshPath)) navMeshPath = path.resolve(__dirname, `../../${DEFAULT_EXPERIMENT_ID}/navmesh.json`);

        if (!fs.existsSync(analysisPath) || !fs.existsSync(navMeshPath)) {
            console.warn("Skipping State Agent test because JSON inputs missing");
            return;
        }


        const analysisData = JSON.parse(fs.readFileSync(analysisPath, 'utf-8'));
        const navMeshData = JSON.parse(fs.readFileSync(navMeshPath, 'utf-8'));

        const runId = path.basename(runDir);

        // Mock Client
        const client = new LLMClient("gemini", "gemini-2.5-flash", false);

        const output = await runStateAgent(client, analysisData, navMeshData, runId);

        expect(output).toBeDefined();
        expect(output.initialState).toBeDefined();
        expect(output.initialState.entities).toBeDefined();

        const state = output.initialState;
        expect(state.meta).toBeDefined();
        // Check entities map
        const entityKeys = Object.keys(state.entities);
        expect(entityKeys.length).toBeGreaterThan(0);

        const outPath = path.join(runDir, "gamestate.json");
        fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
    }, 200000);
});
