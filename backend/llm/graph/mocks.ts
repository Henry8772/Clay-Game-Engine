
/**
 * Mocks for the Generation Workflow.
 */
export const MOCK_DESIGN_DOC = `
# Game Design Doc: Sushi Tower Defense
## Theme
Cyberpunk Sushi Kitchen.
## Entity Manifest
- Chef (Tower)
- Tuna Roll (Enemy)
## Game Loop
Enemies move along conveyor belt. Chefs throw knives.
## Interface Definition
Conveyor belt at bottom. Kitchen counters at top.
`;

export const MOCK_INITIAL_STATE = {
    meta: { turnCount: 1, activePlayerId: "p1", phase: "setup", vars: {} },
    zones: {
        conveyor: { type: "grid", visibility: "public", ownerId: null },
        kitchen: { type: "set", visibility: "public", ownerId: "p1" }
    },
    entities: {
        chef_1: { t: "chef", loc: "kitchen", pos: 1, owner: "p1", props: { level: 1 } },
        tuna_1: { t: "tuna", loc: "conveyor", pos: 0, owner: "cpu", props: { hp: 10 } }
    }
};

export const MOCK_BLUEPRINTS = {
    chef: {
        id: "chef",
        name: "Sushi Chef",
        renderType: "ASSET",
        description: "The main tower that throws knives",
        visualPrompt: "A pixel art sushi chef in white uniform holding a knife",
        baseStats: { cost: 50, damage: 10 }
    },
    tuna: {
        id: "tuna",
        name: "Tuna Roll",
        renderType: "ASSET",
        description: "Basic enemy unit",
        visualPrompt: "A pixel art tuna sushi roll with angry eyes",
        baseStats: { speed: 1, reward: 5 }
    }
};

export const MOCK_RULES = "Enemies spawn every 5 seconds.";

export const MOCK_ENTITY_LIST = Object.values(MOCK_BLUEPRINTS); // Backward compat if needed

export const MOCK_IMAGE_PROMPT = "Cyberpunk sushi kitchen with neon lights.";
export const MOCK_VISUAL_LAYOUT = ["conveyor_belt", "chef_station_1"];

export const MOCK_GENERATED_IMAGE = "http://mock-image/sushi.png";

export const MOCK_FINAL_STATE = MOCK_INITIAL_STATE;

export const MOCK_ASSET_MAP = {
    "chef": "extracted/chef.png",
    "tuna": "extracted/tuna.png"
};

export const MOCK_REACT_CODE = `
import React from 'react';

export const INITIAL_STATE = ${JSON.stringify(MOCK_INITIAL_STATE)};
export const BLUEPRINTS = ${JSON.stringify(MOCK_BLUEPRINTS)};
export const GAME_RULES = "Mock Rules";
export const ASSET_MAP = {};

export function Game() {
  return <div>Mock Game</div>;
}
`;

export const MOCK_DETECTED_REGIONS = [
    { label: "chef", box2d: [100, 100, 200, 200], confidence: 0.95 },
    { label: "conveyor", box2d: [0, 800, 1000, 900], confidence: 0.90 }
];

export const MOCK_RESTORED_ASSETS = [
    { id: "chef", name: "Sushi Chef", description: "Pixel art chef", imagePath: "extracted/chef.png" },
    { id: "conveyor", name: "Conveyor Belt", description: "Industrial belt", imagePath: "extracted/belt.png" }
];

export const MOCK_VISION_ANALYSIS = [
    { box_2d: [100, 100, 200, 200], label: "hero_knight" },
    { box_2d: [300, 300, 400, 400], label: "enemy_goblin" }
];

export const MOCK_NAVMESH = [
    { box_2d: [0, 0, 166, 166], label: "tile_r0_c0" },
    { box_2d: [0, 166, 166, 332], label: "tile_r0_c1" },
    { box_2d: [166, 0, 332, 166], label: "tile_r1_c0" },
    { box_2d: [166, 166, 332, 332], label: "tile_r1_c1" }
];
