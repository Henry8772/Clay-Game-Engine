
import { describe, it, expect } from 'vitest';
import { runStateAgent } from "../../../llm/agents/state_agent";
import { runExtractionAgent } from "../../../llm/agents/extraction_agent";
import fs from 'fs';
import path from 'path';
import { getTestRunDir, DEFAULT_EXPERIMENT_ID } from '../../utils';
import { LLMClient } from "../../../llm/client";

describe('REAL: State Agent', () => {
    const shouldRun = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("dummy");

    it.skipIf(!shouldRun)('should combine artifacts into game state', async () => {
        const runDir = getTestRunDir('boardgame');
        let analysisPath = path.join(runDir, "analysis.json");
        let navMeshPath = path.join(runDir, "navmesh.json");
        let spritePath = path.join(runDir, "sprites.png");

        // Fallback to default experiment if not found in run dir
        if (!fs.existsSync(analysisPath)) analysisPath = path.resolve(__dirname, `../../${DEFAULT_EXPERIMENT_ID}/analysis.json`);
        if (!fs.existsSync(navMeshPath)) navMeshPath = path.resolve(__dirname, `../../${DEFAULT_EXPERIMENT_ID}/navmesh.json`);
        if (!fs.existsSync(spritePath)) spritePath = path.resolve(__dirname, `../../${DEFAULT_EXPERIMENT_ID}/sprites.png`);

        if (!fs.existsSync(analysisPath) || !fs.existsSync(navMeshPath) || !fs.existsSync(spritePath)) {
            console.warn("Skipping State Agent test because JSON inputs or sprites.png missing");
            return;
        }

        const analysisData = JSON.parse(fs.readFileSync(analysisPath, 'utf-8'));
        const navMeshData = JSON.parse(fs.readFileSync(navMeshPath, 'utf-8'));
        const spriteBuffer = fs.readFileSync(spritePath);

        const runId = path.basename(runDir);

        // Real Client (even if not strictly used by this deterministic agent, likely consistent with intent)
        const client = new LLMClient("gemini", "gemini-2.5-flash", false);

        // 1. Generate Manifest Real-Time (No Mock!)
        const extractDir = path.join(runDir, "extracted");
        if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true, force: true });

        console.log("Generating real manifest from extraction agent...");
        const extractedAssets = await runExtractionAgent(spriteBuffer, analysisData, extractDir);

        // 2. Run State Agent with Real Manifest
        const output = await runStateAgent(client, analysisData, navMeshData, runId, extractedAssets);

        expect(output).toBeDefined();
        expect(output.initialState).toBeDefined();
        expect(output.initialState.entities).toBeDefined();

        const state = output.initialState;
        expect(state.meta).toBeDefined();

        // Check entities map
        const entityKeys = Object.keys(state.entities);
        expect(entityKeys.length).toBeGreaterThan(0);

        // Check Blueprints
        expect(output.initialState.blueprints).toBeDefined();
        const blueprints = output.initialState.blueprints;
        const blueprintKeys = Object.keys(blueprints);
        expect(blueprintKeys.length).toBeGreaterThan(0);

        // Verify correct linking using real data logic
        // We know 'boardgame' likely has logical pairs.
        const hasCard = blueprintKeys.some(k => blueprints[k].type === 'item' && k.includes('card'));
        if (hasCard) {
            const cardBp = Object.values(blueprints).find((b: any) => b.type === 'item' && b.label.toLowerCase().includes('card')) as any;
            if (cardBp && cardBp.spawns) {
                expect(blueprints[cardBp.spawns]).toBeDefined();
                console.log(`Verified Card ${cardBp.label} spawns ${blueprints[cardBp.spawns].label}`);
            }
        }

        const outPath = path.join(runDir, "gamestate.json");
        fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

        // Also check engine tools presence
        expect(output.engine_tools).toBeDefined();
        expect(output.engine_tools.length).toBe(5);
    }, 200000);
});
