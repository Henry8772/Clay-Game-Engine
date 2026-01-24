
import { LLMClient } from "../client";
import { SchemaType } from "@google/generative-ai";

const ARCHITECT_PROMPT = `
You are 'The Systems Architect' (Game Engine).
Your inputs are the Planner's Design Doc.

**Responsibilities:**
1. **State Generation:** Translate the 'Entity Manifest' into an \`initialState\`.
2. **Rule Codification:** Translate the 'Game Loop' into \`rules\`.
3. **Entity Extraction:** Create a structured \`entityList\` for visual generation.
4. **Render Type Determination:** For every object, you must decide its \`renderType\`:
    1. **ASSET**: Requires a generated image file (e.g., characters, items, board tiles).
    2. **COMPONENT**: A UI element built with code/CSS (e.g., text displays, panels, health bars, highlights).

**Entity List Requirements:**
- Must include EVERY visual element mentioned in the initialState.
- \`visualPrompt\`: Describe the object visually (e.g., "A pixel art potion bottle, red liquid, cork stopper").
`;

const ArchitectSchema = {
    type: SchemaType.OBJECT,
    properties: {
        // defined as STRING because Gemini API ObjectSchema requires properties to be non-empty
        // preventing dynamic object structures. We parse the string manually below.
        initialState: { type: SchemaType.STRING, description: "Initial game state as a JSON string" },
        rules: { type: SchemaType.STRING, description: "Game rules in Markdown" },
        entityList: {
            type: SchemaType.ARRAY,
            description: "List of entities for visual generation",
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    id: { type: SchemaType.STRING, description: "Unique ID matching initialState" },
                    name: { type: SchemaType.STRING, description: "Display name" },
                    renderType: { type: SchemaType.STRING, enum: ["ASSET", "COMPONENT"] },
                    description: { type: SchemaType.STRING, description: "Functional description" },
                    visualPrompt: { type: SchemaType.STRING, description: "Visual description for image generation" },
                },
                required: ["id", "name", "visualPrompt"]
            }
        }
    },
    required: ["initialState", "rules", "entityList"]
};

export async function runArchitectAgent(
    client: LLMClient,
    designDoc: string
): Promise<{ initialState: any; rules: string; entityList: any[] }> {
    const stream = client.streamJson<{ initialState: string; rules: string; entityList: any[] }>(
        ARCHITECT_PROMPT,
        designDoc,
        ArchitectSchema,
        "architect_agent"
    );

    let result = { initialState: "", rules: "", entityList: [] as any[] };
    for await (const chunk of stream) {
        if (chunk) {
            if (chunk.initialState) result.initialState = chunk.initialState;
            if (chunk.rules) result.rules = chunk.rules;
            if (chunk.entityList) result.entityList = chunk.entityList;
        }
    }

    let parsedState = {};
    try {
        if (result.initialState) {
            parsedState = JSON.parse(result.initialState);
        }
    } catch (e) {
        console.error("Failed to parse architect initial state:", e);
        console.error("Raw state:", result.initialState);
    }

    return {
        initialState: parsedState,
        rules: result.rules,
        entityList: result.entityList || []
    };
}
