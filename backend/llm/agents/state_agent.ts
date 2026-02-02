
import { DetectedItem } from './vision_agent';
import { LLMClient } from '../client';
import { SchemaType } from "@google/generative-ai";

function categorize(label: string) {
    const l = label.toLowerCase();
    if (l.includes('icon') || l.includes('button')) return { type: 'ui', team: 'neutral' };
    if (l.includes('rock') || l.includes('obstacle') || l.includes('tree')) return { type: 'obstacle', team: 'neutral' };
    if (l.includes('hero') || l.includes('knight') || l.includes('archer') || l.includes('wizard')) return { type: 'unit', team: 'blue' };
    if (l.includes('enemy') || l.includes('skeleton') || l.includes('demon') || l.includes('slime')) return { type: 'unit', team: 'red' };
    return { type: 'prop', team: 'neutral' };
}

export async function runStateAgent(
    client: LLMClient,
    items: DetectedItem[],
    navMesh: any[], // TODO: Use navmesh to snap to grid
    runId: string
): Promise<any> {
    console.log("[StateAgent] Generating Game State...");

    // Generate Blueprints (Metadata)
    const blueprints: Record<string, any> = {};

    // Identify unique roles to generate stats for
    const uniqueRoles = Array.from(new Set(items.map(i => i.label)));

    // LLM Prompt for Capabilities
    const prompt = `
    You are a Game Balancing AI.
    For each of the following Unit Roles, generate a "Blueprint" defining their movement and combat capabilities.
    
    Roles: ${JSON.stringify(uniqueRoles)}
    
    Output JSON format:
    {
        "blueprints": [
            {
                "role": "Archer",
                "movement": { "type": "walk", "range": 3 },
                "capabilities": [
                     { "name": "Shoot", "target_type": "enemy", "range": 5, "damage": 10 }
                ],
                "baseStats": { "max_hp": 50 }
            }
        ]
    }
    
    Rules:
    - Movement Types: "walk", "fly", "teleport".
    - Target Types: "enemy", "ally", "self", "area", "empty_tile".
    - Ranges: 1 (Melee) to 10 (Long Range).
    - Balanced for a small grid tactics game.
    `;

    const schema = {
        type: SchemaType.OBJECT,
        properties: {
            blueprints: {
                type: SchemaType.ARRAY,
                items: {
                    type: SchemaType.OBJECT,
                    properties: {
                        role: { type: SchemaType.STRING },
                        movement: {
                            type: SchemaType.OBJECT,
                            properties: {
                                type: { type: SchemaType.STRING, enum: ["walk", "fly", "teleport"] },
                                range: { type: SchemaType.INTEGER }
                            }
                        },
                        capabilities: {
                            type: SchemaType.ARRAY,
                            items: {
                                type: SchemaType.OBJECT,
                                properties: {
                                    name: { type: SchemaType.STRING },
                                    target_type: { type: SchemaType.STRING, enum: ["enemy", "ally", "self", "area", "empty_tile"] },
                                    range: { type: SchemaType.INTEGER },
                                    damage: { type: SchemaType.INTEGER },
                                    heal: { type: SchemaType.INTEGER },
                                    area_of_effect: { type: SchemaType.INTEGER }
                                }
                            }
                        },
                        baseStats: {
                            type: SchemaType.OBJECT,
                            properties: {
                                max_hp: { type: SchemaType.INTEGER }
                            }
                        }
                    }
                }
            }
        }
    };

    let generatedBlueprints: any[] = [];

    if (client.isDebug) {
        // Mock Response
        generatedBlueprints = uniqueRoles.map(role => {
            const l = role.toLowerCase();
            // Basic heuristics for mock mode
            if (l.includes('archer')) return { role, movement: { type: "walk", range: 3 }, capabilities: [{ name: "Shoot", target_type: "enemy", range: 5, damage: 10 }] };
            if (l.includes('wizard')) return { role, movement: { type: "walk", range: 2 }, capabilities: [{ name: "Fireball", target_type: "area", range: 4, area_of_effect: 2, damage: 15 }] };
            if (l.includes('knight')) return { role, movement: { type: "walk", range: 4 }, capabilities: [{ name: "Slash", target_type: "enemy", range: 1, damage: 20 }] };
            return { role, movement: { type: "walk", range: 3 }, capabilities: [{ name: "Attack", target_type: "enemy", range: 1, damage: 5 }] };
        });
    } else {
        try {
            const result = await client.generateJson(prompt, schema);
            // Check if result is what we expect. It should be { blueprints: [...] }
            // generateJson returns `any` but typed as T. 
            // We need to cast or check safely. 
            const data = result as any;
            if (data && Array.isArray(data.blueprints)) {
                generatedBlueprints = data.blueprints;
            } else if (Array.isArray(data)) {
                // Sometimes models output the array directly despite schema
                generatedBlueprints = data;
            }
        } catch (e) {
            console.error("LLM Generation failed, falling back to heuristics", e);
            // Fallback to simple default
            generatedBlueprints = uniqueRoles.map(role => ({
                role,
                movement: { type: "walk", range: 3 },
                capabilities: [{ name: "Attack", target_type: "enemy", range: 1, damage: 5 }]
            }));
        }
    }

    // Quick Lookup Map
    const bpMap = new Map();
    generatedBlueprints.forEach((bp: any) => {
        if (bp && bp.role) bpMap.set(bp.role, bp);
    });

    const entities = items.map((item, index) => {
        const { type, team } = categorize(item.label);
        const safeLabel = item.label.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const assetUrl = `extracted/${encodeURIComponent(safeLabel)}.png`;

        // Create or Link Blueprint
        const templateId = `tpl_${safeLabel}`;

        if (!blueprints[templateId]) {
            // Find stats from LLM result by looking up the label
            let stats = bpMap.get(item.label);

            if (!stats) {
                // Fallback: try case-insensitive or partial match
                for (const [key, val] of bpMap.entries()) {
                    if (key && key.toLowerCase() === item.label.toLowerCase()) {
                        stats = val;
                        break;
                    }
                }
            }

            if (!stats) {
                stats = { movement: { type: "walk", range: 3 }, capabilities: [{ name: "Attack", target_type: "enemy", range: 1, damage: 5 }] };
            }

            blueprints[templateId] = {
                id: templateId,
                name: item.label,
                renderType: "ASSET",
                description: `A ${item.label}`,
                movement: stats.movement,
                capabilities: stats.capabilities,
                baseStats: stats.baseStats || { max_hp: 50 },
                visualPrompt: item.label // Store prompt/label for reference
            };
        }

        return {
            id: `entity_${index}`,
            t: templateId, // Link to blueprint
            label: item.label, // Keep for legacy/debug
            team,
            type,
            src: assetUrl,
            pixel_box: item.box_2d,
            // TODO: Add grid_position derived from navMesh
        };
    });

    const initialState = {
        meta: {
            turnCount: 1,
            activePlayerId: "player",
            phase: "main",
            runId: runId,
            version: "1.0",
            vars: {}
        },
        zones: {}, // To be populated if we had zones
        entities: entities.reduce((acc: any, e: any) => {
            acc[e.id] = e;
            return acc;
        }, {}) as any,
        grid: { rows: 6, cols: 6 }, // Legacy support
        navMesh // Embed navmesh for debugging
    };

    return {
        initialState,
        blueprints,
        rules: "Standard Skirmish Rules" // Placeholder logic
    };
}
