
import { LLMClient } from "../client";
import { runUIPromptGeneratorAgent } from "./ui_prompt_generator";

export async function runUIDesignerAgent(
    client: LLMClient,
    requirements: string,
    blueprints: any
): Promise<{ imagePrompt: string; visualLayout: string[]; image: Buffer }> {
    // 1. Generate text prompt and layout
    console.log("🎨 UI Designer: Generating prompt...");
    const promptResult = await runUIPromptGeneratorAgent(client, requirements, blueprints);

    // 2. Generate actual image
    console.log("🎨 UI Designer: Generating image with prompt:", promptResult.imagePrompt);
    const imageBuffer = await client.generateImage(promptResult.imagePrompt);

    return {
        ...promptResult,
        image: imageBuffer
    };
}
