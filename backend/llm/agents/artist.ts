
import { LLMClient } from "../client";
import { SchemaType } from "@google/generative-ai";

const ARTIST_PROMPT = `
You are 'The Art Director'.
Your input is the Planner's Design Doc.

**Responsibilities:**
1. **Scene Composition:** Generate a detailed image prompt. Enforce spatial separation.
2. **Visual Inventory:** List what *should* be in the image (array of strings).`;

const ArtistSchema = {
    type: SchemaType.OBJECT,
    properties: {
        imagePrompt: { type: SchemaType.STRING, description: "Detailed image generation prompt" },
        visualLayout: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: "List of expected visual elements"
        }
    },
    required: ["imagePrompt", "visualLayout"]
};

export async function runArtistAgent(
    client: LLMClient,
    designDoc: string
): Promise<{ imagePrompt: string; visualLayout: any[] }> {
    const stream = client.streamJson<{ imagePrompt: string; visualLayout: any[] }>(
        ARTIST_PROMPT,
        designDoc,
        ArtistSchema,
        "artist_agent"
    );

    let result = { imagePrompt: "", visualLayout: [] as any[] };
    for await (const chunk of stream) {
        if (chunk) {
            if (chunk.imagePrompt) result.imagePrompt = chunk.imagePrompt;
            if (chunk.visualLayout) result.visualLayout = chunk.visualLayout;
        }
    }
    return result;
}
