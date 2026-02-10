
import { LLMClient } from "../client";
import { SchemaType } from "@google/generative-ai";

/**
 * The Blueprint that drives all other agents.
 */
export interface GameDesign {
    // Visuals (Scene Agent)
    art_style: string;      // e.g. "16-bit pixel art"
    perspective: string;    // e.g. "Top-down orthographic"
    background_theme: string; // e.g. "Stone dungeon floor"

    // Topology (NavMesh Agent)
    grid_type: string;      // e.g. "6x6 Grid", "Chess Board", "Free movement area"
    grid_shape?: { rows: number, cols: number };

    // Assets (Vision Agent)
    player_team: string[];  // e.g. ["Knight", "Ranger"]
    enemy_team: string[];   // e.g. ["Skeleton", "Ghost"]
    interactable_objects: string[]; // e.g. ["Treasure Chest", "Lever"]
    obstacles: string[];    // e.g. ["Rock"]
    ui_elements: string[];  // e.g. ["Card Hand", "Graveyard"]

    // Logic (State Agent)
    rules_summary: string;       // Brief rules for context
    game_loop_mechanics: string; // The "If X then Y" logic for the engine
}

// --- REFERENCE: PREVIOUS HARDCODED VALUES ---
/*
 * REFERENCE: TACTICAL RPG DEMO PROMPTS
 * * 1. Scene Agent Prompt:
 * "The Grid: A central 6x6 tiled area (stone dungeon floor). Place exactly 3 Hero units... 4 Monster units... 2 rock obstacles."
 * * 2. Vision Agent Context:
 * "On the bottom player side, there are 5 character cards... a Knight, a Ranger, a Templar... On the top enemy side... a Skeleton, a Ghost..."
 * * 3. NavMesh Agent Task:
 * "Identify 6 by 6 'Playable Tile' or 'Grid Cell' on the central floor area."
 * * 4. State Agent Logic:
 * "1. **Card Play:** If user draws a CARD to the BOARD -> DESTROY the card, then SPAWN the corresponding unit at that location.
 * 2. **Movement:** If user drags a UNIT to a TILE -> MOVE the unit.
 * 3. **Attack:** If user drags a UNIT to an ENEMY -> ATTACK the enemy."
 */

export async function runDesignAgent(client: LLMClient, userRequest: string): Promise<GameDesign> {
    console.log("[DesignAgent] Architecting game...");

    const systemPrompt = `
    You are a Lead Game Designer. 
    Analyze the user's request and output a precise Game Design Specification.
    
    **DESIGN GUIDELINES:**
    1. **Visuals:** Define a coherent art style and perspective.
    2. **Grid/Topology:** YOU MUST USE A RECTANGULAR GRID (MxN). 
       - Do NOT use hexagons, graphs, or irregular shapes.
       - Always specify 'grid_shape' with rows and columns.
       - 'grid_type' should describe the layout (e.g. "6x6 Grid", "Chess Board").
    3. **Assets:** List the specific units/items needed.
    4. **Logic:** Define how the engine tools (MOVE, SPAWN, ATTACK, DESTROY) are used.
    
    **Engine Logic Examples:**
    - *Card Battler:* "If Card dragged to Board -> SPAWN Unit. If Unit dragged to Enemy -> ATTACK."
    - *Chess:* "If Unit dragged to Tile -> MOVE. If Unit dragged to Enemy -> ATTACK (Capture)."
    - *Gardening Sim:* "If Seeds dragged to Soil -> SPAWN Plant."
    `;

    const schema = {
        type: SchemaType.OBJECT,
        properties: {
            art_style: { type: SchemaType.STRING },
            perspective: { type: SchemaType.STRING },
            background_theme: { type: SchemaType.STRING },
            grid_type: { type: SchemaType.STRING },
            grid_shape: {
                type: SchemaType.OBJECT,
                properties: {
                    rows: { type: SchemaType.NUMBER },
                    cols: { type: SchemaType.NUMBER }
                },
                required: ["rows", "cols"]
            },
            player_team: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            enemy_team: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            obstacles: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            ui_elements: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            rules_summary: { type: SchemaType.STRING },
            game_loop_mechanics: { type: SchemaType.STRING }
        },
        required: ["art_style", "grid_type", "grid_shape", "player_team", "enemy_team", "game_loop_mechanics"]
    };

    return await client.generateJSON<GameDesign>(
        systemPrompt,
        [{ role: "user", content: userRequest }],
        schema,
        "design_agent"
    );
}
