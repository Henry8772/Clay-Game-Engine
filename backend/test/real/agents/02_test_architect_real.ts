
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

    it.skipIf(!shouldRun)('should generate initial state and rules from design doc', async () => {
        // Load input from chain if available
        const fs = await import("fs");
        const path = await import("path");
        const chainDir = path.resolve(__dirname, "../../../.tmp/real_chain");
        const inputFile = path.join(chainDir, "design_doc.json");
        const outputFile = path.join(chainDir, "architect_output.json");

        let designDoc = "";
        const data = JSON.parse(fs.readFileSync(inputFile, "utf-8"));
        designDoc = data.designDoc;

        console.log(`[Real] Architect Input Doc Length: ${designDoc.length}`);

        const res = await runArchitectAgent(client, designDoc);

        console.log(`[Real] Architect Output State:\n`, JSON.stringify(res.initialState, null, 2));
        console.log(`[Real] Architect Output Rules:\n`, res.rules);
        console.log(`[Real] Architect Output Entity List:\n`, JSON.stringify(res.entityList, null, 2));

        expect(res.initialState).toBeDefined();
        expect(res.rules).toBeDefined();
        expect(res.entityList).toBeDefined();
        expect(Array.isArray(res.entityList)).toBe(true);
        expect(res.entityList.length).toBeGreaterThan(0);
        expect(res.entityList[0].visualPrompt).toBeDefined();
        expect(res.entityList[0].visualPrompt).toBeDefined();

        // Save output for chaining
        if (!fs.existsSync(chainDir)) {
            fs.mkdirSync(chainDir, { recursive: true });
        }
        const outFile = path.join(chainDir, "architect_output.json");
        fs.writeFileSync(outFile, JSON.stringify(res, null, 2));
        console.log(`[Real] Saved architect output to: ${outFile}`);
    }, 120000);
});
