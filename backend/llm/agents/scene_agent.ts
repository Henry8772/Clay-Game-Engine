
import { LLMClient } from "../client";

const SCENE_PROMPT_TEMPLATE = `You are a master game artist.
    **Task:** Generate a high-fidelity gameplay screenshot.
    **Style:** {{ART_STYLE}}.
    **Perspective:** {{PERSPECTIVE}}.
    **Setting:** {{BACKGROUND_THEME}}.

    **Composition:**
    1. **Play Area:** A {{GRID_TYPE}} in the center.
    2. **Player Assets:** Place {{PLAYER_TEAM}} on one side.
    3. **Enemy Assets:** Place {{ENEMY_TEAM}} on the opposite side.
    4. **Obstacles:** Place {{OBSTACLES}} scattered around.
    5. **UI/HUD:** Visible elements: {{UI_ELEMENTS}}.

    **Constraint:** Ensure all assets are spatially isolated (no overlapping) for easy sprite extraction.
    `;

export async function runSceneAgent(client: LLMClient, design: import("./design_agent").GameDesign): Promise<Buffer> {
    console.log("[SceneAgent] Generating scene based on design...");

    let prompt = SCENE_PROMPT_TEMPLATE
        .replace("{{ART_STYLE}}", design.art_style)
        .replace("{{PERSPECTIVE}}", design.perspective)
        .replace("{{BACKGROUND_THEME}}", design.background_theme)
        .replace("{{GRID_TYPE}}", design.grid_type)
        .replace("{{PLAYER_TEAM}}", design.player_team.join(", "))
        .replace("{{ENEMY_TEAM}}", design.enemy_team.join(", "))
        .replace("{{OBSTACLES}}", design.obstacles.join(", "))
        .replace("{{UI_ELEMENTS}}", design.ui_elements.join(", "));

    const imageBuffer = await client.generateImage(prompt, "gemini-3-pro-image-preview", {
        config: { temperature: 1, aspectRatio: "16:9" }
    });

    return imageBuffer;
}
