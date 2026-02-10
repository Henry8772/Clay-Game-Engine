
import { LLMClient } from "../client";
import { SchemaType } from "@google/generative-ai";
import { MOCK_NAVMESH } from '../graph/mocks';
import { GameDesign } from "./design_agent";

export async function runNavMeshAgent(
    client: LLMClient,
    backgroundBuffer: Buffer,
    design: GameDesign
): Promise<any[]> {


    if (client.isDebug) {

        return MOCK_NAVMESH;
    }

    const prompt = `
        Look at this game background.
        
        **Mission:**
        Identify the playable area based on this topology: "${design.grid_type}".
        
        - If "Grid" (e.g. 6x6, 8x8): Identify individual cells. Label: "tile_rX_cY".
        
        **Output:** JSON list of bounding boxes [ymin, xmin, ymax, xmax] (0-1000).
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

    return await client.generateJSON(
        prompt,
        [{ inlineData: { data: backgroundBuffer.toString('base64'), mimeType: "image/png" } }],
        schema,
        "navmesh_agent"
    );
}
