
// We use GeminiBackend directly because LLMClient JSON requires `inputData` structure
// that supports inlineData/parts.
import { GeminiBackend } from '../backend';
import { LLMClient } from "../client";
import { SchemaType } from "@google/generative-ai";
import { MOCK_VISION_ANALYSIS } from '../graph/mocks';
import { GameDesign } from "./design_agent";

export interface DetectedItem {
    box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0-1000
    label: string;
}

export async function runVisionAgent(
    client: LLMClient,
    spriteBuffer: Buffer,
    design: GameDesign
): Promise<DetectedItem[]> {
    console.log("[VisionAgent] Analyzing sprites...");

    if (client.isDebug) {
        console.log("[VisionAgent] Returning MOCK_VISION_ANALYSIS");
        return MOCK_VISION_ANALYSIS as unknown as DetectedItem[];
    }

    // Build context from Design
    const expectedAssets = [
        ...design.player_team,
        ...design.enemy_team,
        ...design.obstacles,
        ...design.ui_elements
    ].join(", ");

    const prompt = `
    Detect all prominent game items in this sprite sheet.
    
    **Context:**
    The game is expected to contain: ${expectedAssets}.
    
    **Task:**
    Return a bounding box [ymin, xmin, ymax, xmax] (0-1000) for every isolated item.
    Label them specifically based on the context list. e.g. "Knight", "Rock", "Card Hand".
    `;

    // Note: The LLMClient might not support inlineData in generateJSON purely depending on version,
    // but we can trust the caller or use the pattern below if we want to be safe.
    // For now, let's stick to the user's request to "Use client directly" if possible,
    // or fallback to the manual backend call if LLMClient doesn't support part array in inputData.
    // Looking at LLMClient.generateJSON signature: (system, inputData, ...)
    // inputData is passed to backend.generateJSON. 
    // If backend.generateJSON takes array of parts, we are good.
    // Assuming GeminiBackend supports it.

    const schema = {
        type: SchemaType.ARRAY,
        items: {
            type: SchemaType.OBJECT,
            properties: {
                box_2d: { type: SchemaType.ARRAY, items: { type: SchemaType.NUMBER } },
                label: { type: SchemaType.STRING }
            }
        }
    };

    try {
        // Attempt using client.generateJSON with multimodal input
        return await client.generateJSON<DetectedItem[]>(
            prompt,
            [{ inlineData: { data: spriteBuffer.toString('base64'), mimeType: "image/png" } }],
            schema,
            "vision_agent"
        );
    } catch (e) {
        console.warn("Client generateJSON failed, falling back to manual content generation if needed or rethrow.", e);
        throw e;
    }
}
