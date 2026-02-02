
import { LLMClient } from "../client";

import { createTransparencyMask } from "../utils/image_processor";

export async function runSpriteAgent(client: LLMClient, sceneBuffer: Buffer, debugCallback?: (white: Buffer, black: Buffer) => void): Promise<Buffer> {
    const spritePrompt = "A transparent background of all the sprites and each cards in equal spacing.";

    // We strictly need the output to be pixel-perfectly aligned between the two calls, so we use temperature 0.
    // One call asks for a solid white background, the other for a solid black background.
    console.log("[SpriteAgent] Isolating sprites (Dual-Pass)...");

    const [whiteBuffer, blackBuffer] = await Promise.all([
        client.editImage(spritePrompt + " Use a solid white background.", sceneBuffer, undefined, {
            config: { temperature: 0 }
        }),
        client.editImage(spritePrompt + " Use a solid black background.", sceneBuffer, undefined, {
            config: { temperature: 0 }
        })
    ]);

    if (debugCallback) {
        debugCallback(whiteBuffer, blackBuffer);
    }

    console.log("[SpriteAgent] Computing alpha mask...");
    return createTransparencyMask(whiteBuffer, blackBuffer);
}
