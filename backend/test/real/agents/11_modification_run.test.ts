
import { processModification } from "../../../llm/agents/modification_agent";
import { LLMClient } from "../../../llm/client";
import { UniversalState } from "../../../llm/agents/universal_state_types";
import { describe, it, expect, beforeAll } from "vitest";

describe("Agent: Modification Real Run (boardgame)", () => {
    let client: LLMClient;
    const runId = "boardgame";

    // 1. Setup a Mock State similar to what 'boardgame' might have
    const mockState: UniversalState = {
        meta: {
            turnCount: 5,
            activePlayerId: "player",
            phase: "main",
            vars: {
                background: "background.png"
            }
        },
        zones: {},
        entities: {
            // Existing entity
            "e_existing": {
                id: "e_existing",
                t: "hero",
                loc: "board",
                owner: "player",
                props: { hp: 100 },
                label: "Hero",
                src: "hero.png"
            } as any
        }
    };

    beforeAll(() => {
        // Use a REAL client to test the full flow (generating json, potentially generating images)
        // Pass false to disable debug mocks
        client = new LLMClient("gemini", undefined, false);
        // No mocks!
    });

    it("should change background using real LLM logic", async () => {
        const bgRequest = "Change the background to a futuristic cyberpunk city with neon lights.";
        const res1 = await processModification(client, runId, mockState, bgRequest);

        console.log("Response:", res1.message);

        const bgFile = (res1.newState.meta as any).assets?.background;

        expect(bgFile).toBeDefined();
        if (bgFile) {
            expect(bgFile).toContain("bg_");
            expect(bgFile).toContain(".png");
        }
    }, 60000); // 60s timeout for image gen

    it("should spawn enemies using real LLM logic", async () => {
        const spawnRequest = "Spawn 3 Orc Grunt enemies.";
        // We reuse mock state, simpler than chaining from previous test result unless we store it
        const res2 = await processModification(client, runId, mockState, spawnRequest);

        console.log("Response:", res2.message);
        const entities = Object.values(res2.newState.entities);
        const orcs = entities.filter((e: any) => e.label && e.label.toLowerCase().includes("orc"));

        console.log(`Found ${orcs.length} Orcs`);
        expect(orcs.length).toBeGreaterThanOrEqual(3);

        const firstOrc = orcs[0] as any;
        expect(firstOrc.team).toBe("red");
        expect(firstOrc.src).toContain("spawn_");
    }, 60000);
});
