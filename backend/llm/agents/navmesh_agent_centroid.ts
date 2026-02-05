
import { LLMClient } from "../client";
import { SchemaType } from "@google/generative-ai";
import { MOCK_NAVMESH } from '../graph/mocks';
import { GameDesign } from "./design_agent";
import sharp from 'sharp';

export async function runNavMesCentroidhAgent(
    client: LLMClient,
    backgroundBuffer: Buffer,
    design: GameDesign
): Promise<any> {
    console.log(`[NavMeshAgent] Generating NavMesh for ${design.grid_type}...`);

    if (client.isDebug) {
        console.log("[NavMeshAgent] Returning MOCK_NAVMESH");
        return MOCK_NAVMESH;
    }

    const prompt = `
        Look at this game background.
        
        **Mission:**
        Identify the playable area based on this topology: "${design.grid_type}".
        
        Draw the **center point (centroid)** of every playable tile.
        
        **Output Schema:**
        - nav_mesh: List of tiles with coordinates [y, x] (0-1000) and label.
    `;

    const schema = {
        type: SchemaType.OBJECT,
        properties: {
            nav_mesh: {
                type: SchemaType.ARRAY,
                items: {
                    type: SchemaType.OBJECT,
                    properties: {
                        coordinates: {
                            type: SchemaType.ARRAY,
                            items: { type: SchemaType.NUMBER },
                            description: "Center point [y, x] normalized 0-1000"
                        },
                        label: { type: SchemaType.STRING }
                    }
                }
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

export async function drawNavMeshCentroid(imageBuffer: Buffer, navData: any): Promise<Buffer> {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    const width = metadata.width || 1000;
    const height = metadata.height || 1000;

    const navMesh = navData.nav_mesh || [];
    const calibration = navData.calibration || {};

    const svgPoints = navMesh.map((tile: any) => {
        const [y, x] = tile.coordinates;

        const px = (x / 1000) * width;
        const py = (y / 1000) * height;
        const color = '#00FF00';

        return `
            <circle cx="${px}" cy="${py}" r="5" fill="${color}" stroke="white" stroke-width="2" />
            <text x="${px}" y="${py - 10}" font-family="Arial" font-size="10" fill="white" text-anchor="middle" style="text-shadow: 1px 1px 1px black;">
                ${tile.label || ''}
            </text>
        `;
    }).join('\n');

    const svgOverlay = `
        <svg width="${width}" height="${height}">
            ${svgPoints}
        </svg>
    `;

    return image
        .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
        .png()
        .toBuffer();
}
