
import { describe, it, expect } from 'vitest';
import { runStateAgent } from "../../../llm/agents/state_agent";
import { MOCK_VISION_ANALYSIS, MOCK_NAVMESH } from "../../../llm/graph/mocks";

describe('MOCK: State Agent', () => {
    it('should generate game state from mock inputs', async () => {
        const runId = "mock_run_id";
        const gameState = runStateAgent(MOCK_VISION_ANALYSIS as any, MOCK_NAVMESH, runId);

        expect(gameState).toBeDefined();
        expect(gameState.meta.runId).toBe(runId);
        expect(gameState.entities.length).toBe(MOCK_VISION_ANALYSIS.length);
        expect(gameState.navMesh).toEqual(MOCK_NAVMESH);
    });
});
