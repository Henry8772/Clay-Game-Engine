import { DetectedItem } from './vision_agent';
import { LLMClient } from '../client';
import { SchemaType } from "@google/generative-ai";
import { GameDesign } from './design_agent';

export async function runStateAgent(
    client: LLMClient,
    items: DetectedItem[],
    navMesh: any[],
    runId: string,
    design: GameDesign,
    assetManifest: Record<string, string> = {}
): Promise<any> {
    console.log("[StateAgent] Architecting Game State...");

    // 1. Prepare Asset Paths
    const formattedAssets = Object.values(assetManifest).map(filename => {
        return filename.startsWith('extracted/') ? filename : `extracted/${filename}`;
    });

    // 2. Prepare Context
    const inputContext = {
        detected_entities: items.map((item, idx) => ({
            id: `entity_${idx}`,
            label: item.label,
            box: item.box_2d
        })),
        design_brief: {
            teams: { player: design.player_team, enemy: design.enemy_team },
            mechanics: design.game_loop_mechanics,
            rules: design.rules_summary,
            art_style: design.art_style
        },
        file_system: {
            available_sprites: formattedAssets,
            default_background: "background.png",
            default_navmesh: "navmesh.json"
        }
    };


    const stateSchema = {
        type: SchemaType.OBJECT,
        properties: {
            blueprints: {
                type: SchemaType.ARRAY,
                items: {
                    type: SchemaType.OBJECT,
                    properties: {
                        id: { type: SchemaType.STRING },
                        type: { type: SchemaType.STRING, description: "'unit' or 'item'" },
                        label: { type: SchemaType.STRING },
                        spawns: { type: SchemaType.STRING, description: "ID of the blueprint this item spawns (e.g. Card spawns Unit)", nullable: true },
                        src: { type: SchemaType.STRING, description: "Must be a valid path from file_system.available_sprites" }
                    },
                    required: ["id", "type", "label", "src"]
                }
            },
            entities: {
                type: SchemaType.ARRAY,
                items: {
                    type: SchemaType.OBJECT,
                    properties: {
                        id: { type: SchemaType.STRING },
                        t: { type: SchemaType.STRING }, // templateId
                        pixel_box: { type: SchemaType.ARRAY, items: { type: SchemaType.NUMBER } },
                        team: { type: SchemaType.STRING, description: "'blue' (player) or 'red' (enemy)" }
                    },
                    required: ["id", "t", "pixel_box", "team"]
                }
            },

            global_vars: {
                type: SchemaType.ARRAY,
                items: {
                    type: SchemaType.OBJECT,
                    properties: {
                        key: { type: SchemaType.STRING },
                        value: { type: SchemaType.STRING }
                    },
                    required: ["key", "value"]
                }
            }
        },
        required: ["blueprints", "entities", "global_vars"]
    };

    const systemPrompt = `
    You are the Game Engine Architect.
    
    **Mission:** Map 'detected_entities' to 'file_system' assets.
    
    **Instructions:**
    1. **Blueprints:** - If an item is a CARD, set 'type': 'item'. Find its matching MINIATURE in the asset list.
       - Create a separate blueprint for the MINIATURE (even if not currently on screen) so the card has something to spawn.
       - Link them: Set the card's 'spawns' field to the miniature's blueprint ID.
       - If an item is a UNIT/MINIATURE, set 'type': 'unit'. 'spawns': null.
    
    2. **Assets:**
       - Use EXACT paths from 'file_system.available_sprites'.
       
    3. **Global Vars:**
       - Always return: [{key: "background", value: "background.png"}, {key: "navmesh", value: "navmesh.json"}]

    4. **Teams:**
       - Check 'design_brief.teams'.
       - If a unit's label matches 'player' team -> team: 'blue'.
       - If a unit's label matches 'enemy' team -> team: 'red'.
    `;

    // 4. Generate
    const result = await client.generateJSON<{
        blueprints: any[],
        entities: any[],
        global_vars: { key: string, value: string }[]
    }>(
        systemPrompt,
        JSON.stringify(inputContext, null, 2),
        stateSchema,
        "state_architect"
    );

    // 5. Transform to Target Format
    const blueprintsMap: Record<string, any> = {};
    result.blueprints.forEach(bp => {
        blueprintsMap[bp.id] = bp;
    });

    const entitiesMap: Record<string, any> = {};
    result.entities.forEach(ent => {
        entitiesMap[ent.id] = ent;
    });

    const varsObj: Record<string, any> = {};
    result.global_vars.forEach(kv => varsObj[kv.key] = kv.value);


    const ENGINE_TOOLS = [
        "1. MOVE(entityId, toZoneId) -> Teleport a unit.",
        "2. SPAWN(templateId, toZoneId, owner) -> Create a new unit from a card/template.",
        "3. ATTACK(attackerId, targetId, damage) -> Deal damage and play animation.",
        "4. DESTROY(entityId) -> Remove an entity (e.g. card used, unit dead).",
        "5. NARRATE(message) -> Show text to the user."
    ];

    return {
        initialState: {
            meta: {
                title: design.title || "Untitled Game",
                turnCount: 1,
                activePlayerId: "player",
                activePlayerIndex: 0, // Start with first player
                players: [
                    { id: "player", type: "human", "team": "blue" },
                    { id: "enemy", type: "ai", "team": "red" }
                ],
                phase: "main",
                runId: runId,
                version: "2.0",
                vars: varsObj
            },
            blueprints: blueprintsMap,
            entities: entitiesMap,

            grid: {
                rows: design.grid_shape?.rows || 0,
                cols: design.grid_shape?.cols || 0
            },
            navMesh: navMesh
        },
        rules: design.rules_summary || "Standard Rules",
        engine_tools: ENGINE_TOOLS,
        engine_logic: design.game_loop_mechanics
    };
}