
import { LLMClient } from "../client";
import { SchemaType } from "@google/generative-ai";

const UI_DESIGNER_PROMPT = `
You are 'The UI Designer'.
Your input is the Planner's technical requirements and asset list.

**Responsibilities:**
1. **Target Scene Design:** Create a comprehensive, high-fidelity image prompt that includes ALL requested assets in a cohesive scene.
2. **Layout Strategy:** Ensure assets are distinct and not overlapping significantly, to facilitate segmentation later.
`;

const UIDesignerSchema = {
    type: SchemaType.OBJECT,
    properties: {
        imagePrompt: { type: SchemaType.STRING, description: "Detailed prompt for the full target scene" },
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
    requirements: string
): Promise<{ imagePrompt: string; visualLayout: string[] }> {
    const stream = client.streamJson<{ imagePrompt: string; visualLayout: string[] }>(
        UI_DESIGNER_PROMPT,
        requirements,
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
