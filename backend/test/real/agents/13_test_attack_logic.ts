
import { resolveGameAction } from "../../../llm/agents/game_logic";
import { LLMClient } from "../../../llm/client";
import { config } from "dotenv";

config();

describe("Agent: Game Logic - Attack Trigger", () => {
    let client: LLMClient;

    beforeAll(() => {
        client = new LLMClient("gemini", undefined, false);
    });

    const RULES = "Standard Move: Units move to adjacent tiles.";

    const STATE = {
        entities: {
            "hero": { id: "hero", type: "unit", team: "blue", location: "tile_A1", t: "hero_tpl" },
            "orc": { id: "orc", type: "unit", team: "red", location: "tile_A2", t: "orc_tpl" }
        },
        blueprints: {
            "hero_tpl": { label: "Hero", type: "unit" },
            "orc_tpl": { label: "Orc", type: "unit" }
        }
    };

    it("should resolve MOVE to occupied tile as ATTACK", async () => {
        // User explicitly says "Move hero to tile_A2" (where Orc is)
        const action = "Move hero to tile_A2";

        // We expect the LLM to be smart enough, or we need to guide it
        const tools = await resolveGameAction(client, STATE, RULES, action);

        console.log("Tools returned:", JSON.stringify(tools, null, 2));

        const attackTool = tools.find(t => t.name === "ATTACK");
        const moveTool = tools.find(t => t.name === "MOVE");

        // Ideally, it should be ATTACK, or at least contain ATTACK. 
        // If it's just MOVE, that's the bug.
        expect(attackTool).toBeDefined();
        // expect(moveTool).toBeUndefined(); // Strictly speaking, you can't move onto them, so MOVE should be absent or secondary
    }, 30000);
});
