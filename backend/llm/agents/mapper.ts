
import { LLMClient } from "../client";
import { SchemaType } from "@google/generative-ai";

const MAPPER_PROMPT = `
You are 'The Mapper' (Bridge & Reconciler).
Your input is the Image Prompt (what was asked for) and the Planner's Design Doc (Intent).
*Assume* you are also looking at the generated image which matches the prompt.

**Responsibilities:**
1. **Vision Analysis:** (Simulated) Count the objects in the 'image'.
2. **State Reconciliation:** Write the *actual* JSON state (\`finalState\`) based on the visual.
3. **Asset Mapping:** Map IDs to filenames (\`assetMap\`).`;

const MapperSchema = {
    type: SchemaType.OBJECT,
    properties: {
        finalState: { type: SchemaType.OBJECT, description: "Reconciled Game State JSON" },
        assetMap: { type: SchemaType.OBJECT, description: "Map of element IDs to asset file paths" }
    },
    required: ["finalState", "assetMap"]
};

export async function runMapperAgent(
    client: LLMClient,
    imagePrompt: string,
    designDoc: string
): Promise<{ finalState: any; assetMap: any }> {
    const stream = client.streamJson<{ finalState: any; assetMap: any }>(
        MAPPER_PROMPT,
        `Image Prompt: ${imagePrompt}\n\nDesign Doc Intent: ${designDoc}`,
        MapperSchema,
        "mapper_agent"
    );

    let result = { finalState: {}, assetMap: {} };
    for await (const chunk of stream) {
        if (chunk) {
            if (chunk.finalState) result.finalState = chunk.finalState;
            if (chunk.assetMap) result.assetMap = chunk.assetMap;
        }
    }
    return result;
}
