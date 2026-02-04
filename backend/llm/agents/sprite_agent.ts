

import { LLMClient } from "../client";
import * as fs from 'fs';
import * as path from 'path';

import { createTransparencyMask } from "../utils/image_processor";

export async function runSpriteAgent(client: LLMClient, sceneBuffer: Buffer, runDir?: string, debugCallback?: (white: Buffer, black: Buffer) => void): Promise<Buffer> {
    const spritePrompt = "A image of all the sprites and each cards in equal spacing.";

    // We strictly need the output to be pixel-perfectly aligned between the two calls, so we use temperature 0.
    // We run this sequentially: Scene -> White BG -> Black BG.
    // This helps the model maintain consistency by seeing its own previous output.
    console.log("[SpriteAgent] Isolating sprites (Sequential: White -> Black)...");

    if (!runDir) {
        throw new Error("runDir is required for SpriteAgent");
    }

    let whiteBuffer: Buffer;
    const whitePath = path.join(runDir, "sprites_white.png");
    try {
        whiteBuffer = await fs.promises.readFile(whitePath);
    } catch (err: any) {
        if (err?.code !== "ENOENT") {
            throw err;
        }
        console.warn(`[SpriteAgent] Missing sprites_white.png in ${runDir}. Generating from scene...`);
        whiteBuffer = await client.editImage(spritePrompt + " Must use a solid white background.", sceneBuffer, undefined, {
            config: { temperature: 0, aspectRatio: "16:9" }
        });
        try {
            if (!fs.existsSync(runDir)) {
                fs.mkdirSync(runDir, { recursive: true });
            }
            await fs.promises.writeFile(whitePath, whiteBuffer);
        } catch (e) {
            console.error("[SpriteAgent] Failed to save sprites_white.png:", e);
        }
    }


    const blackBuffer = await client.editImage(spritePrompt + " Must use a solid black background.", whiteBuffer, undefined, {
        config: { temperature: 0, aspectRatio: "16:9" }
    });

    if (runDir) {
        try {
            if (!fs.existsSync(runDir)) {
                fs.mkdirSync(runDir, { recursive: true });
            }
            await fs.promises.writeFile(path.join(runDir, "sprites_white.png"), whiteBuffer);
            await fs.promises.writeFile(path.join(runDir, "sprites_black.png"), blackBuffer);
            console.log(`[SpriteAgent] Saved intermediate sprites to ${runDir}`);
        } catch (e) {
            console.error("[SpriteAgent] Failed to save intermediate sprites:", e);
        }
    }

    if (debugCallback) {
        debugCallback(whiteBuffer, blackBuffer);
    }

    console.log("[SpriteAgent] Computing alpha mask...");
    return createTransparencyMask(whiteBuffer, blackBuffer);
}
