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
    console.log("[StateAgent] Handing over State Architecture to LLM...");

    // 1. Prepare Context for the LLM
    // We filter down the input to just what the LLM needs to make decisions.
    const inputContext = {
        detected_items: items.map((item, idx) => ({
            id: `entity_${idx}`,
            label: item.label,
            box_2d: item.box_2d
        })),
        available_assets: assetManifest,
        design_goals: [
            `Link Cards to their corresponding Miniatures via 'spawns' property.`,
            `Assign 'team' based on: ${design.player_team.join(", ")} vs ${design.enemy_team.join(", ")}.`,
            `Assign 'type' (unit, item, prop, ui).`,
            `Rules Context: ${design.rules_summary}`
        ]
    };

    // 2. Define the Schema for the LLM Output
    // This forces the LLM to return valid JSON matching our Game State structure.
    const stateSchema = {
        type: SchemaType.OBJECT,
        properties: {
            blueprints: {
                type: SchemaType.ARRAY,
                description: "A list of game object definitions (templates).",
                items: {
                    type: SchemaType.OBJECT,
                    properties: {
                        id: { type: SchemaType.STRING, description: "Unique template ID (e.g., 'tpl_orc_warrior')" },
                        type: { type: SchemaType.STRING, description: "Type of item: 'unit', 'item', 'prop', 'ui'" },
                        label: { type: SchemaType.STRING, description: "Display name" },
                        spawns: { type: SchemaType.STRING, description: "For cards: ID of the miniature it spawns", nullable: true },
                        src: { type: SchemaType.STRING, description: "Asset filename from available_assets" }
                    },
                    required: ["id", "type", "label", "src"]
                }
            },
            entities: {
                type: SchemaType.ARRAY,
                description: "The instances currently on the board.",
                items: {
                    type: SchemaType.OBJECT,
                    properties: {
                        id: { type: SchemaType.STRING, description: "Instance ID (must match input entity_0, etc.)" },
                        t: { type: SchemaType.STRING, description: "Template ID from blueprints" },
                        pixel_box: {
                            type: SchemaType.ARRAY,
                            items: { type: SchemaType.NUMBER }
                        }
                    },
                    required: ["id", "t", "pixel_box"]
                }
            }
        },
        required: ["blueprints", "entities"]
    };

    const systemPrompt = `
    You are the Lead Game Designer and Data Architect.
    Your job is to convert raw computer vision detection data into a structured Game State.

    **INPUT DATA:**
    1. A list of detected items (Entities on screen).
    2. A manifest of asset filenames (images).

    **YOUR TASKS:**
    1. **Create Blueprints:** For every unique item, create a Template in the 'blueprints' list.
       - 'id': Create a unique ID like 'tpl_orc_warrior'.
       - If it is a CARD, find its matching MINIATURE. Set 'spawns' = templateId of the miniature.
       - If it is a UNIT, give it stats (maxHp, attack, moveRange, range).
       - Assign Teams/Factions via naming or labels if applicable.
       - 'src': Use the exact path from the 'available_assets' map.

    2. **Map Entities:** Map the detected items to instances in the 'entities' list.
       - 'id': Must match the input ID (e.g., 'entity_0').
       - 't': Must match a valid template 'id' from your blueprints list.
       - 'pixel_box': Copy exactly from input.

    **OUTPUT:**
    Return a JSON object with 'blueprints' array and 'entities' array.
    `;

    // 3. Call the LLM
    const result = await client.generateJSON<{ blueprints: any[], entities: any[] }>(
        systemPrompt,
        JSON.stringify(inputContext, null, 2),
        stateSchema,
        "state_architect"
    );

    // 4. Assemble Final State
    // Convert arrays back to maps for the engine
    const blueprintsMap: Record<string, any> = {};
    result.blueprints.forEach(bp => {
        blueprintsMap[bp.id] = bp;
    });

    const entitiesMap: Record<string, any> = {};
    result.entities.forEach(ent => {
        entitiesMap[ent.id] = ent;
    });

    const initialState = {
        meta: {
            turnCount: 1,
            activePlayerId: "player",
            phase: "main",
            runId: runId,
            version: "2.0",
            vars: {
                background: "background.png",
                navmesh: "navmesh.json"
            }
        },
        blueprints: blueprintsMap,
        entities: entitiesMap,
        grid: { rows: 6, cols: 6 },
        navMesh: navMesh
    };

    // 5. Return Full Config
    return {
        initialState,
        rules: design.rules_summary,
        engine_tools: [
            "1. MOVE(entityId, toZoneId) -> Teleport a unit.",
            "2. SPAWN(templateId, toZoneId, owner) -> Create a new unit from a card/template.",
            "3. ATTACK(attackerId, targetId, damage) -> Deal damage and play animation.",
            "4. DESTROY(entityId) -> Remove an entity (e.g. card used, unit dead).",
            "5. NARRATE(message) -> Show text to the user."
        ],
        engine_logic: design.game_loop_mechanics
    };
}