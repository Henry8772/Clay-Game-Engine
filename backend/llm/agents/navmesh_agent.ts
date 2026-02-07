
import { LLMClient } from "../client";
import { MOCK_NAVMESH } from '../graph/mocks';

export async function runNavMeshAgent(client: LLMClient, backgroundBuffer: Buffer): Promise<any[]> {
    console.log("[NavMeshAgent] Generating NavMesh...");

    if (client.isDebug) {
        console.log("[NavMeshAgent] Returning MOCK_NAVMESH");
        return MOCK_NAVMESH;
    }

    const NAVMESH_PROMPT = `
        Look at this top-down game board.
        
        **Mission:**
        Identify 6 by 6 "Playable Tile" or "Grid Cell" on the central floor area.

        **Output Requirement:**
        Return a JSON list of bounding boxes [ymin, xmin, ymax, xmax] (0-1000 normalized).
        
        **Labels:**
        - Use "tile_r{row}_c{col}" for tiles.

        JSON Format:
        [
          {"box_2d": [0,0,100,100], "label": "tile_r0_c0"},
          ...
        ]
    `;

    const imagePart = {
        inlineData: {
            data: backgroundBuffer.toString('base64'),
            mimeType: "image/png"
        }
    };

    const responseText = await client.generateContent(
        [{ role: "user", parts: [{ text: NAVMESH_PROMPT }, imagePart] }],
        "gemini-3-flash-preview",
        {
            config: {
                temperature: 0.5,
                responseMimeType: "application/json",
                thinkingConfig: {
                    thinkingLevel: 'HIGH' as const,
                },
            }
        }
    );

    try {
        const navMesh = JSON.parse(responseText);
        return navMesh;
    } catch (e) {
        console.error("Failed to parse NavMesh:", responseText);
        throw e;
    }
}
