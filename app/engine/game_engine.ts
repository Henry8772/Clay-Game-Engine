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
    private blueprints: Record<string, any>; // Add field
    public turnChanged: boolean = false; // Track locally for access after processing

    constructor(
        initialState: UniversalState,
        rules: string,
        llmClient: LLMClient,
        navMesh: any[] = [],
        useMock: boolean = false,
        private engineTools: string[] = [],
        private engineLogic: string = ""
    ) {
        this.state = JSON.parse(JSON.stringify(initialState)); // Deep copy to own state
        // Extract blueprints from state
        // @ts-ignore
        this.blueprints = this.state.blueprints || {};

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
            command,
            this.engineTools,
            this.engineLogic
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

    public async processCommand(command: string): Promise<any> {
        this.turnChanged = false; // Reset the flag before processing a new command
        console.log(`[GameEngine] Processing Raw Command: "${command}"`);
        const tools = await resolveGameAction(
            this.llmClient,
            this.state,
            this.rules,
            command,
            this.engineTools,
            this.engineLogic
        );

        const { newState, logs, turnChanged } = this.applyTools(tools);

        // RETURN EVERYTHING
        return {
            tools,
            newState,
            logs,
            turnChanged,
            isValid: true
        };
    }

    public applyTools(tools: GameTool[]) {
        const logs: string[] = [];

        tools.forEach(tool => {
            console.log(`[Engine] Executing: ${tool.name}`, tool.args);

            switch (tool.name) {
                case "MOVE": {
                    const { entityId, toZoneId } = tool.args as any;
                    // @ts-ignore
                    const entity = this.state.entities[entityId];
                    if (entity) {
                        entity.location = toZoneId;

                        // 1. Get the destination zone
                        const zone = this.navMesh?.find(z => z.label === toZoneId);

                        if (zone && entity.pixel_box) {
                            // 2. Calculate current dimensions (Preserve Aspect Ratio)
                            const currentHeight = entity.pixel_box[2] - entity.pixel_box[0]; // ymax - ymin
                            const currentWidth = entity.pixel_box[3] - entity.pixel_box[1];  // xmax - xmin

                            // 3. Get center of destination zone
                            const [zYmin, zXmin, zYmax, zXmax] = zone.box_2d;
                            const zCy = zYmin + (zYmax - zYmin) / 2;
                            const zCx = zXmin + (zXmax - zXmin) / 2;

                            // 4. Create new box: Center +/- Half of ORIGINAL Size
                            entity.pixel_box = [
                                zCy - currentHeight / 2, // New Ymin
                                zCx - currentWidth / 2,  // New Xmin
                                zCy + currentHeight / 2, // New Ymax
                                zCx + currentWidth / 2   // New Xmax
                            ];
                        } else {
                            // Fallback if no current box exists (e.g. glitch)
                            entity.pixel_box = this.getZoneCoords(toZoneId);
                        }

                        logs.push(`Moved ${entity.label || entityId} to ${toZoneId}`);
                    }
                    break;
                }

                case "DESTROY": {
                    const { entityId } = tool.args as any;
                    // @ts-ignore
                    // @ts-ignore
                    if (this.state.entities[entityId]) {
                        // @ts-ignore
                        delete this.state.entities[entityId];
                    }
                    logs.push(`Destroyed ${entityId}`);
                    break;
                }

                case "SPAWN": {
                    const { templateId, toZoneId, owner } = tool.args as any;
                    const newId = `spawn_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

                    // 1. BLUEPRINT LOOKUP
                    const bp = this.blueprints[templateId];

                    if (!bp) {
                        console.warn(`[Engine] Missing blueprint for ${templateId}. Falling back to defaults.`);
                    }

                    const zone = this.navMesh?.find(z => z.label === toZoneId);
                    let box = [0, 0, 0, 0];

                    if (zone) {
                        const [ymin, xmin, ymax, xmax] = zone.box_2d;

                        // Calculate Center
                        const cy = ymin + (ymax - ymin) / 2;
                        const cx = xmin + (xmax - xmin) / 2;

                        // 2. CREATE A "POINT" BOX (Zero width/height)
                        // We set min and max to the same value. 
                        // This tells the system: "The entity is exactly here, but has 0 logical size"
                        box = [cy, cx, cy, cx];
                    }

                    // 2. CONSTRUCT INSTANCE
                    // We only store dynamic data. Static data stays in blueprints.
                    // However, for the frontend to render 'src' and 'label', 
                    // we currently copy it (easiest for now) OR the frontend must also have blueprints.
                    // Let's copy it to keep frontend simple for this MVP.

                    // @ts-ignore
                    this.state.entities[newId] = {
                        id: newId,
                        t: templateId,
                        // Hydrate from BP or Fallback
                        label: bp?.label || templateId,
                        type: bp?.type || 'unit',
                        team: owner === 'player' ? 'blue' : 'red',
                        // Hydrate Source
                        src: bp?.src || `extracted/${templateId.replace('tpl_', '')}.png`,
                        // Calculate Position
                        pixel_box: box,
                        location: toZoneId
                    };

                    logs.push(`Spawned ${bp?.label || templateId} at ${toZoneId}`);
                    break;
                }

                case "NARRATE": {
                    const { message } = tool.args as any;
                    logs.push(`Narrator: ${message}`);
                    break;
                }

                case "ATTACK": {
                    const { attackerId, targetId } = tool.args as any;

                    // @ts-ignore
                    const target = this.state.entities[targetId];
                    // @ts-ignore
                    const attacker = this.state.entities[attackerId];

                    if (target && attacker) {
                        const targetLocation = target.location;
                        const targetBox = target.pixel_box;

                        // 1. Destroy Target
                        // @ts-ignore
                        delete this.state.entities[targetId];
                        logs.push(`${attackerId} attacked and destroyed ${targetId}`);

                        // 2. Move Attacker to Target's Position (Conquest/Chess style)
                        // We reuse the exact logic from MOVE regarding box calculation if needed, 
                        // but since we have the target's EXACT box, we can just snap to it?
                        // Actually, let's keep it safe and just set location, relying on frontend or 
                        // a "re-snap" if we wanted to be precise. 
                        // But for now, let's just update location and box.
                        attacker.location = targetLocation;

                        // Optional: Snap to target's box (since they occupied a valid tile)
                        // This might be better than recalculating if the target was already well-placed.
                        if (targetBox) {
                            attacker.pixel_box = [...targetBox];
                        }

                        logs.push(`${attackerId} moved to ${targetLocation}`);
                    } else {
                        logs.push(`Attack failed: ${attackerId} -> ${targetId} (Entity missing)`);
                    }
                    break;
                }

                case "END_TURN": {
                    // 1. Get current meta
                    const meta = this.state.meta;
                    const players = meta.players || [{ id: 'default', type: 'human' }]; // Fallback

                    // 2. Calculate Next Index (Cyclic)
                    // (0 -> 1 -> 0) OR (0 -> 0 for puzzles)
                    const nextIndex = (meta.activePlayerIndex + 1) % players.length;

                    // 3. Update State
                    meta.activePlayerIndex = nextIndex;
                    meta.activePlayerId = players[nextIndex].id; // Helper for frontend
                    meta.turnCount++;

                    // 4. Log it
                    const nextPlayer = players[nextIndex];
                    logs.push(`Turn passed to ${nextPlayer.id} (${nextPlayer.type})`);

                    this.turnChanged = true;
                    break;
                }
            }
        });

        // Return updated state, logs, and explicit turnChanged flag
        return { newState: this.state, logs, turnChanged: this.turnChanged };
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
