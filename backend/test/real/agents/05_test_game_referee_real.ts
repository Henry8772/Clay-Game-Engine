
import { processGameMove } from "../../../llm/agents/game_referee";
import { LLMClient } from "../../../llm/client";
import * as fs from "fs";
import * as path from "path";
import { describe, it, expect, beforeAll } from "vitest";

// Use absolute path relative to project root since we will run vitest from root or backend
// If run from backend: process.cwd() is backend.
// output path is .tmp/real_chain...
// Let's allow dynamic check or just fix it. The backend package.json is in backend/.
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
            return;
        }
        const data = JSON.parse(fs.readFileSync(ARCHITECT_OUTPUT_PATH, "utf-8"));
        currentState = data.initialState;
        rules = data.rules || "Standard Chess Rules";
        client = new LLMClient();
    });

    it("should process a valid chess move", async () => {
        if (!currentState) {
            console.log("Skipping test: No state loaded.");
            return;
        }

        // Move White Knight from b1 to c3
        const command = "Move white knight from b1 to c3";
        console.log("Testing Move:", command);

        const result = await processGameMove(client, currentState, rules, command);

        console.log("Agent Result:", result);
        console.log("Agent Summary:", result.summary);
        console.log("Is Valid:", result.isValid);

        expect(result.isValid).to.be.true;
        expect(result.newState).to.not.deep.equal(currentState);

        // Verify specific board update if possible
        const board = result.newState.board;
        const c3 = board.find((s: any) => s.id === "c3");
        expect(c3.pieceId).to.include("knight");
    });
});
