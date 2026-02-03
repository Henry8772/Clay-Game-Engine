
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

const ASSET_DESCRIPTION_PROMPT = `**Enemy Faction**
- **Goblin Archer Card**, **Goblin Miniature**
- **Orc Grunt Card**, **Orc Warrior Miniature**
- **Necromancer Card**, **Skeleton Miniature**
- **Stone Golem Card**, **Stone Golem Miniature**
- **Spirit Card**, **Ghost Miniature**

**Player Faction**
- **Black Guard Card**, **Dark Knight Miniature**
- **Dwarf Fighter Card**, **Dwarf Miniature**
- **Blue Wizard Card**, **Human Warrior Miniature**
- **Ranger Card**, **Elf Ranger Miniature**
- **Militia Card**, **Soldier Miniature**`;

const ANALYSIS_PROMPT = `
    Detect the all of the prominent items in the image. The box_2d should be [ymin, xmin, ymax, xmax] normalized to 0-1000.

    Use the name in the asset description as the label.
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
