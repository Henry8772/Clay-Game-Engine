
import { GeminiBackend } from '../backend'; // Adjust import based on location
import { LLMClient } from "../client"; // We might need LLMClient or GeminiBackend directly
import { MOCK_VISION_ANALYSIS } from '../graph/mocks';

// We use GeminiBackend directly here because we need specific structured output 
// and the current LLMClient might mock or wrap things differently. 
// However, looking at the experiment, it uses GeminiBackend.
// Let's stick to the pattern used in experiment-3/test_step_3_analysis.ts but adapt for the agent signature.

export interface DetectedItem {
    box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0-1000
    label: string;
}

const ASSET_DESCRIPTION_PROMPT = `On the bottom player side, there are 5 character cards, each with a matching miniature in the board: a Knight, a Ranger, a Templar, a Healer, and Odin. On the top enemy side, there are 5 monster cards, each with a matching miniature : a Skeleton, a Ghost, a Vampire, a Zombie, and an Orc.`;

const ANALYSIS_PROMPT = `
    Detect the all of the prominent items in the image. The box_2d should be [ymin, xmin, ymax, xmax] normalized to 0-1000.

    Label is name + type, e.g. "knight_miniature" or "knight_card".
    ${ASSET_DESCRIPTION_PROMPT}

    JSON Format:
    [
      { "box_2d": [0,0,1000,1000], "label": "..." }
    ]
`;

export async function runVisionAgent(client: LLMClient, spriteBuffer: Buffer): Promise<DetectedItem[]> {
    console.log("[VisionAgent] Analyzing sprites...");

    if (client.isDebug) {
        console.log("[VisionAgent] Returning MOCK_VISION_ANALYSIS");
        return MOCK_VISION_ANALYSIS as unknown as DetectedItem[];
    }

    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY not set for Vision Agent");

    const backend = new GeminiBackend(key);

    const config = {
        temperature: 0.7,
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
