
import { describe, it, expect } from 'vitest';
import { LLMClient } from "../../../llm/client";
import { runNavMeshAgent } from "../../../llm/agents/navmesh_agent";
import { MOCK_NAVMESH } from "../../../llm/graph/mocks";

describe('MOCK: NavMesh Agent', () => {
    it('should return mock navmesh', async () => {
        const client = new LLMClient("gemini", "gemini-3-flash-preview", true);
        const backgroundBuffer = Buffer.from("MOCK_BG");

        const data = await runNavMeshAgent(client, backgroundBuffer);

        expect(data).toBeDefined();
        expect(data).toEqual(MOCK_NAVMESH);
    });
});
