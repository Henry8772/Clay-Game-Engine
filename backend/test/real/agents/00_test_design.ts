
import { describe, it, expect } from 'vitest';
import { LLMClient } from "../../../llm/client";
import { runDesignAgent } from "../../../llm/agents/design_agent";
import * as dotenv from "dotenv";
import fs from 'fs';
import path from 'path';
import { getTestRunDir } from '../../utils';

dotenv.config();

describe('REAL: Design Agent', () => {
    const shouldRun = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("dummy");

    it.skipIf(!shouldRun)('should architect a game design from user request', async () => {
        const client = new LLMClient("gemini", "gemini-2.5-flash", false);
        const userRequest = "A warhammer 40k game in a 2d top down view";

        const design = await runDesignAgent(client, userRequest);

        console.log("Generated Design:", JSON.stringify(design, null, 2));

        expect(design).toBeDefined();

        // Assert Visuals
        // expect(design.art_style).toBeDefined();
        // expect(design.art_style.toLowerCase()).toContain("cyberpunk");
        // expect(design.perspective).toBeDefined();
        // expect(design.background_theme).toBeDefined();

        // // Assert Topology
        // expect(design.grid_type).toBeDefined();
        // // It might be "8x8 Grid" or "Chess Board", just ensure it's a string
        // expect(typeof design.grid_type).toBe("string");

        // // Assert Assets
        // expect(design.player_team).toBeDefined();
        // expect(Array.isArray(design.player_team)).toBe(true);
        // expect(design.player_team.length).toBeGreaterThan(0);

        // expect(design.enemy_team).toBeDefined();
        // expect(Array.isArray(design.enemy_team)).toBe(true);

        // expect(design.ui_elements).toBeDefined();

        // // Assert Logic
        // expect(design.rules_summary).toBeDefined();
        // expect(design.game_loop_mechanics).toBeDefined();

        // Save for visual inspection during dev
        const runDir = getTestRunDir('demo2');
        if (!fs.existsSync(runDir)) {
            fs.mkdirSync(runDir, { recursive: true });
        }
        const outPath = path.join(runDir, "design.json");
        fs.writeFileSync(outPath, JSON.stringify(design, null, 2));
        console.log("Saved design to", outPath);
    }, 60000); // 1 min timeout
});
