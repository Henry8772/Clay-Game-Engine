
import { LLMClient } from "../client";
import { SchemaType } from "@google/generative-ai";

const RENDERER_PROMPT = `
You are 'The Game Renderer' (Frontend Developer).
Your goal is to write a COMPLETE, STANDALONE React file (\`game-slot.tsx\`).

**Inputs:**
1. Visual Layout (from Art Director)
2. Initial State Structure (from Architect) - "Universal Game State" (meta, zones, entities)
3. Blueprint Manifest (from Architect) - Static traits/stats for entities (look up via entity.t)
4. Asset Map (from Mapper) - Paths to assets (look up via entity key or template ID)

**Responsibilities:**
1. **Wireframing:** Write the React component using the Visual Layout as a guide.
2. **Binding:** Connect the \`initialState\` to the UI.
   - Use \`initialState.entities[id]\` for dynamic data (pos, hp).
   - Use the Blueprint Manifest to look up static data (visuals, max stats) using \`entity.t\`.
3. **Assets:** Use the provided asset paths from \`ASSET_MAP\`.
4. **Hydration:** Create a helper utility to merge static Blueprints with dynamic Entity State.
   - Example: \`const getEntity = (id) => { return { ...BLUEPRINTS[state.entities[id].t], ...state.entities[id] } }\`
5. **State Persistence:** Call \`onStateChange(newState)\` whenever the game state is updated to persist changes to the database.

**CRITICAL Output Rules:**
- START with: \`"use client";\` (for Next.js Client Component)
- INCLUDE all necessary imports at the top: React, hooks (useState, useEffect, useRef), lucide-react icons ONLY
- DO NOT import custom icons or non-existent libraries. Only use standard HTML elements and CSS for UI.
- If you need icons, ONLY use well-known lucide-react icons like: Heart, Star, Sparkles, Zap, AlertCircle, ChevronDown, Expand, Copy, etc.
- NEVER import non-existent libraries or custom components. Use only React and standard HTML/CSS.
- You MUST export the component as a named export: \`export const Game = ...\` (Do NOT use default export).
- The Component MUST accept props: \`const Game = ({ initialState, onStateChange }) => { ... }\`
  - \`initialState\`: Optional initial game state
  - \`onStateChange\`: Optional callback function to persist state changes: \`(newState: any) => void\`
- You MUST export \`INITIAL_STATE\` (JSON object) and \`GAME_RULES\` (string).
- You MUST export \`BLUEPRINTS\` (JSON object) containing the manifest.
- You MUST export \`ASSET_MAP\` constant containing the asset paths.
- The output should be a COMPLETE, STANDALONE file ready to use - no fragmentation.
- IMPORTANT: Call \`onStateChange(newState)\` whenever state is updated (after each move, capture, turn change, etc).
`;

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
    blueprints: any,
    assetMap: any
): Promise<string> {
    const inputPayload = JSON.stringify({
        visualLayout,
        initialState,
        blueprints,
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
