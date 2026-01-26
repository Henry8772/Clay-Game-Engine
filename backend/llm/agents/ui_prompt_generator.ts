
import { LLMClient } from "../client";
import { SchemaType } from "@google/generative-ai";

const UI_DESIGNER_PROMPT = `
You are 'The UI Designer'.
Your input is the Planner's technical requirements and the Architect's Blueprint Manifest.

**Responsibilities:**
1. **Target Scene Design:** Create a comprehensive, **high-quality pixel art** image prompt that includes ALL requested assets.
2. **Visual Style Enforcement:** Use keywords: "pixel art", "16-bit", "retro aesthetic", "highly detailed", "sharp edges", "no blur", "dithering", "flat 2D", "top-down view", "orthographic". 
   **STRICTLY FORBIDDEN:** Do not use "isometric", "2.5D", "three-quarter view", or "perspective".
3. **Layout Strategy:** Ensure assets are distinct and arranged on a flat 2D grid.
4. **Blueprint Integration:** Use the visual descriptions from the Blueprints to ensure the scene matches the game rules.

**Inputs:**
- Requirements: Abstract layout logic.
- Blueprints: Detailed visual descriptions of entities (e.g., "A red dragon with scales").
`;

const UIDesignerSchema = {
    type: SchemaType.OBJECT,
    properties: {
        imagePrompt: { type: SchemaType.STRING, description: "Detailed prompt for the full target scene, incorporating blueprint visuals" },
        visualLayout: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: "List of expected visual elements in the scene"
        }
    },
    required: ["imagePrompt", "visualLayout"]
};

export async function runUIPromptGeneratorAgent(
    client: LLMClient,
    requirements: string,
    blueprints: any
): Promise<{ imagePrompt: string; visualLayout: string[] }> {
    const inputData = `
REQUIREMENTS:
${requirements}

BLUEPRINTS (Visual Manifest):
${JSON.stringify(blueprints, null, 2)}
`;

    const stream = client.streamJson<{ imagePrompt: string; visualLayout: string[] }>(
        UI_DESIGNER_PROMPT,
        inputData,
        UIDesignerSchema,
        "ui_prompt_generator"
    );

    let result = { imagePrompt: "", visualLayout: [] as string[] };
    for await (const chunk of stream) {
        if (chunk) {
            if (chunk.imagePrompt) result.imagePrompt = chunk.imagePrompt;
            if (chunk.visualLayout) result.visualLayout = chunk.visualLayout;
        }
    }
    return result;
}
