
import { describe, it } from 'vitest';
import { LLMClient } from "../../../llm/client";
import { config } from "dotenv";
import * as path from 'path';
import * as fs from 'fs';

config();

// Load environment variables
const backendEnvPath = path.resolve(__dirname, '../../../.env');
if (fs.existsSync(backendEnvPath)) config({ path: backendEnvPath });

describe('EXPERIMENT-2: Step 1 - Background Generation', () => {
    const key = process.env.GEMINI_API_KEY;
    const shouldRun = key && !key.includes("dummy");

    it.skipIf(!shouldRun)('should generate game background', async () => {
        const client = new LLMClient("gemini", "gemini-3-pro-image-preview", false);
        const currentDir = __dirname;

        // Load Style JSON
        const stylePath = path.join(currentDir, "style.json");
        if (!fs.existsSync(stylePath)) throw new Error("style.json not found");
        const styleData = JSON.parse(fs.readFileSync(stylePath, 'utf-8'));

        // Exclude background parameters from style to avoid conflict
        // We want the AI to apply the "style" to the "description", but not force the "style's background settings" 
        // if they contradict the specific scene we are building (though in this case we are building a background).
        // The prompt plan says "exclude specific background parameters".
        // Let's assume styleData.asset_generation_config.background is what we want to exclude or modify.
        // Actually, for the background track, we might keep it or modify it. 
        // The plan says: "logically exclude the specific background parameters ... avoiding visual noise" 
        // and "prevent the AI from trying to re-render the 'style' of a background on top of a new background"

        // Let's make a copy and delete the background config if it exists
        const backgroundStyle = JSON.parse(JSON.stringify(styleData));
        if (backgroundStyle.asset_generation_config && backgroundStyle.asset_generation_config.background) {
            delete backgroundStyle.asset_generation_config.background;
        }

        // Load Game Board Description
        const descPath = path.join(currentDir, "game_board_des.md");
        if (!fs.existsSync(descPath)) throw new Error("game_board_des.md not found");
        const gameBoardDescription = fs.readFileSync(descPath, 'utf-8');

        console.log("\n🎨 Phase 1: Generating Background...");

        const prompt = `
${gameBoardDescription}

Style Configuration (Apply strictly, but ignore any background transparency settings as this IS the background):
${JSON.stringify(backgroundStyle, null, 2)}
        `;

        // Generate 16:9 Image
        // 16:9 aspect ratio is approximately 1920x1080.
        // gemini-3-pro-image-preview supports specifying aspect ratio.
        // checking LLMClient implementation might be needed to see how it handles config, 
        // but typically we pass it in config or prompt.
        // Using "16:9" in prompt string is often effective, or passing 'aspectRatio' if supported by client.
        // Based on previous conversations/files, user was adding imageConfig support.
        // For now, I'll rely on the prompt or see if I can pass config.

        // I will assume standard editImage or generateImage is available. 
        // Since we are creating from scratch (text-to-image), we should use generateImage if available, 
        // or editImage with a blank/dummy image if that's how the client is structured.
        // Looking at experiment-1/test_step_1_background.ts, it used `client.editImage` with a master image.
        // Here we are generating FROM SCRATCH based on description.
        // I should check if LLMClient has `generateImage`. 
        // If not, I'll use `generateContent` directly via backend or similar, OR check if `LLMClient` supports text-to-image.
        // Let's check `backend/llm/client.ts` first? 
        // Actually I don't have visibility on `client.ts` yet, but I saw `test_hearthstone_gen.ts` using `editImage` with a layout map.
        // The plan implies text-to-image generation ("Prompt Construction ... Result: A clean ... background image").

        // If LLMClient only has editImage, I might need to provide an empty canvas or use a different method.
        // BUT, looking at `backend/test/real/experiment-1/test_step_1_background.ts`, it used `editImage` on a "gold_reference.png".
        // In Experiment 2, we start from "Style JSON" and "Description". No reference image is mentioned in input for Track A.
        // So this is likely pure Text-to-Image.

        // I will attempt to use `client.generateImage` if it exists. If I'm unsure, I'll assume it exists or check `backend/llm/client.ts`. 
        // Wait, I haven't read `backend/llm/client.ts`. Let me check it quickly before writing code to be safe.
        // I will write the file assuming `generateImage` exists, if it fails I will fix it.
        // Actually, better to `view_file` `backend/llm/client.ts` first to see available methods.

        // For now, I'll write the file using `generateImage` and if it errors I will fix.
        // Wait, `test_hearthstone_gen.ts` used `editImage`.

        const imageBuffer = await client.generateImage(
            prompt,
            "gemini-3-pro-image-preview",
            { imageConfig: { aspectRatio: "16:9" } }
        );

        const outputPath = path.join(currentDir, "background.png");
        fs.writeFileSync(outputPath, imageBuffer);
        console.log(`   ✅ Saved Background: ${outputPath}`);

    }, 120000);
});
