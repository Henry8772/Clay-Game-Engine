import { UniversalState, GameAction, GameActionType } from "../../backend/llm/agents/universal_state_types";
import { processGameMove, GameUpdateResult } from "../../backend/llm/agents/game_referee";
import { LLMClient } from "../../backend/llm/client";

export class GameEngine {
    private state: UniversalState;
    private rules: string;
    private llmClient: LLMClient;
    private navMesh: any[]; // Optional, for hybrid logic
    private useMock: boolean;

    constructor(
        initialState: UniversalState,
        rules: string,
        llmClient: LLMClient,
        navMesh: any[] = [],
        useMock: boolean = false
    ) {
        this.state = JSON.parse(JSON.stringify(initialState)); // Deep copy to own state
        this.rules = rules;
        this.llmClient = llmClient;
        this.navMesh = navMesh;
        this.useMock = useMock;
    }

    public getState(): UniversalState {
        return this.state;
    }

    public async processAction(action: GameAction): Promise<GameUpdateResult> {
        // 1. Translate Action to Natural Language
        const command = this.translateActionToCommand(action);
        console.log(`[GameEngine] Processing Action: ${action.type} -> "${command}"`);

        // 2. Call Referee (LLM or Hybrid)
        const result = await processGameMove(
            this.llmClient,
            this.state,
            this.rules,
            command,
            this.useMock,
            this.navMesh
        );

        // 3. Apply Update if Valid
        if (result.isValid && result.newState) {
            console.log("[GameEngine] Move Validated. Updating State.");
            this.state = result.newState;

            // Auto-increment turn count if needed? 
            // The Referee might have done it via patches, but if not, we could enforce it.
            // For now, trust the Referee.
        } else {
            console.warn("[GameEngine] Move Rejected:", result.summary);
        }

        return result;
    }

    private translateActionToCommand(action: GameAction): string {
        const p = action.payload;
        switch (action.type) {
            case "MOVE":
                // "Move archer (id: 123) to tile_r1_c2"
                return `Move entity ${p.entityId} to ${p.targetLocation || p.targetId}`;
            case "ATTACK":
                return `Entity ${p.entityId} attacks ${p.targetId}`;
            case "USE_ABILITY":
                return `Entity ${p.entityId} uses ability ${p.abilityName} on ${p.targetId ?? "self"}`;
            case "END_TURN":
                return `Player ${action.playerId} ends their turn`;
            default:
                return JSON.stringify(action);
        }
    }

    // Helper to inject state directly (e.g. from Save/Load)
    public forceSetState(newState: UniversalState) {
        this.state = newState;
    }

    public async processCommand(command: string): Promise<GameUpdateResult> {
        console.log(`[GameEngine] Processing Raw Command: "${command}"`);
        const result = await processGameMove(
            this.llmClient,
            this.state,
            this.rules,
            command, // Direct pass-through
            this.useMock,
            this.navMesh
        );

        if (result.isValid && result.newState) {
            console.log("[GameEngine] Command Validated. Updating State.");
            this.state = result.newState;
        }

        return result;
    }
}
