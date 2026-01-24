
import { describe, it, expect } from 'vitest';
import { compileGenerationGraph } from "../../llm/graph/workflow";
import { GraphState } from "../../llm/graph/state";
import { LLMClient } from "../../llm/client";
import * as dotenv from "dotenv";

dotenv.config();

describe('REAL: Workflow E2E', () => {
    const shouldRun = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("dummy");

    it.skipIf(!shouldRun)('should run E2E workflow with real calls', async () => {
        const client = new LLMClient("gemini", "gemini-2.5-flash", false);
        const userInput = "A minimal Pong game.";

        const app = compileGenerationGraph();

        console.log("Graph compiled. Invoking with useMock: false (REAL CALLS)...");
        console.log("This may take 30-60 seconds...");

        const result = await app.invoke({
            userInput: userInput
        }, {
            configurable: {
                client,
                useMock: false
            }
        }) as unknown as GraphState;

        expect(result).toBeDefined();
        expect(result.designDoc).toBeDefined();
        expect(result.initialState).toBeDefined();
        expect(result.reactCode).toBeDefined();

        console.log("Summary:", {
            designDocLength: result.designDoc?.length,
            rules: result.rules ? "Present" : "Missing",
            generatedImage: result.generatedImage,
            assetCount: result.assetMap ? Object.keys(result.assetMap).length : 0,
            reactCodeLength: result.reactCode?.length
        });

        // Debug output for manual verification
        const fs = await import("fs");
        const path = await import("path");
        const outDir = path.resolve(__dirname, "../../../.tmp/real_chain");
        if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir, { recursive: true });
        }
        fs.writeFileSync(path.join(outDir, "workflow_output.json"), JSON.stringify(result, null, 2));

        if (result.reactCode) {
            fs.writeFileSync(path.join(outDir, "renderer_output.tsx"), result.reactCode);
        }

    }, 60000); // Set timeout to 60s
});
