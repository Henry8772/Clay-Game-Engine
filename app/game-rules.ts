export const BASE_GAME_RULES = `
1. The game is played on a grid.
2. Tiles are labeled as tile_rX_cY.
3. Units cannot move into tiles occupied by obstacles (rocks).
4. Units cannot move into tiles occupied by other units (unless attacking, but for now just move).
`;

export const SPRITE_RULES = `
MOVEMENT RULES:
- Archer: Can move up to 2 tiles in any direction (orthogonal or diagonal).
- Knight: Moves in an 'L' shape: 2 steps in one cardinal direction (horizontal or vertical) and then 1 step perpendicular to that direction. Jumping over other units is allowed.
- Wizard: Can move up to 1 tile in any direction.
- Helper Icons (lightning spell icon, heal spell icon, haste spell icon): These are UI elements and cannot be moved by the player.
- Obstacles (rock, rocks): Cannot be moved.
- Sidebar: Units can be moved to the sidebar (label: sidebar_slot) to be removed from play.
`;
