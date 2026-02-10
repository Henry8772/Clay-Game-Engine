import { LLMClient } from "../client";
import { SchemaType } from "@google/generative-ai";
import { MOCK_NAVMESH } from '../graph/mocks';
import { GameDesign } from "./design_agent";


function generateFullScreenGrid(rows: number, cols: number) {
    const tiles = [];
    const cellHeight = 1000 / rows;
    const cellWidth = 1000 / cols;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const ymin = Math.floor(r * cellHeight);
            const xmin = Math.floor(c * cellWidth);
            const ymax = Math.floor((r + 1) * cellHeight);
            const xmax = Math.floor((c + 1) * cellWidth);

            tiles.push({
                box_2d: [ymin, xmin, ymax, xmax],
                label: `tile_r${r}_c${c}`,
                row: r,
                col: c
            });
        }
    }
    return tiles;
}

export async function reclassifyMap(
    client: LLMClient,
    imageBuffer: Buffer,
    rows: number,
    cols: number,
    existingGrid: any[],
    logicContext: string
): Promise<any[]> {


    const prompt = `
        Look at this updated game map.
        I have a ${rows}x${cols} grid overlay.
        
        **Context for this Update:**
        ${logicContext}
        
        **Task:**
        Classify every single cell in reading order based on the visual and the context provided above.
        
        **Standard Types:**
        - "floor": Walkable/Safe.
        - "hazard": Deadly/Damage (Lava, Water, Spikes).
        - "wall": Obstacles.
        
        **Output:**
        A single array of strings (types) corresponding to the ${rows * cols} cells.
    `;

    const schema = {
        type: SchemaType.OBJECT,
        properties: {
            tile_types: {
                type: SchemaType.ARRAY,
                items: { type: SchemaType.STRING }
            }
        }
    };

    const result = await client.generateJSON<{ tile_types: string[] }>(
        prompt,
        [{ inlineData: { data: imageBuffer.toString('base64'), mimeType: "image/png" } }],
        schema,
        "navmesh_reclassify"
    );


    return existingGrid.map((tile, i) => ({
        ...tile,
        type: result.tile_types[i] || "floor"
    }));
}

export async function runNavMeshAgent(
    client: LLMClient,
    backgroundBuffer: Buffer,
    design: GameDesign
): Promise<any[]> {


    if (client.isDebug) {

        return MOCK_NAVMESH;
    }


    if (design.grid_shape && design.grid_shape.rows > 0) {
        const { rows, cols } = design.grid_shape;



        const gridTiles = generateFullScreenGrid(rows, cols);


        const prompt = `
            Look at this top-down game map.
            
            **Mission:**
            I have overlaid a ${rows}x${cols} grid covering the ENTIRE image.
            Classify every single cell in reading order (Row 0 Left->Right, then Row 1...).
            
            **Labels:**
            - "floor": Safe walkable ground.
            - "hazard": Deadly terrain (lava, water, spikes).
            - "wall": Obstacles (rocks, trees, walls).
            
            **Output:**
            A single array of strings (types) corresponding to the ${rows * cols} cells.
        `;

        const schema = {
            type: SchemaType.OBJECT,
            properties: {
                tile_types: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.STRING }
                }
            }
        };

        const result = await client.generateJSON<{ tile_types: string[] }>(
            prompt,
            [{ inlineData: { data: backgroundBuffer.toString('base64'), mimeType: "image/png" } }],
            schema,
            "navmesh_agent_dense"
        );


        return gridTiles.map((tile, i) => ({
            box_2d: tile.box_2d,
            label: tile.label,

            type: result.tile_types[i] || "wall"
        }));
    }




    const prompt = `
        Look at this game background.
        
        **Mission:**
        Identify the specific playable area / board within this image.
        Ignore the background/table/environment outside the board.
        
        **Topology:** "${design.grid_type}"
        - Identify individual playable cells.
        - Label them as "tile_rX_cY".
        
        **Output:** JSON list of bounding boxes [ymin, xmin, ymax, xmax] (0-1000) for the playable tiles only.
    `;

    const schema = {
        type: SchemaType.ARRAY,
        items: {
            type: SchemaType.OBJECT,
            properties: {
                box_2d: { type: SchemaType.ARRAY, items: { type: SchemaType.NUMBER } },
                label: { type: SchemaType.STRING },
                type: { type: SchemaType.STRING, enum: ["floor"] } // Default sparse tiles to floor
            }
        }
    };

    const sparseResult = await client.generateJSON<any[]>(
        prompt,
        [{ inlineData: { data: backgroundBuffer.toString('base64'), mimeType: "image/png" } }],
        schema,
        "navmesh_agent_sparse"
    );


    return sparseResult.map((t: any) => ({ ...t, type: "floor" }));
}