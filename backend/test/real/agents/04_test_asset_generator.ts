
import { describe, it, expect, beforeAll } from 'vitest';
import { LLMClient } from "../../../llm/client";
import { runAssetGeneratorAgent } from "../../../llm/agents/asset_generator";
import * as dotenv from "dotenv";

dotenv.config();

describe('REAL: 04 Asset Generator Agent', () => {
    let client: LLMClient;
    const shouldRun = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("dummy");

    beforeAll(() => {
        if (!shouldRun) {
            console.warn("⚠️  Skipping Real Asset Generator Test: No valid GEMINI_API_KEY found.");
        }
        client = new LLMClient("gemini", "gemini-2.5-flash", false);
    });

    it.skipIf(!shouldRun)('should generate asset from reference image', async () => {
        const fs = await import("fs");
        const path = await import("path");
        // Ensure .tmp directory exists or use a mock image if not present?
        // The previous test relied on a file existing. 
        // We will keep the same logic but handle the missing file gracefully or expect it to be there if user provided context implies it.
        const imagePath = path.resolve(__dirname, "../../../.tmp/ui_designer_output.png");

        if (!fs.existsSync(imagePath)) {
            console.warn("⚠️  Skipping test: Image not found at " + imagePath);
            return;
        }

        const referenceImageBuffer = fs.readFileSync(imagePath);
        console.log(`[Real] Loaded image from: ${imagePath} (${referenceImageBuffer.length} bytes)`);

        const prompt = "extract the only white knight from the image, keep the style of the bishop, background in green";

        // Use the new agent function
        const resultImageBuffer = await runAssetGeneratorAgent(client, prompt, referenceImageBuffer);

        console.log(`[Real] Generated image (${resultImageBuffer.length} bytes)`);
        expect(resultImageBuffer).toBeDefined();
        expect(resultImageBuffer.length).toBeGreaterThan(0);

        // Save into .tmp/asset_image.png
        const assetImagePath = path.resolve(__dirname, "../../../.tmp/asset_image.png");
        fs.writeFileSync(assetImagePath, resultImageBuffer);
        console.log(`[Real] Saved image to: ${assetImagePath}`);
    });
});
