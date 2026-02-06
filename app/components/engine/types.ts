export type LayerType = 'AMBIENCE' | 'STAGE' | 'ACTORS' | 'JUICE';

export interface AssetManifest {
    id: string;
    role: 'BACKGROUND' | 'CONTAINER_FIT' | 'SPRITE' | 'ZONE';
    type?: 'GRID' | 'FAN' | 'FREE'; // For Zones
    src?: string; // For images
    color?: string; // For mock visuals
    config?: any; // Extra data (grid size, etc)
    initialState?: {
        x?: number;
        y?: number;
        scale?: number;
        rotation?: number;
    };
}

export interface SceneManifest {
    layers: {
        ambience: AssetManifest[];
        stage: AssetManifest[];
        actors: AssetManifest[]; // Entities + Zones
        juice: AssetManifest[];
    };
}

export interface UserCommand {
    type: "MOVE" | "CHAT"; // Frontend only really does these two
    description: string;   // The text for the LLM: "Player moves Hero to tile_1"
    payload: {             // The data for the Engine to "peek" at
        entityId?: string;
        targetId?: string;   // The NavMesh Zone ID
        text?: string;       // For chat
    };
}
