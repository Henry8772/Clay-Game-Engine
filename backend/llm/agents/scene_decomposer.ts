
import { LLMClient } from "../client";
import { SchemaType } from "@google/generative-ai";

const SCENE_DECOMPOSER_PROMPT = `
You are 'The Scene Decomposer' (simulating Grounded SAM 2).
Your input is the 'Target Scene' (represented by its description/prompt for now) and the expected Asset List.

**Responsibilities:**
1. **Object Detection:** Identify where each asset is located in the scene.
2. **Segmentation:** Return the bounding box coordinates for each asset.
`;

const SceneDecomposerSchema = {
    type: SchemaType.OBJECT,
    properties: {
        detectedRegions: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    label: { type: SchemaType.STRING, description: "Name of the detected object" },
                    box2d: {
                        type: SchemaType.ARRAY,
                        items: { type: SchemaType.INTEGER },
                        description: "[ymin, xmin, ymax, xmax] coordinates (0-1000 scale)"
                    },
                    confidence: { type: SchemaType.NUMBER, description: "Detection confidence score" }
                },
                required: ["label", "box2d"]
            }
        }
    },
    required: ["detectedRegions"]
};

export interface DetectedRegion {
    label: string;
    box2d: number[];
    confidence: number;
}

export async function runSceneDecomposerAgent(
    client: LLMClient,
    assetList: string[],
    image: Buffer
): Promise<DetectedRegion[]> {
    console.log("🔍 Scene Decomposer: Segmenting image for assets:", assetList.length);

    // We pass the image and the asset list to the client which handles the multimodal call
    // (or returns mock data in debug mode)
    const regions = await client.segmentImage(image, assetList);

    return regions;
}
