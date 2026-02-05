

import { LLMClient } from "../client";
import * as fs from 'fs';
import * as path from 'path';
import { createTransparencyMask } from "../utils/image_processor";
import { GameDesign } from "./design_agent";

export interface SpriteAgentConfig {
    mode?: 'extract_from_scene' | 'restyle_existing';
    styleDescription?: string;
    debugCallback?: (white: Buffer, black: Buffer) => void;
}

export async function runSpriteAgent(
    client: LLMClient,
    inputBuffer: Buffer,
    runDir: string,
    config: SpriteAgentConfig = {},
    design: GameDesign
): Promise<Buffer> {
    const mode = config.mode || 'extract_from_scene';

    console.log(`[SpriteAgent] Running in mode: ${mode}`);

    const entitiesToKeep = [
        ...design.player_team,
        ...design.enemy_team,
        ...design.interactable_objects,
        // ...design.obstacles // Exclude terrain features
    ].join(", ");

    // 1. Determine Prompt based on Mode
    let whitePrompt = "";
    if (mode === 'extract_from_scene') {
        whitePrompt = `Keep only [${entitiesToKeep}] in exact screen coordinates in the photo in a solid white background`;
    } else {
        whitePrompt = `Redraw this sprite sheet in the style of: ${config.styleDescription || 'standard'}. Maintain the exact position, scale, and silhouette of every element. Do not add or remove objects. Keep the white background.`;
    }

    console.log("[SpriteAgent] White Prompt:", whitePrompt);

    // 2. Generate White Background Layer
    console.log("[SpriteAgent] Generating White Layer...");

    // In 'restyle' mode, we use the inputBuffer (which should be the old sheet). 
    // In 'extract' mode, inputBuffer is the Scene.
    const temperature = mode === 'extract_from_scene' ? 0 : 0.7;

    console.log(path.join(runDir, `sprites_${mode}_white.png`));

    // debug
    const whiteBuffer = fs.readFileSync(path.join(runDir, `sprites_${mode}_white.png`));
    // const whiteBuffer = await client.editImage(whitePrompt, inputBuffer, undefined, {
    //     config: { temperature: temperature, aspectRatio: "16:9" }
    // });

    // 3. Generate Black Background Layer (for Alpha)
    console.log("[SpriteAgent] Generating Black Layer (for Alpha)...");
    // const blackPrompt = (mode === 'restyle_existing')
    //     ? `Redraw this sprite sheet in the style of: ${config.styleDescription || 'standard'}. Maintain the exact position. Use a solid black background.`
    //     : "A image of all the sprites and each cards in equal spacing. Must use a solid black background.";

    const blackPrompt = "Everything same but use a solid black background.";
    // CRITICAL: We use the *newly generated* whiteBuffer as the reference for the black buffer 
    // to ensure the pixels align perfectly.
    // const blackBuffer = fs.readFileSync(path.join(runDir, `sprites_${mode}_black.png`));
    const blackBuffer = await client.editImage(blackPrompt, whiteBuffer, undefined, {
        config: { temperature: 0, aspectRatio: "16:9" }
    });

    // 4. Save Debug Assets
    if (runDir) {
        try {
            if (!fs.existsSync(runDir)) fs.mkdirSync(runDir, { recursive: true });
            await fs.promises.writeFile(path.join(runDir, `sprites_${mode}_white.png`), whiteBuffer);
            await fs.promises.writeFile(path.join(runDir, `sprites_${mode}_black.png`), blackBuffer);
            // Ensure 'sprites.png' or 'sprites_white.png' is updated if needed for other agents finding it by default name?
            // Maybe best to just leave them as timestamped debugs and let caller handle main asset naming.
        } catch (e) {
            console.error("[SpriteAgent] Failed to save intermediate sprites:", e);
        }
    }

    if (config.debugCallback) {
        config.debugCallback(whiteBuffer, blackBuffer);
    }

    // 5. Compute Transparency
    console.log("[SpriteAgent] Computing alpha mask...");
    return createTransparencyMask(whiteBuffer, blackBuffer);
}
