
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

export async function processGameMove(
    client: LLMClient,
    currentState: any,
    rules: string,
    playerCommand: string,
    useMock: boolean = false
): Promise<GameUpdateResult> {
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
   - **Optimization:** ONLY change what needs to change.
   - Operations: "replace" (update value), "add" (new entry), "remove" (delete).
   - Path examples: "/entities/pawn1/loc", "/meta/turnCount".
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
${JSON.stringify(currentState, null, 2)}

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
                        value: { type: SchemaType.STRING } // Allow flexible types? SchemaType.ANY not standard. Gemini often handles STRING or primitive inference.
                        // Actually value can be object/number. Let's try to not constrain value too much or use explicit breakdown if needed.
                        // For simplicity in schema, we'll let Gemini infer or use a loose schema if possible, 
                        // but Strict JSON schema requires specific types. 
                        // Strategy: We won't strictly enforce 'value' type in schema to allow polymorphism, 
                        // OR we define it as STRING and ask LLM to JSON stringify complex objects? 
                        // Better: Just don't include 'value' in the strictly typed sub-object validation if we can avoid it, 
                        // or use a generic structure. 
                        // Let's rely on standard JSON output without strict Schema enforcement for 'value' if possible, 
                        // or just set it to valid types.
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

    // Note: Schema validation might be tricky for 'value' being mixed type.
    // If we run into issues, we might remove the Schema param and rely on prompt instruction for JSON.
    const stream = client.streamJson<GameUpdateResult>(
        systemPrompt,
        inputData,
        null, // Schema purposely null to allow polymorphic 'value' in patches
        "game_referee"
    );

    let finalResult: GameUpdateResult = { patches: [], summary: "", isValid: false };

    for await (const item of stream) {
        if (item) finalResult = item;
    }

    if (finalResult.isValid && finalResult.patches) {
        try {
            finalResult.newState = applyPatches(currentState, finalResult.patches);
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
