
import { LLMClient } from "../client";

const SCENE_PROMPT_TEMPLATE = `You are a master pixel artist for a 1990s SNES tactical RPG.

**Task:** Generate a high-fidelity, top-down gameplay screenshot of a "Tactical Puzzle" setup.
**Constraint:** This is a "Closed System" game. All game pieces that exist in the match must be visible on screen NOW.

**CORE COMPOSITION:**
1.  **Perspective:** Strict orthographic top-down (90° camera).
2.  **Layout:**
    * **The Grid (Battlefield):** A central 6x6 tiled area (stone dungeon floor).
        * **Content:** Place exactly 3 "Hero" units (Blue team) on the bottom row.
        * **Content:** Place exactly 4 "Monster" units (Red team) scattered in the middle/top rows.
        * **Obstacles:** Place 2 rock obstacles on the grid.
        * **Empty Space:** The rest of the tiles must be empty and flat.
    * **The UI Rails (Sidebars):**
        * **Left Sidebar:** A vertical rack containing 3 "Ability Icons" or "Power-up Tokens" (These are interactive items).
        * **Right Sidebar:** An empty "Graveyard" zone (a dark pit or trash bin) where defeated units will be dragged to.

**Playability Rules:**
* **Isolation:** Every single unit, obstacle, and icon must be surrounded by at least a few pixels of "floor".
* **No Stacking:** Nothing overlaps.
* **Total Visibility:** Do not hide anything behind walls.

**Art Direction:**
* **Style:** Crisp 16-bit pixel art.
* **Color Coding:** Blue units must look distinct from Red units (e.g., Blue armor vs Red skin) so the logic can auto-team them.

**User Request:**
{{USER_REQUEST}}
`;

export async function runSceneAgent(client: LLMClient, userRequest: string): Promise<Buffer> {
    const prompt = SCENE_PROMPT_TEMPLATE.replace("{{USER_REQUEST}}", userRequest);

    console.log("[SceneAgent] Generating scene...");
    const imageBuffer = await client.generateImage(prompt, "gemini-3-pro-image-preview", {
        config: { temperature: 1, aspectRatio: "16:9" }
    });

    return imageBuffer;
}
