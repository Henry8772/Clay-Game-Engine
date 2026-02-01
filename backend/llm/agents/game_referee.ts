
import { LLMClient } from "../client";
import { SchemaType } from "@google/generative-ai";

/**
 * JSON Patch Operation (RFC 6902)
 */
export interface JsonPatchOp {
    op: "replace" | "add" | "remove" | "move" | "copy" | "test";
    path: string;
    value?: any;
    from?: string; // For move/copy
}

export interface GameUpdateResult {
    patches: JsonPatchOp[];
    summary: string;
    isValid: boolean;
    newState?: any; // Rehydrated state after patch application
}

/**
 * Apply JSON patches to a state object.
 * Naive implementation for standard ops to avoid external dependencies.
 */
export function applyPatches(state: any, patches: JsonPatchOp[]): any {
    const newState = JSON.parse(JSON.stringify(state)); // Deep copy

    for (const patch of patches) {
        const pathParts = patch.path.split('/').filter(p => p.length > 0);
        let target = newState;

        // Navigate to the parent of the target
        for (let i = 0; i < pathParts.length - 1; i++) {
            target = target[pathParts[i]];
            if (target === undefined) break; // Path not found
        }

        const key = pathParts[pathParts.length - 1];

        if (target && target[key] !== undefined || (patch.op === 'add' && target)) {
            if (patch.op === "replace" || patch.op === "add") {
                // Handle array insertion for 'add' if needed, but for now assumption is object/map replacement
                if (Array.isArray(target) && patch.op === 'add' && !isNaN(Number(key))) {
                    target.splice(Number(key), 0, patch.value);
                } else {
                    target[key] = patch.value;
                }
            } else if (patch.op === "remove") {
                if (Array.isArray(target)) {
                    target.splice(Number(key), 1);
                } else {
                    delete target[key];
                }
            }
        }
    }
    return newState;
}

// Helper to check intersection (Same as frontend logic)
function isInside(point: { x: number, y: number }, box: number[]) {
    // box: [ymin, xmin, ymax, xmax]
    const [ymin, xmin, ymax, xmax] = box;
    return point.x >= xmin && point.x <= xmax && point.y >= ymin && point.y <= ymax;
}

/**
 * Hybrid Engine: 1. Enrich State
 * Adds 'location' (e.g. tile_r5_c2) to entities based on pixel_box overlap with navMesh.
 */
function enrichStateWithLogicalLocations(state: any, navMesh: any[]) {
    const enriched = JSON.parse(JSON.stringify(state));
    if (!enriched.entities || !navMesh) return enriched;

    if (Array.isArray(enriched.entities)) {
        enriched.entities = enriched.entities.map((entity: any) => {
            // Calculate Center
            const [ymin, xmin, ymax, xmax] = entity.pixel_box || [0, 0, 0, 0];
            const cx = xmin + (xmax - xmin) / 2;
            const cy = ymin + (ymax - ymin) / 2;

            // Find matching zone
            const zone = navMesh.find((z: any) => isInside({ x: cx, y: cy }, z.box_2d));
            if (zone) {
                entity.location = zone.label;
            }
            return entity;
        });
    }
    return enriched;
}

/**
 * Hybrid Engine: 2. Strip Geometric Data
 * Removes pixel_box, src, and other visual-only data to save tokens.
 */
function stripGeometricData(state: any) {
    const stripped = JSON.parse(JSON.stringify(state));
    if (Array.isArray(stripped.entities)) {
        stripped.entities = stripped.entities.map((e: any) => {
            const { pixel_box, src, ...rest } = e;
            return rest;
        });
    }
    return stripped;
}

/**
 * Hybrid Engine: 3. Rehydrate State
 * If an entity has a 'location' that matches a navMesh zone, snap its pixel_box to that zone.
 */
function rehydrateState(logicalState: any, navMesh: any[]) {
    const hydrated = JSON.parse(JSON.stringify(logicalState));
    if (!navMesh) return hydrated;

    if (Array.isArray(hydrated.entities)) {
        hydrated.entities = hydrated.entities.map((entity: any) => {
            if (entity.location) {
                const zone = navMesh.find((z: any) => z.label === entity.location);
                if (zone) {
                    // Snap to zone
                    // We need to know the entity size to center it. 
                    // Issue: We stripped pixel_box! We don't know the size anymore if it's new.
                    // Sol: If it's an existing entity, we hopefully kept size?
                    // Better Sol: We shouldn't strip pixel_box entirely if we need size, OR we assume fixed size for units.
                    // For now, let's look up the ORIGINAL entity size if possible, or use a default.
                    // Actually, we can just infer size from the zone or a default Unit size.
                    // Simpler: Just place it in center of tile with fixed size (e.g. 100x100) or size of tile.

                    // Let's assume tile filling for now or preserve original size if we had a map.
                    // Since we don't have original state easily accessible here (we do, but complex to map),
                    // Let's assume we fit the tile with 10% padding.

                    const [zYmin, zXmin, zYmax, zXmax] = zone.box_2d;
                    const zW = zXmax - zXmin;
                    const zH = zYmax - zYmin;

                    // Arbitrary size: 80% of tile
                    const eW = zW * 0.8;
                    const eH = zH * 0.8;

                    const cX = zXmin + zW / 2;
                    const cY = zYmin + zH / 2;

                    entity.pixel_box = [
                        cY - eH / 2,
                        cX - eW / 2,
                        cY + eH / 2,
                        cX + eW / 2
                    ];
                }
            }
            return entity;
        });
    }
    return hydrated;
}


