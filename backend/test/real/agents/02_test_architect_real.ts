
import { describe, it, expect, beforeAll } from 'vitest';
import { LLMClient } from "../../../llm/client";
import { runArchitectAgent } from "../../../llm/agents/architect";
import * as dotenv from "dotenv";

dotenv.config();

describe('REAL: 02 Architect Agent', () => {
    let client: LLMClient;
    const shouldRun = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("dummy");

    beforeAll(() => {
        if (!shouldRun) {
            console.warn("⚠️  Skipping Real Architect Test: No valid GEMINI_API_KEY found.");
        }
        client = new LLMClient("gemini", "gemini-2.5-flash", false);
    });

    it.skipIf(!shouldRun)('should generate initial state and blueprints from design doc', async () => {
        // Load input from chain if available
        const fs = await import("fs");
        const path = await import("path");
        const chainDir = path.resolve(__dirname, "../../../.tmp/real_chain");
        const inputFile = path.join(chainDir, "design_doc.json");

        // Use mock input if previous step didn't run
        let designDoc = "Game: Chess. Board: 8x8. Pieces: King, Queen, etc.";
        if (fs.existsSync(inputFile)) {
            const data = JSON.parse(fs.readFileSync(inputFile, "utf-8"));
            designDoc = data.designDoc;
        }

        console.log(`[Real] Architect Input Doc Length: ${designDoc.length}`);

        const res = await runArchitectAgent(client, designDoc);

        console.log(`[Real] Architect Output State:\n`, res.initialState);
        console.log(`[Real] Architect Output Rules:\n`, res.rules);
        console.log(`[Real] Architect Output Blueprints:\n`, res.blueprints);

        // Universal State Structure Checks
        expect(res.initialState).toBeDefined();
        expect(res.initialState.meta).toBeDefined();
        expect(res.initialState.zones).toBeDefined();
        expect(res.initialState.entities).toBeDefined();

        expect(res.rules).toBeDefined();

        // Blueprint Checks
        expect(res.blueprints).toBeDefined();
        const blueprintKeys = Object.keys(res.blueprints);
        expect(blueprintKeys.length).toBeGreaterThan(0);

        // Check one blueprint
        const firstBP = res.blueprints[blueprintKeys[0]];
        expect(firstBP.visualPrompt).toBeDefined();
        expect(firstBP.renderType).toBeDefined();

        // Save output for chaining
        if (!fs.existsSync(chainDir)) {
            fs.mkdirSync(chainDir, { recursive: true });
        }
        const outFile = path.join(chainDir, "architect_output.json");
        fs.writeFileSync(outFile, JSON.stringify(res, null, 2));
        console.log(`[Real] Saved architect output to: ${outFile}`);
    }, 120000);
});
