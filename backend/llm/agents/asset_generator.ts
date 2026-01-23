
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
    referenceImageBuffer: Buffer
): Promise<Buffer> {
    console.log(`[Asset Generator] Generating asset with prompt: "${prompt}"`);

    // Call the client's editImage method
    const resultImageBuffer = await client.editImage(prompt, referenceImageBuffer);

    console.log(`[Asset Generator] Asset generated (${resultImageBuffer.length} bytes)`);
    return resultImageBuffer;
}
