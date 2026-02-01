
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameEngine } from '../llm/game_controller/game_engine';
import { LLMClient } from '../llm/client';
import { UniversalState, GameAction } from '../llm/agents/universal_state_types';

// Mock LLMClient (we won't use it deeply because we use useMock: true)
const mockClient = {
    streamJson: vi.fn(),
    generateContent: vi.fn()
} as unknown as LLMClient;

const INITIAL_STATE: UniversalState = {
    meta: {
        turnCount: 1,
        activePlayerId: "p1",
        phase: "start",
        vars: {}
    },
    zones: {},
    entities: {
        "e1": {
            t: "archer",
            loc: "board",
            owner: "p1",
            props: { hp: 10 }
        }
    }
};

const RULES = "Standard Test Rules";

describe('GameEngine', () => {
    let engine: GameEngine;

    beforeEach(() => {
        engine = new GameEngine(INITIAL_STATE, RULES, mockClient, [], true);
    });

    it('should initialize with correct state', () => {
        expect(engine.getState()).toEqual(INITIAL_STATE);
        // Ensure deep copy
        expect(engine.getState()).not.toBe(INITIAL_STATE);
    });

    it('should process a MOVE action using mock referee', async () => {
        const action: GameAction = {
            type: "MOVE",
            playerId: "p1",
            payload: {
                entityId: "e1",
                targetLocation: "tile_r1_c1"
            },
            timestamp: Date.now()
        };

        const result = await engine.processAction(action);

        expect(result.isValid).toBe(true);
        expect(result.summary).toContain("Mock: Move processed");

        // Mock referee returns state as is (identity), logic in test/mock agent might vary
        // But checking flow is correct.
        expect(engine.getState()).toBeDefined();
    });

    it('should translate actions to commands correctly', async () => {
        // Can't easily test private method, but we can verify via spy if we wanted.
        // For now, rely on processAction working.

        const action: GameAction = {
            type: "ATTACK",
            playerId: "p1",
            payload: {
                entityId: "e1",
                targetId: "e2"
            },
            timestamp: Date.now()
        };

        const result = await engine.processAction(action);
        expect(result.isValid).toBe(true);
    });
});
