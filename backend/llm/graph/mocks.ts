
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
    entities: [],
    resources: { gold: 100 }
};

export const MOCK_RULES = "Enemies spawn every 5 seconds.";

export const MOCK_IMAGE_PROMPT = "Cyberpunk sushi kitchen with neon lights.";
export const MOCK_VISUAL_LAYOUT = ["conveyor_belt", "chef_station_1"];

export const MOCK_GENERATED_IMAGE = "http://mock-image/sushi.png";

export const MOCK_FINAL_STATE = {
    entities: [{ id: "chef_1", type: "chef", x: 100, y: 100 }],
    resources: { gold: 100 }
};

export const MOCK_ASSET_MAP = {
    "chef_1": "assets/chef.png",
    "tuna": "assets/tuna.png"
};

export const MOCK_REACT_CODE = `
import React from 'react';
export function Game() {
  return <div>Mock Game</div>;
}
`;

export const MOCK_DETECTED_REGIONS = [
    { label: "chef", box2d: [100, 100, 200, 200], confidence: 0.95 },
    { label: "conveyor", box2d: [0, 800, 1000, 900], confidence: 0.90 }
];

export const MOCK_RESTORED_ASSETS = [
    { id: "chef_1", name: "Sushi Chef", description: "Pixel art chef", imagePath: "assets/chef.png" },
    { id: "conveyor_belt", name: "Conveyor Belt", description: "Industrial belt", imagePath: "assets/belt.png" }
];
