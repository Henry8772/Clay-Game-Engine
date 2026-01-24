
import { describe, it, expect, beforeAll } from 'vitest';
import { LLMClient } from "../../../llm/client";
import { runUIDesignerAgent } from "../../../llm/agents/ui_designer";
import * as dotenv from "dotenv";

dotenv.config();

describe('REAL: 03 UI Designer Agent', () => {
    let client: LLMClient;
    const shouldRun = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("dummy");

    beforeAll(() => {
        if (!shouldRun) {
            console.warn("⚠️  Skipping Real UI Designer Test: No valid GEMINI_API_KEY found.");
        }
        client = new LLMClient("gemini", "gemini-2.5-flash", false);
    });

    it.skipIf(!shouldRun)('should generate target scene prompt and layout', async () => {
        const fs = await import("fs");
        const path = await import("path");
        const chainDir = path.resolve(__dirname, "../../../.tmp/real_chain");
        const inputFile = path.join(chainDir, "design_doc.json");
        const outputPath = path.join(chainDir, "ui_designer_output.json");
        const outputImagePath = path.join(chainDir, "ui_designer_output.png");

        let designDoc = "";

        const data = JSON.parse(fs.readFileSync(inputFile, "utf-8"));
        designDoc = data.designDoc;
        console.log(`[Real] Loaded design doc from chain: ${designDoc.substring(0, 50)}...`);
        console.log(`[Real] UI Designer Input Length: ${designDoc.length}`);

        const result = await runUIDesignerAgent(client, designDoc);

        console.log(`[Real] UI Designer Output Prompt:\n`, result.imagePrompt);
        console.log(`[Real] UI Designer Output Layout:\n`, JSON.stringify(result.visualLayout, null, 2));

        expect(result.imagePrompt).toBeDefined();
        expect(result.imagePrompt.length).toBeGreaterThan(10);
        expect(result.visualLayout.length).toBeGreaterThan(0);
        expect(result.image).toBeDefined();
        expect(result.image).toBeInstanceOf(Buffer);

        expect(result.image).toBeInstanceOf(Buffer);

        if (!fs.existsSync(chainDir)) {
            fs.mkdirSync(chainDir, { recursive: true });
        }
        fs.writeFileSync(outputImagePath, result.image);
        console.log(`[Real] Image saved to: ${outputImagePath}`);

        const outputData = {
            ...result,
            imagePath: outputImagePath,
            image: undefined // Don't save buffer to JSON
        };
        fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
        console.log(`[Real] Saved UI Designer output to: ${outputPath}`);
    });
});
