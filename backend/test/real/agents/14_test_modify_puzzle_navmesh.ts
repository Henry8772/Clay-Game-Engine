
import { describe, it, expect, beforeAll } from "vitest";
import { LLMClient } from "../../../llm/client";
import { processModification } from "../../../llm/agents/modification_agent";
import { UniversalState } from "../../../llm/agents/universal_state_types";
import fs from "fs/promises";
import path from "path";

describe("Real: Modification Agent - Puzzle NavMesh Update", () => {
    let client: LLMClient;
    let puzzleState: UniversalState;
    const runId = "puzzle";

    beforeAll(async () => {
        client = new LLMClient("gemini");
        // Load the real puzzle gamestate
        const statePath = path.join(process.cwd(), 'backend', 'data', 'runs', runId, 'gamestate.json');
        try {
            const content = await fs.readFile(statePath, 'utf-8');
            const json = JSON.parse(content);
            puzzleState = json.initialState || json;
        } catch (e) {
            console.warn("Could not load puzzle gamestate.json, skipping test if file missing.", e);
        }
    });

    it("should correctly freeze lava and update navmesh when requested", async () => {
        if (!puzzleState) {
            console.warn("Skipping test: puzzle gamestate not found");
            return;
        }

        // Identify a tile that is currently 'hazard' (lava) or just 'lava'
        // In the puzzle run (assuming typical layout), let's find one.
        // If we don't know exact coords, we can search the navmesh.
        const lavaTileIndex = puzzleState.navMesh?.findIndex(t => t.type === 'hazard' || t.type === 'lava');

        const oldBg = (puzzleState.meta as any).vars?.background;

        if (lavaTileIndex === -1 || lavaTileIndex === undefined) {
            console.warn("Skipping check: No hazard tiles found in initial state to verify change against.");
        } else {
            console.log(`[Test] Found hazard tile at index ${lavaTileIndex}:`, puzzleState.navMesh![lavaTileIndex]);
        }

        const userRequest = "edit the game background environment to freeze the lava";

        // Execute Modification
        const result = await processModification(client, runId, puzzleState, userRequest);

        // Verify Tool Selection
        // The agent might return a specific message, or we check the state change directly.
        // processModification returns { newState, ... }

        console.log("[Test] Result Message:", result.message);

        // 1. Verify NavMesh Update
        const newNavMesh = result.newState.navMesh;
        expect(newNavMesh).toBeDefined();
        expect(newNavMesh!.length).toBeGreaterThan(0);

        // 2. Verify the hazard tile is now safe (floor/ice)
        if (lavaTileIndex !== -1 && lavaTileIndex !== undefined) {
            const oldTile = puzzleState.navMesh![lavaTileIndex];
            const newTile = newNavMesh![lavaTileIndex];

            console.log(`[Test] Tile ${lavaTileIndex} (${oldTile.label}) went from '${oldTile.type}' to '${newTile.type}'`);

            // It should NOT be hazard anymore
            expect(newTile.type).not.toBe('hazard');
            // It SHOULD be floor (or ice, if we had that type, but standard is floor)
            expect(newTile.type).toBe('floor');
        }

        // 3. Verify Background Image Update
        // The background variable in meta should point to a NEW file
        const newBg = (result.newState.meta as any).vars?.background;

        console.log(`[Test] Background changed from ${oldBg} to ${newBg}`);
        expect(newBg).not.toBe(oldBg);
        expect(newBg).toContain('bg_mod_');
    }, 60000); // 60s timeout for image generation
});
