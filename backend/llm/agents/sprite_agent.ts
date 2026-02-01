
import { LLMClient } from "../client";

export async function runSpriteAgent(client: LLMClient, sceneBuffer: Buffer): Promise<Buffer> {
    const spritePrompt = "A transparent background of all the sprites and each cards in equal spacing.";

    console.log("[SpriteAgent] Isolating sprites...");
    const spriteSheetBuffer = await client.editImage(spritePrompt, sceneBuffer, undefined, {
        config: { temperature: 0.5 }
    });

    return spriteSheetBuffer;
}
