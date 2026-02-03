
export type ZoneType = "grid" | "stack" | "set";
export type Visibility = "public" | "private" | "owner" | "none";

// 2. SPATIAL DEFINITIONS (The "Map")
export interface Zone {
    ownerId?: string;     // If null, it's public (like the board)
    visibility: Visibility; // Crucial for card games
    type: ZoneType; // Hint for logic (e.g., stack has order)
}

// 3. THE ACTORS (Everything is an Entity)
export interface Entity {
    t: string;            // Template ID (Refers to static rules/assets)
    loc: string;          // Current Zone ID (e.g., "board", "hand_p1")
    pos?: string | number | null; // Specific position in zone (e.g., "c3", index 0)
    owner: string;        // Who controls this?

    // Dynamic State: ONLY changes go here.
    // Static stats (MaxHP, Cost) stay in the Reference Library, not State.
    props: Record<string, any>; // e.g., { hp: 50, tapped: true }
}

// 1. GLOBAL CONTEXT
export interface UniversalState {
    meta: {
        turnCount: number;      // e.g., 5
        activePlayerId: string; // e.g., "p1"
        phase: string;          // e.g., "upkeep", "combat", "end"
        vars: Record<string, any>; // Generic globals: { "p1_score": 10, "weather": "rain" }
    };
    zones: Record<string, Zone>;
    entities: Record<string, Entity>;
    blueprints?: Record<string, Blueprint>;
}

// BLUEPRINTS (Manifest)
// BLUEPRINTS (Manifest)
// Static data that doesn't belong in the State, but is needed for the Frontend/Hydration
export type MovementType = "walk" | "fly" | "teleport" | "swim";
export type TargetType = "enemy" | "ally" | "self" | "area" | "empty_tile";

export interface MovementLogic {
    type: MovementType;
    range: number;        // e.g. 3 tiles
    blocking_terrain?: string[]; // e.g. ["wall", "water"]
}

export interface ActionCapability {
    name: string;         // e.g. "Attack", "Heal"
    target_type: TargetType;
    range: number;
    area_of_effect?: number; // 0 or 1 = single tile, >1 = burst
    damage?: number;
    heal?: number;
    description?: string;
}

export interface Blueprint {
    id: string;             // Matches entities[x].t
    name: string;           // Display name
    renderType: "ASSET" | "COMPONENT";
    visualPrompt?: string;  // For image generation (if ASSET)
    description?: string;   // Functional description

    // Smart Client Metadata
    movement?: MovementLogic;
    capabilities?: ActionCapability[];

    baseStats?: Record<string, any>; // Static rules/stats (e.g., max_hp)
}


export interface ArchitectOutput {
    initialState: UniversalState;
    blueprints: Record<string, Blueprint>;
    rules: string;
}

// 4. RULES & ACTIONS
// Structured way to define what players can do
export interface GameRule {
    name: string;
    description: string;
    // Potentially structured logic, but for now LLM-driven text is fine
}

export type GameActionType = "MOVE" | "ATTACK" | "USE_ABILITY" | "END_TURN";

export interface GameAction {
    type: GameActionType;
    playerId: string;
    payload: {
        entityId?: string;
        targetId?: string; // Target Entity or Zone
        targetLocation?: string; // If moving to a zone
        [key: string]: any;
    };
    timestamp: number;
}
