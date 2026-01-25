
import { LLMClient } from "../client";
import { SchemaType } from "@google/generative-ai";

const RENDERER_PROMPT = `
You are 'The Game Renderer' (Frontend Developer).
Your goal is to write the React code (\`Game.tsx\`).

**Inputs:**
1. Visual Layout (from Art Director)
2. Initial State Structure (from Architect)
3. Asset Map (from Mapper)

**Responsibilities:**
1. **Wireframing:** Write the React component.
2. **Binding:** Connect available state to UI.
3. **Assets:** Use the provided asset paths.

**CRITICAL Output Rules:**
- You MUST export the component as a named export: \`export const Game = ...\` (Do NOT use default export).
- The Component MUST accept an optional prop \`initialState\`: \`const Game = ({ initialState }) => { ... }\`.
- You MUST export \`INITIAL_STATE\` (JSON object) and \`GAME_RULES\` (string).
- You MUST export \`ASSET_MAP\` constant containing the asset paths.`;

const RendererSchema = {
    type: SchemaType.OBJECT,
    properties: {
        reactCode: { type: SchemaType.STRING, description: "Complete React component code" }
    },
    required: ["reactCode"]
};

export async function runRendererAgent(
    client: LLMClient,
    visualLayout: any,
    initialState: any,
    assetMap: any
): Promise<string> {
    const inputPayload = JSON.stringify({
        visualLayout,
        initialState,
        assetMap
    }, null, 2);

    const stream = client.streamJson<{ reactCode: string }>(
        RENDERER_PROMPT,
        inputPayload,
        RendererSchema,
        "renderer_agent"
    );

    let reactCode = "";
    for await (const chunk of stream) {
        if (chunk && chunk.reactCode) {
            reactCode = chunk.reactCode;
        }
    }
    return reactCode;
}
