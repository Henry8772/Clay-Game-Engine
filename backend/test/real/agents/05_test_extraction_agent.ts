
import { describe, it, expect } from 'vitest';
import { runExtractionAgent } from "../../../llm/agents/extraction_agent";
import fs from 'fs';
import path from 'path';
import { getTestRunDir, DEFAULT_EXPERIMENT_ID } from '../../utils';

describe('REAL: Extraction Agent', () => {

    it('should extract assets based on analysis', async () => {
        // No LLM needed for this step, uses Sharp
        const runDir = getTestRunDir('run_test_real_agents');
        let spritePath = path.join(runDir, "sprites.png");
        let analysisPath = path.join(runDir, "analysis.json");

        if (!fs.existsSync(spritePath)) spritePath = path.resolve(__dirname, `../../${DEFAULT_EXPERIMENT_ID}/sprites.png`);
        if (!fs.existsSync(analysisPath)) analysisPath = path.resolve(__dirname, `../../${DEFAULT_EXPERIMENT_ID}/analysis.json`);

        if (!fs.existsSync(spritePath) || !fs.existsSync(analysisPath)) {
            console.warn("Skipping Extraction Agent test because input files missing");
            return;
        }

        const spriteBuffer = fs.readFileSync(spritePath);
        const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf-8'));

        const outputDir = path.join(runDir, "extracted");
        if (fs.existsSync(outputDir)) {
            fs.rmSync(outputDir, { recursive: true, force: true });
        }

        const files = await runExtractionAgent(spriteBuffer, analysis, outputDir);

        expect(files).toBeDefined();
        expect(files.length).toBeGreaterThan(0);
        expect(fs.existsSync(path.join(outputDir, files[0]))).toBe(true);

    });
});
