
import { describe, it, expect } from 'vitest';
import { runExtractionAgent } from "../../../llm/agents/extraction_agent";
import fs from 'fs';
import path from 'path';
import { getTestRunDir, DEFAULT_EXPERIMENT_ID } from '../../utils';

describe('REAL: Extraction Agent', () => {

    it('should extract assets based on analysis', async () => {
        // No LLM needed for this step, uses Sharp
        const runDir = getTestRunDir('demo2');
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
        const extractedPaths = Object.values(files);
        expect(extractedPaths.length).toBeGreaterThan(0);
        // files is now a map of Label -> Path ("extracted/foo.png")
        // we need to resolve it relative to outputDir's parent or just check the filename
        const firstFile = extractedPaths[0].split('/').pop()!;
        expect(fs.existsSync(path.join(outputDir, firstFile))).toBe(true);

    });
});
