
import { processGameMove } from "../../../llm/agents/game_referee";
import { LLMClient } from "../../../llm/client";
import * as fs from "fs";
import * as path from "path";
import { describe, it, expect, beforeAll } from "vitest";

// Use absolute path relative to project root since we will run vitest from root or backend
const IS_BACKEND_CWD = process.cwd().endsWith("backend");
const ROOT_DIR = IS_BACKEND_CWD ? process.cwd() : path.join(process.cwd(), "backend");
const ARCHITECT_OUTPUT_PATH = path.join(ROOT_DIR, ".tmp", "real_chain", "architect_output.json");

describe("REAL: 05_test_game_referee_real", () => {
    let currentState: any;
    let rules: string;
    let client: LLMClient;

    beforeAll(() => {
        if (!fs.existsSync(ARCHITECT_OUTPUT_PATH)) {
            console.warn("Architect output not found. Skipping test.");
            const dummyState = {
                meta: { turnCount: 1 },
                zones: { board: { type: "grid" } },
                entities: {
                    p1: { t: "pawn", loc: "board", pos: "a2", owner: "white", props: {} }
                }
            };
            currentState = dummyState;
            rules = "Pawns move forward 1 square.";
        } else {
            const data = JSON.parse(fs.readFileSync(ARCHITECT_OUTPUT_PATH, "utf-8"));
            currentState = data.initialState;
            rules = data.rules || "Standard Rules";
        }
        client = new LLMClient();
    });

    it("should process a move and return validity + patches", async () => {
        if (!currentState) {
            console.log("Skipping test: No state loaded.");
            return;
        }

        // Detect context to make a relevant move
        const entityKeys = Object.keys(currentState.entities || {});
        const firstEntityId = entityKeys[0];
        const firstEntity = currentState.entities[firstEntityId];

        let command = "Pass turn";
        if (firstEntity) {
            command = `Move ${firstEntity.t} (${firstEntityId}) forward`;
        }

        console.log("Testing Move:", command);

        const result = await processGameMove(client, currentState, rules, command);

        console.log("Agent Result Summary:", result.summary);
        console.log("Is Valid:", result.isValid);
        console.log("Patches:", JSON.stringify(result.patches, null, 2));

        expect(result.isValid).toBeDefined();

        if (result.isValid) {
            expect(result.patches).toBeDefined();
            expect(Array.isArray(result.patches)).toBe(true);
            expect(result.newState).toBeDefined();
            // Ensure new state is different from old if patches exist
            if (result.patches.length > 0) {
                expect(result.newState).not.toEqual(currentState);
            }
        }
    });
});
