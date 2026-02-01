
import { processGameMove } from "../../../llm/agents/game_referee";
import { LLMClient } from "../../../llm/client";
import * as fs from "fs";
import * as path from "path";
import { describe, it, expect, beforeAll } from "vitest";

describe("REAL: 06_test_hybrid_referee", () => {
    let currentState: any;
    let navMesh: any[];
    let rules: string;
    let client: LLMClient;

    beforeAll(() => {
        // Load Experiment 3 data
        const experimentDir = path.join(process.cwd(), "backend", "test", "real", "experiment-3");

        currentState = JSON.parse(fs.readFileSync(path.join(experimentDir, "gamestate.json"), "utf-8"));
        navMesh = JSON.parse(fs.readFileSync(path.join(experimentDir, "navmesh.json"), "utf-8"));
        rules = "Knights move in an L-shape. You can move units to valid tiles.";

        client = new LLMClient();
    });

    it("should move knight to a logical tile via LLM and map back to pixels", async () => {
        // 1. Identify Target
        // Entity 8 is Knight at tile_r5_c2 (approx)
        const knightId = "entity_8";

        // Target tile: tile_r2_c2
        // Coords: [346, 363, 500, 447]
        // Move from tile_r3_c0 to tile_r2_c2 is valid L-shape (-1 row, +2 cols)
        const targetTileLabel = "tile_r2_c2";
        const command = `Move knight to ${targetTileLabel}`;

        console.log("Testing Hybrid Move:", command);

        // 2. Run Process
        const result = await processGameMove(client, currentState, rules, command, false, navMesh);

        console.log("Result Summary:", result.summary);
        console.log("Patches:", JSON.stringify(result.patches, null, 2));

        // 3. Verify
        expect(result.isValid).toBe(true);
        expect(result.newState).toBeDefined();

        // 4. Check Key Logic:
        // - The LLM should have updated the 'location' (we can't easily check internal step, but we check result)
        // - The Result State should have the Knight at the new pixel coordinates.

        const newKnight = result.newState.entities.find((e: any) => e.id === knightId);
        expect(newKnight).toBeDefined();

        // Check if location property exists (it should be in the enriched state that was patched)
        // Wait, rehydrateState returns the state. Does it keep 'location'?
        // The implementation adds 'location' in enrichment.
        // If we merge properly, it might be there.
        if (newKnight.location) {
            expect(newKnight.location).toBe(targetTileLabel);
        }

        // KEY CHECK: Pixel Box
        // It should match the center of tile_r5_c0
        const targetZone = navMesh.find(z => z.label === targetTileLabel);
        const [zYmin, zXmin, zYmax, zXmax] = targetZone.box_2d;

        const [nYmin, nXmin, nYmax, nXmax] = newKnight.pixel_box;
        const nCx = nXmin + (nXmax - nXmin) / 2;
        const nCy = nYmin + (nYmax - nYmin) / 2;

        // Verify center is within target title
        expect(nCx).toBeGreaterThan(zXmin);
        expect(nCx).toBeLessThan(zXmax);
        expect(nCy).toBeGreaterThan(zYmin);
        expect(nCy).toBeLessThan(zYmax);

        console.log("Knight New Center:", nCx, nCy);
        console.log("Target Zone Bounds:", zXmin, zXmax, zYmin, zYmax);
    }, 30000); // 30s timeout for LLM
});