export async function processGameMove(
    client: LLMClient,
    currentState: any,
    rules: string,
    playerCommand: string,
    useMock: boolean = false,
    navMesh?: any[]
): Promise<GameUpdateResult> {

    // 1. Hybrid Pre-processing
    let processingState = currentState;
    if (navMesh) {
        // Enrich with logical locations (e.g. "tile_r5_c2")
        processingState = enrichStateWithLogicalLocations(currentState, navMesh);
        // Strip pixels to save tokens and force logic-based reasoning
        processingState = stripGeometricData(processingState);
    }

    const systemPrompt = `You are an expert Game Referee and Engine.
Your task is to process a player's move in a turn-based game.

**INPUTS:**
1. **Game Rules:** The logic of the game.
2. **Current State:** The Universal Game State (Meta, Zones, Entities).
3. **Player Command:** Natural language move.

**TASK:**
1. Validate the move against the Rules and State.
2. If Valid:
   - Generate a list of **JSON Patches** (RFC 6902) to transition the state.
   - **Hybrid Engine Mode:** The State provided has 'location' properties (e.g. "tile_r5_c2").
   - **Crucial:** To move an unit, update its 'location' property. DO NOT try to update 'pixel_box' directly.
   - Operations: "replace" (update value), "add" (new entry), "remove" (delete).
   - Path examples: "/entities/0/location", "/meta/turnCount".
3. If Invalid:
   - Return empty patches.
   - Explain why in the summary.

**OUTPUT:**
Return JSON with:
- \`patches\`: Array of { op, path, value }.
- \`summary\`: String describing result.
- \`isValid\`: Boolean.
`;

    const inputData = `
RULES:
${rules}

STATE:
${JSON.stringify(processingState, null, 2)}

COMMAND:
${playerCommand}
`;

    const schema = {
        type: SchemaType.OBJECT,
        properties: {
            patches: {
                type: SchemaType.ARRAY,
                items: {
                    type: SchemaType.OBJECT,
                    properties: {
                        op: { type: SchemaType.STRING, enum: ["replace", "add", "remove"] },
                        path: { type: SchemaType.STRING },
                        value: { type: SchemaType.STRING }
                    },
                    required: ["op", "path"]
                }
            },
            summary: { type: SchemaType.STRING },
            isValid: { type: SchemaType.BOOLEAN }
        },
        required: ["patches", "summary", "isValid"]
    };

    if (useMock) {
        return mockGameReferee(currentState);
    }

    const stream = client.streamJson<GameUpdateResult>(
        systemPrompt,
        inputData,
        null,
        "game_referee"
    );

    let finalResult: GameUpdateResult = { patches: [], summary: "", isValid: false };

    for await (const item of stream) {
        if (item) finalResult = item;
    }

    console.log("Final Result:", finalResult);

    if (finalResult.isValid && finalResult.patches) {
        try {
            // Apply patches to the LOGICAL state (the one with locations)
            // We need to be careful: processingState is the stripped one.
            // Ideally we apply patches to a copy of 'processingState', then merge back?
            // Or apply to enriched state?
            // Issue: Patches are generated against 'processingState' (stripped).
            // So paths like "/entities/0/location" are valid.

            const newStateLogical = applyPatches(processingState, finalResult.patches);

            // 2. Hybrid Post-processing (Rehydration)
            if (navMesh) {
                finalResult.newState = rehydrateState(newStateLogical, navMesh);

                // Merge back any data we stripped? (like src, if not changed)
                // Actually, rehydrateState creates new pixel_box. 
                // We need to ensure we don't lose 'src' and others.
                // Re-merging logic:
                if (Array.isArray(finalResult.newState.entities)) {
                    finalResult.newState.entities = finalResult.newState.entities.map((e: any, i: number) => {
                        const original = currentState.entities && currentState.entities[i]; // Assumption: index preservation
                        // Better: Match by ID
                        const originalById = currentState.entities?.find((oe: any) => oe.id === e.id);

                        return {
                            ...originalById, // Keep original props (src, etc)
                            ...e,            // Overwrite with Logic updates (location)
                            pixel_box: e.pixel_box // Use computed pixels
                        };
                    });
                }
            } else {
                finalResult.newState = newStateLogical;
            }

        } catch (e) {
            console.error("Patch application failed:", e);
            finalResult.isValid = false;
            finalResult.summary += " (Internal Error: Patch failed)";
        }
    } else {
        finalResult.newState = currentState;
    }

    return finalResult;
}

function mockGameReferee(currentState: any): GameUpdateResult {
    return {
        patches: [],
        summary: "Mock: Move processed (no changes).",
        isValid: true,
        newState: currentState
    };
}
