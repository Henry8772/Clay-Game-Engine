
import { describe, it, expect } from 'vitest';
import { LLMClient } from "../../llm/client";
import { config } from "dotenv";
import * as path from 'path';
import * as fs from 'fs';
import { getTestRunDir } from '../utils';

config();

describe('REAL: Image Gen', () => {
    const shouldRun = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("dummy");

    it.skipIf(!shouldRun)('should generate a real image', async () => {
        const client = new LLMClient("gemini", "gemini-3-pro-image-preview", false); // debugMode = false
        const prompt = "A high-angle shot of a tabletop board game setup. Cards are in high-res pixel art. On the bottom player side, there are 5 character cards, each with a matching miniature in the board: a Knight, a Ranger, a Templar, a Healer, and Odin. On the top enemy side, there are 5 monster cards, each with a matching miniature : a Skeleton, a Ghost, a Vampire, a Zombie, and an Orc. All miniatures are placed in fighting positions. Ensure the card is easily identifiable to miniature.";

        const runDir = getTestRunDir('boardgame');
        const referenceBuffer = await fs.promises.readFile(path.join(runDir, "scene_old.png"));

        const config = {
            temperature: 1,
            aspectRatio: "16:9"
        }
        const buffer = await client.editImage(prompt, referenceBuffer, "gemini-3-pro-image-preview", { config });

        expect(buffer).toBeDefined();
        expect(buffer instanceof Buffer).toBe(true);
        expect(buffer.length).toBeGreaterThan(0);
        console.log(`Generated image size: ${buffer.length} bytes`);

        const outputPath = path.join(runDir, "test.png");
        fs.writeFileSync(outputPath, buffer);
        console.log(`Image saved to: ${outputPath}`);
    });
});
