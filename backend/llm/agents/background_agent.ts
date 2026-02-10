
import { LLMClient } from "../client";

export async function runBackgroundAgent(client: LLMClient, sceneBuffer: Buffer): Promise<Buffer> {
    const bgPrompt = "A game background of no sprites and cards.";


    const backgroundBuffer = await client.editImage(bgPrompt, sceneBuffer, undefined, {
        config: { temperature: 0.5 }
    });

    return backgroundBuffer;
}
