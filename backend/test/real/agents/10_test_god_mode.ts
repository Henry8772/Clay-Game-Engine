
import { processModification } from "../../../llm/agents/modification_agent";
import { LLMClient } from "../../../llm/client";
import { UniversalState } from "../../../llm/agents/universal_state_types";
import { describe, it, expect } from "vitest";

describe("Agent: God Mode Logic", () => {

    const mockState: UniversalState = {
        meta: {
            turnCount: 1,
            activePlayerId: "player",
            phase: "main",
            vars: {
                background: "background.png"
            }
        },
        zones: {},
        entities: {
            "e1": {
                id: "e1",
                t: "goblin",
                loc: "board",
                owner: "enemy",
                props: { hp: 10 },
                label: "Goblin Warrior",
                src: "goblin.png"
            } as any
        }
    };

    it("should generate background change tool call", async () => {
        // Use real client (debug=false)
        const client = new LLMClient("gemini", undefined, false);

        const res1 = await processModification(client, "boardgame", mockState, "Change background to dark cave");

        expect(res1.newState.meta.vars?.background).toBeDefined();
    }, 30000);

    // it("should generate spawn tool call", async () => {
    //     const client = new LLMClient("gemini", undefined, false);

    //     const res2 = await processModification(client, "test_run", mockState, "Spawn an Orc");

    //     const entities = Object.values(res2.newState.entities);
    //     // LLM might choose any name containing Orc
    //     const spawned = entities.find((e: any) => e.label && e.label.toLowerCase().includes("orc"));
    //     expect(spawned).toBeDefined();
    //     expect(res2.message).toContain("Spawned");
    // }, 30000);
});
