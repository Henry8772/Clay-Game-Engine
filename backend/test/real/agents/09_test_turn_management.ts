import { resolveGameAction } from "../../../llm/agents/game_logic";
import { generateEnemyMove } from "../../../llm/agents/enemy_ai";
import { LLMClient } from "../../../llm/client";
import { config } from "dotenv";

config();

describe("Turn Management & AI Logic", () => {
    let client: LLMClient;

    beforeAll(() => {
        client = new LLMClient("gemini", undefined, false);
    });

    const RULES = `
    1. Standard Move: Units can move to adjacent tiles.
    2. Turn Order: Player goes first, then AI.
    `;

    const STATE = {
        entities: {
            "unit_1": { id: "unit_1", type: "unit", team: "player", location: "tile_A1" },
            "enemy_1": { id: "enemy_1", type: "unit", team: "enemy", location: "tile_A5" }
        },
        blueprints: {}
    };

    it("should resolve END_TURN action from user input", async () => {
        const action = "I end my turn";
        const tools = await resolveGameAction(client, STATE, RULES, action);

        console.log("End Turn Tools:", tools);
        const endTurn = tools.find(t => t.name === "END_TURN");
        expect(endTurn).toBeDefined();
    }, 30000);

    it("should generate a valid enemy move", async () => {
        // We test the enemy AI directly
        // We need a navMesh for context, or empty
        const navMesh: any[] = [];

        const result = await generateEnemyMove(client, STATE, RULES, navMesh);
        console.log("Enemy Move Result:", result);

        expect(result).toBeDefined();
        expect(result.command).toBeDefined();
        expect(typeof result.command).toBe("string");
        // It might return "Pass turn" or a move command, both are valid strings
        expect(result.command.length).toBeGreaterThan(0);
    }, 30000);
});
