
import { describe, it, beforeAll, expect } from "vitest";
import { processModification } from "../../../llm/agents/modification_agent";
import { LLMClient } from "../../../llm/client";
import { UniversalState } from "../../../llm/agents/universal_state_types";
import fs from "fs/promises";
import path from "path";

describe("Real: Modification Agent - Global Style Update", () => {
    let client: LLMClient;
    const runId = "boardgame"; // Use the real run ID

    beforeAll(() => {
        // Ensure CWD is project root, not backend dir
        if (process.cwd().endsWith('backend')) {
            process.chdir('..');
        }
        client = new LLMClient("gemini");
    });

    it("should update global sprite style using real assets", async () => {
        // 1. Load Real Game State
        const statePath = path.join(process.cwd(), 'backend', 'data', 'runs', runId, 'gamestate.json');
        const rawState = await fs.readFile(statePath, 'utf-8');
        const rawJson = JSON.parse(rawState);
        const currentState: UniversalState = rawJson.initialState || rawJson;

        // 2. Validate Pre-conditions
        const entityCount = Object.keys(currentState.entities).length;
        expect(entityCount).to.be.greaterThan(0);

        // Ensure sprites file exists
        const spritesPath = path.join(process.cwd(), 'backend', 'data', 'runs', runId, 'sprites.png');
        const spritesWhitePath = path.join(process.cwd(), 'backend', 'data', 'runs', runId, 'sprites_white.png');
        try {
            await fs.access(spritesWhitePath);
        } catch {
            try {
                await fs.access(spritesPath);
            } catch (e) {
                console.warn("Skipping test: No sprites.png or sprites_white.png found in boardgame run.");
                return;
            }
        }

        // 3. Run Modification Agent
        const userRequest = "Chnage all miniature and cards style to cyberpunk";
        const result = await processModification(client, runId, currentState, userRequest);

        // 4. Verification
        console.log("Modification Result:", result.message);

        expect(result.message).to.contain("Global style updated");
        expect(result.newState).to.exist;

        let foundUpdated = false;

        // Check entities (might be 0 if they lack labels)
        if (result.newState.entities) {
            for (const key in result.newState.entities) {
                const ent = result.newState.entities[key] as any;
                if (ent.src && ent.src.includes("extracted_restyle_")) {
                    foundUpdated = true;
                    break;
                }
            }
        }

        // Check blueprints (should match)
        if (!foundUpdated && result.newState.blueprints) {
            for (const key in result.newState.blueprints) {
                const bp = result.newState.blueprints[key] as any;
                if ((bp as any).src && (bp as any).src.includes("extracted_restyle_")) {
                    foundUpdated = true;
                    break;
                }
            }
        }

        if (foundUpdated) {
            expect(foundUpdated).to.be.true;
        } else {
            throw new Error(`No entities or blueprints were updated. Message: ${result.message}`);
        }

    }, 120000);
});
