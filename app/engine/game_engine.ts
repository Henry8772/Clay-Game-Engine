import { UniversalState, GameAction, GameActionType } from "../../backend/llm/agents/universal_state_types";
import { resolveGameAction } from "../../backend/llm/agents/game_logic";
import { GameTool } from "../../backend/llm/agents/game_tools";
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

    public async processAction(action: GameAction): Promise<GameTool[]> {
        // 1. Translate Action to Natural Language
        const command = this.translateActionToCommand(action);
        console.log(`[GameEngine] Processing Action: ${action.type} -> "${command}"`);

        // 2. Call Referee (LLM or Hybrid)
        const tools = await resolveGameAction(
            this.llmClient,
            this.state,
            this.rules,
            command
        );

        // 3. Apply Tools
        this.applyTools(tools);

        return tools;
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

    public async processCommand(command: string): Promise<GameTool[]> {
        console.log(`[GameEngine] Processing Raw Command: "${command}"`);
        const tools = await resolveGameAction(
            this.llmClient,
            this.state,
            this.rules,
            command
        );

        this.applyTools(tools);
        return tools;
    }

    public applyTools(tools: GameTool[]) {
        const logs: string[] = [];

        tools.forEach(tool => {
            console.log(`[Engine] Executing: ${tool.name}`, tool.args);

            switch (tool.name) {
                case "MOVE": {
                    const { entityId, toZoneId } = tool.args as any;
                    // @ts-ignore
                    const entity = this.state.entities.find(e => e.id === entityId);
                    if (entity) {
                        entity.location = toZoneId; // Logical update
                        entity.pixel_box = this.getZoneCoords(toZoneId); // Visual update
                        logs.push(`Moved ${entity.label || entityId} to ${toZoneId}`);
                    }
                    break;
                }

                case "DESTROY": {
                    const { entityId } = tool.args as any;
                    // @ts-ignore
                    this.state.entities = this.state.entities.filter(e => e.id !== entityId);
                    logs.push(`Destroyed ${entityId}`);
                    break;
                }

                case "SPAWN": {
                    const { templateId, toZoneId, owner } = tool.args as any;
                    const newId = `spawn_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

                    // @ts-ignore
                    this.state.entities.push({
                        id: newId,
                        t: templateId,
                        label: templateId.replace('tpl_', ''),
                        type: 'unit',
                        team: owner === 'player' ? 'blue' : 'red',
                        src: 'extracted/figure.png', // Placeholder
                        pixel_box: this.getZoneCoords(toZoneId)
                    });
                    logs.push(`Spawned ${templateId} at ${toZoneId}`);
                    break;
                }

                case "NARRATE": {
                    const { message } = tool.args as any;
                    logs.push(`Narrator: ${message}`);
                    break;
                }
            }
        });

        return { newState: this.state, logs };
    }

    private getZoneCoords(zoneId: string): number[] {
        if (!this.navMesh) return [0, 0, 0, 0];
        const zone = this.navMesh.find(z => z.label === zoneId);
        if (zone) {
            const [ymin, xmin, ymax, xmax] = zone.box_2d;
            // Center in zone
            const w = xmax - xmin;
            const h = ymax - ymin;
            // Let's say unit is 80% of tile
            const size = Math.min(w, h) * 0.8;
            const cy = ymin + h / 2;
            const cx = xmin + w / 2;
            return [cy - size / 2, cx - size / 2, cy + size / 2, cx + size / 2];
        }
        return [0, 0, 100, 100]; // Fallback
    }
}
