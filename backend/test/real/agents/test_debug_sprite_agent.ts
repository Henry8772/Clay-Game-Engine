
import { describe, it, expect } from 'vitest';
import { LLMClient } from "../../../llm/client";
import { runSpriteAgent } from "../../../llm/agents/sprite_agent";
import * as dotenv from "dotenv";
import fs from 'fs';
import path from 'path';
import { getTestRunDir } from '../../utils';

dotenv.config();

describe('DEBUG: Sprite Agent Dual-Pass', () => {
    // Only run if GEMINI_API_KEY is present
    const shouldRun = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("dummy");

    it.skipIf(!shouldRun)('should generate white, black, and transparent sprites from hearthstone asset', async () => {
        const client = new LLMClient("gemini", "gemini-2.5-flash-image", false);

        // Path to the specific asset requested by user
        // Assuming the test runs from 'backend/' or root
        let assetPath = path.resolve(__dirname, "../../../../../public/assets/generated/sprites.png");

        if (!fs.existsSync(assetPath)) {
            // Try resolving from backend root if running via vitest inside backend
            assetPath = path.resolve(process.cwd(), "../public/assets/generated/sprites.png");
        }

        if (!fs.existsSync(assetPath)) {
            console.warn(`Skipping Debug Test: Asset not found at ${assetPath}`);
            return;
        }

        console.log(`[DebugTest] Using asset: ${assetPath}`);
        const sceneBuffer = fs.readFileSync(assetPath);

        const runDir = getTestRunDir('run_debug_sprite_agent');
        console.log(`[DebugTest] Output directory: ${runDir}`);

        const transparentBuffer = await runSpriteAgent(client, sceneBuffer, (white, black) => {
            console.log("[DebugTest] Saving intermediate buffers...");
            fs.writeFileSync(path.join(runDir, "sprites_white.png"), white);
            fs.writeFileSync(path.join(runDir, "sprites_black.png"), black);
        });

        expect(transparentBuffer).toBeDefined();

        const finalPath = path.join(runDir, "sprites_transparent.png");
        fs.writeFileSync(finalPath, transparentBuffer);

        console.log(`[DebugTest] Saved outputs to:\n  - ${path.join(runDir, "sprites_white.png")}\n  - ${path.join(runDir, "sprites_black.png")}\n  - ${finalPath}`);
    }, 120000);
});
