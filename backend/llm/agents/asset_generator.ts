
import { LLMClient } from "../client";

/**
 * Run the Asset Generator Agent.
 * 
 * This agent takes a reference image and a prompt, and generates a new asset image
 * using the editImage capability of the LLM client.
 * 
 * @param client The LLMClient instance.
 * @param prompt The prompt describing the asset to generate/extract.
 * @param referenceImageBuffer The buffer of the reference image (e.g., target scene).
 * @returns A Promise resolving to the generated image buffer.
 */
export async function runAssetGeneratorAgent(
    client: LLMClient,
    prompt: string,
    // referenceImageBuffer: Buffer // Removed as we are switching to direct generation
): Promise<Buffer> {
    // Enforce isolation in the prompt
    const isolationPrompt = `${prompt}, isolated entity on a solid white background, no scene, no noise, single object, game sprite style`;

    console.log(`[Asset Generator] Generating asset with prompt: "${isolationPrompt}"`);

    // Call the client's generateImage method
    let resultImageBuffer = await client.generateImage(isolationPrompt);

    // Post-processing: Remove white background
    try {
        const { removeWhiteBackground } = await import("../utils/image_processor");
        resultImageBuffer = await removeWhiteBackground(resultImageBuffer);
        console.log(`[Asset Generator] Background removed.`);
    } catch (e) {
        console.warn(`[Asset Generator] Failed to remove background:`, e);
    }

    console.log(`[Asset Generator] Asset generated (${resultImageBuffer.length} bytes)`);
    return resultImageBuffer;
}
