
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


    if (client.isDebug) {

        return MOCK_VISION_ANALYSIS as unknown as DetectedItem[];
    }

    // Build context from Design
    const expectedAssets = [
        ...design.player_team,
        ...design.enemy_team,
    ].join(", ");

    const prompt = `
    Detect all prominent game items in this sprite sheet.
    
    **Context:**
    The game is expected to contain: ${expectedAssets}.
    
    **Task:**
    Return a bounding box [ymin, xmin, ymax, xmax] (0-1000) for every isolated item.
    Label them specifically based on the context list. e.g. "Knight", "Rock", "Card Hand".
    `;

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
            "vision_agent",
            undefined,
            { model: "gemini-3-flash-preview" }
        );
    } catch (e) {
        console.warn("Client generateJSON failed, falling back to manual content generation if needed or rethrow.", e);
        throw e;
    }
}
