
import { describe, it, expect, beforeAll } from 'vitest';
import { LLMClient } from "../../../llm/client";
import { runRendererAgent } from "../../../llm/agents/renderer";
import * as dotenv from "dotenv";

dotenv.config();

describe('REAL: 05 Renderer Agent', () => {
    let client: LLMClient;
    const shouldRun = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("dummy");

    beforeAll(() => {
        if (!shouldRun) {
            console.warn("⚠️  Skipping Real Renderer Test: No valid GEMINI_API_KEY found.");
        }
        client = new LLMClient("gemini", "gemini-2.5-flash", false);
    });

    it.skipIf(!shouldRun)('should generate React code from state and assets', async () => {
        const fs = await import("fs");
        const path = await import("path");
        const chainDir = path.resolve(__dirname, "../../../.tmp/real_chain");
        const uiFile = path.join(chainDir, "ui_designer_output.json");
        const architectFile = path.join(chainDir, "architect_output.json");
        const assetsManifestFile = path.join(chainDir, "asset_generator_output.json");
        const outputReactFile = path.join(chainDir, "renderer_output.tsx");

        let layout: string[] = [];
        let state: any = {};
        let assetMap: Record<string, string> = {};

        // 1. Load Layout from UI Designer Output
        if (fs.existsSync(uiFile)) {
            const uiData = JSON.parse(fs.readFileSync(uiFile, "utf-8"));
            layout = uiData.visualLayout || [];
            console.log(`[Real] Loaded layout with ${layout.length} items from chain.`);
        } else {
            // Warn
            console.warn("[Real] UI Designer output not found, using default layout.");
            layout = [];
        }

        // 2. Load State from Architect Output
        if (fs.existsSync(architectFile)) {
            const architectData = JSON.parse(fs.readFileSync(architectFile, "utf-8"));
            state = architectData.initialState || {};
            console.log(`[Real] Loaded initial state from chain.`);
        } else {
            console.warn("[Real] Architect output not found, using empty state.");
            state = {};
        }

        // 3. Load Assets from Asset Generator Output (or fallback to checking files)
        if (fs.existsSync(assetsManifestFile)) {
            const generatedAssets = JSON.parse(fs.readFileSync(assetsManifestFile, "utf-8"));
            assetMap = generatedAssets;
            console.log(`[Real] Loaded asset map with ${Object.keys(assetMap).length} items from chain.`);
        } else {
            console.warn("[Real] Asset manifest not found, using empty asset map.");
        }

        console.log(`[Real] Renderer Input Layout:`, layout);
        console.log(`[Real] Renderer Input State:`, state);
        console.log(`[Real] Renderer Asset Map Keys:`, Object.keys(assetMap));

        const res = await runRendererAgent(client, layout, state, assetMap);

        console.log(`[Real] Renderer Output Code:\n`, res);

        expect(res).toBeDefined();
        // expect(res).toContain("React");

        // Ensure dir exists
        if (!fs.existsSync(chainDir)) {
            fs.mkdirSync(chainDir, { recursive: true });
        }

        fs.writeFileSync(outputReactFile, res);
        console.log(`[Real] Saved React code to: ${outputReactFile}`);
    }, 300000);
});
