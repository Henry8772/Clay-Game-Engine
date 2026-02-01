
import { GeminiBackend } from '../backend'; // Adjust import based on location
import { LLMClient } from "../client"; // We might need LLMClient or GeminiBackend directly

// We use GeminiBackend directly here because we need specific structured output 
// and the current LLMClient might mock or wrap things differently. 
// However, looking at the experiment, it uses GeminiBackend.
// Let's stick to the pattern used in experiment-3/test_step_3_analysis.ts but adapt for the agent signature.

export interface DetectedItem {
    box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0-1000
    label: string;
}

const ANALYSIS_PROMPT = `
    Detect the all of the prominent items in the image. The box_2d should be [ymin, xmin, ymax, xmax] normalized to 0-1000.

    JSON Format:
    [
      { "box_2d": [0,0,1000,1000], "label": "..." }
    ]
`;

export async function runVisionAgent(client: LLMClient, spriteBuffer: Buffer): Promise<DetectedItem[]> {
    console.log("[VisionAgent] Analyzing sprites...");

    // We can use client.generateContent if it supports images and config
    // The current LLMClient wrapper has generateContent but it might not support the exact config we need for JSON mode cleanly if not exposed.
    // Let's assume we can use the backend from the client if exposed, or we construct a temporary backend.
    // Ideally, we should extend LLMClient to support this, but for now, let's reach into the backend if possible or just instantiate it.

    // WORKAROUND: In experiment-3, it instantiates GeminiBackend directly. 
    // We will do the same for now to ensure compatibility, assuming we have the key.
    // In a real agent, we should probably add this capability to LLMClient.

    // Check if client has a backend we can use... it's private usually.
    // Let's just use the key from environment for now, assuming the agent runs in an env where the key is available.

    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY not set for Vision Agent");

    // Note: This creates a new backend instance. In a refactor, we should reuse the one from LLMClient.
    const backend = new GeminiBackend(key);

    const config = {
        temperature: 0.5,
        responseMimeType: "application/json",
        thinkingConfig: {
            thinkingLevel: 'HIGH' as const,
        },
    };

    const imagePart = {
        inlineData: {
            data: spriteBuffer.toString('base64'),
            mimeType: "image/png"
        }
    };

    const responseText = await backend.generateContent(
        [{ role: "user", parts: [{ text: ANALYSIS_PROMPT }, imagePart] }],
        "gemini-3-flash-preview", // Hardcoded per experiment
        { config: config }
    );

    try {
        const detectedItems = JSON.parse(responseText);
        return detectedItems;
    } catch (e) {
        console.error("Failed to parse vision analysis:", responseText);
        throw e;
    }
}
