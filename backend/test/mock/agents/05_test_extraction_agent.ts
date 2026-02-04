
import { describe, it, expect } from 'vitest';
import { runExtractionAgent } from "../../../llm/agents/extraction_agent";
import { MOCK_VISION_ANALYSIS } from "../../../llm/graph/mocks";
import { getTestRunDir } from '../../utils';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

describe('MOCK: Extraction Agent', () => {
    it('should extract assets (using dummy image)', async () => {
        // Create a dummy 1000x1000 white image
        const buffer = await sharp({
            create: {
                width: 1000,
                height: 1000,
                channels: 4,
                background: { r: 255, g: 255, b: 255, alpha: 255 }
            }
        }).png().toBuffer();

        const runDir = getTestRunDir('run_test_mock_agents');
        const extractDir = path.join(runDir, "extracted");

        const files = await runExtractionAgent(buffer, MOCK_VISION_ANALYSIS as any, extractDir);

        expect(files).toBeDefined();
        const extractedPaths = Object.values(files);
        expect(extractedPaths.length).toBe(MOCK_VISION_ANALYSIS.length);
        expect(fs.existsSync(extractDir)).toBe(true);
        expect(fs.readdirSync(extractDir).length).toBeGreaterThan(0);
    });
});
