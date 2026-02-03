import { resolveGameAction } from "../../../llm/agents/game_logic";
import { LLMClient } from "../../../llm/client";
import { config } from "dotenv";

config();

describe("Agent: Game Logic (LLM as API)", () => {
    let client: LLMClient;

    beforeAll(() => {
        client = new LLMClient("gemini", undefined, false); // Use live client
    });

    const RULES = `
    1. Standard Move: Units can move to adjacent tiles.
    2. Summoning: Playing a Card spawns a Unit on the board.
    3. Combat: Units attack enemies in range.
    `;

    const STATE = {
        entities: {
            "unit_1": { id: "unit_1", type: "unit", location: "tile_A1" },
            "enemy_1": { id: "enemy_1", type: "unit", location: "tile_A2" },
            "card_goblin": { id: "card_goblin", type: "card", location: "hand" }
        }
    };

    it("should resolve MOVE action", async () => {
        const action = "Move unit_1 to tile_B1";
        const tools = await resolveGameAction(client, STATE, RULES, action);

        console.log("Move Tools:", tools);
        expect(tools).toBeDefined();
        // LLM output is non-deterministic but should likely contain MOVE
        const moveTool = tools.find(t => t.name === "MOVE");
        expect(moveTool).toBeDefined();
        if (moveTool && moveTool.name === "MOVE") {
            expect(moveTool.args.entityId).toBe("unit_1");
            expect(moveTool.args.toZoneId).toBe("tile_B1");
        }
    }, 30000);

    it("should resolve SPAWN action from card", async () => {
        const action = "Play goblin card to tile_C3";
        const tools = await resolveGameAction(client, STATE, RULES, action);

        console.log("Spawn Tools:", tools);
        // Expect DESTROY (card) and SPAWN (unit)
        const destroy = tools.find(t => t.name === "DESTROY");
        const spawn = tools.find(t => t.name === "SPAWN");

        expect(destroy).toBeDefined();
        expect(spawn).toBeDefined();
    }, 30000);

    it("should resolve ATTACK action", async () => {
        const action = "unit_1 attacks enemy_1";
        const tools = await resolveGameAction(client, STATE, RULES, action);

        console.log("Attack Tools:", tools);
        const attack = tools.find(t => t.name === "ATTACK");
        expect(attack).toBeDefined();
    }, 30000);
});
