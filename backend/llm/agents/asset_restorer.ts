
import { LLMClient } from "../client";
import { SchemaType } from "@google/generative-ai";
import { DetectedRegion } from "./scene_decomposer";

const ASSET_RESTORER_PROMPT = `
You are 'The Asset Restorer'.
Your input is a specific region from the Target Scene (defined by a bounding box) and its label.

**Responsibilities:**
1. **Metadata Assignment:** Assign a unique ID (snake_case) and a descriptive name to this asset.
2. **Visual Restoration Description:** Describe how to "inpaint" or "restore" this asset to be a standalone sprite (e.g. "A clean, isolated image of a [object] on a transparent background").
`;

const AssetRestorerSchema = {
    type: SchemaType.OBJECT,
    properties: {
        id: { type: SchemaType.STRING, description: "Unique snake_case ID for the asset" },
        name: { type: SchemaType.STRING, description: "Display name of the asset" },
        description: { type: SchemaType.STRING, description: "Visual description for the final sprite" },
        inpaintingPrompt: { type: SchemaType.STRING, description: "Prompt to generate/restore the isolated asset" }
    },
    required: ["id", "name", "description", "inpaintingPrompt"]
};

export interface AssetMetadata {
    id: string;
    name: string;
    description: string;
    inpaintingPrompt: string;
    imagePath?: string; // Filled later
}

export async function runAssetRestorerAgent(
    client: LLMClient,
    region: DetectedRegion
): Promise<AssetMetadata> {
    const input = `Region Label: ${region.label}, Confidence: ${region.confidence}, Box: ${JSON.stringify(region.box2d)}`;

    const stream = client.streamJson<{ id: string; name: string; description: string; inpaintingPrompt: string }>(
        ASSET_RESTORER_PROMPT,
        input,
        AssetRestorerSchema,
        "asset_restorer"
    );

    let result = { id: "", name: "", description: "", inpaintingPrompt: "" };
    for await (const chunk of stream) {
        if (chunk) {
            if (chunk.id) result.id = chunk.id;
            if (chunk.name) result.name = chunk.name;
            if (chunk.description) result.description = chunk.description;
            if (chunk.inpaintingPrompt) result.inpaintingPrompt = chunk.inpaintingPrompt;
        }
    }

    // In a real system, we would call client.editImage() or client.generateImage() here using result.inpaintingPrompt
    // For now, we return the metadata.
    return {
        id: result.id,
        name: result.name,
        description: result.description,
        inpaintingPrompt: result.inpaintingPrompt
    };
}
