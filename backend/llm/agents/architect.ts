
import { LLMClient } from "../client";
import { SchemaType } from "@google/generative-ai";
import { UniversalState, Blueprint } from "./universal_state_types";

const ARCHITECT_PROMPT = `
You are 'The Systems Architect' (Game Engine).
Your inputs are the Planner's Design Doc.

**Goal:**
Design a **Universal Game State** that is flat, relational, and optimized for LLM patching.
Separate the universe into three buckets:
1. **Globals (meta):** The physics of the match (Time, Phase, Scores).
2. **Zones (zones):** Where things exist (Board, Hand, Deck, Graveyard).
3. **Entities (entities):** The things themselves (Pieces, Cards, Tokens).

**Architectural Rules:**
1. **Relational, Not Nested:** Do not nest entities inside zones. Entities have a \`loc\` property pointing to a zone ID.
2. **Hydration Pattern:**
   - **State (Dynamic):** Only store data that changes (position, current HP, tapped status).
   - **Blueprints (Static):** Store static rules, max stats, and visual descriptions in the Blueprint Registry (Manifest).
   - The State refers to Blueprints via the \`t\` (template) field.

**Detailed Schema:**

\`\`\`typescript
type UniversalState = {
  // 1. GLOBAL CONTEXT
  meta: {
    turnCount: number;
    activePlayerId: string;
    phase: string;          // e.g., "upkeep", "combat"
    vars: Record<string, any>; // Generic globals: { "score": 10 }
  },

  // 2. SPATIAL DEFINITIONS (The "Map")
  zones: {
    [zoneId: string]: {
      ownerId?: string;     // If null, it's public
      visibility: "public" | "private" | "owner" | "none";
      type: "grid" | "stack" | "set";
    }
  },

  // 3. THE ACTORS (Everything is an Entity)
  entities: {
    [entityId: string]: {
      t: string;            // Template ID (Refers to Blueprint)
      loc: string;          // Zone ID
      pos?: string | number | null;// Position in zone (e.g., "c3", 0)
      owner: string;        // Owner ID
      
      // Dynamic State: ONLY changes go here.
      props: Record<string, any>; // e.g., { hp: 50, tapped: true }
    }
  }
}
\`\`\`

**Output Requirements:**
1. **initialState**: The complete JSON matching \`UniversalState\`.
2. **blueprints**: A dictionary implementation of the Manifest.
   - Keys: Template IDs (e.g., "king", "dragon", "pawn").
   - Values: { id, name, renderType (ASSET/COMPONENT), visualPrompt, baseStats, description }.
     - \`renderType\`: "ASSET" for generated images (characters, items), "COMPONENT" for UI/CSS elements.
     - \`visualPrompt\`: Description for image generation (if ASSET).
     - \`baseStats\`: Static rules (e.g., { maxHp: 100, moveSet: "diagonal" }).
3. **rules**: The game rules in Markdown.
`;

const ArchitectSchema = {
  type: SchemaType.OBJECT,
  properties: {
    initialState: { type: SchemaType.STRING, description: "Initial game state as a valid JSON string (UniversalState)" },
    blueprints: { type: SchemaType.STRING, description: "Blueprint registry as a valid JSON string (Record<string, Blueprint>)" },
    rules: { type: SchemaType.STRING, description: "Game rules in Markdown" },
  },
  required: ["initialState", "blueprints", "rules"]
};

export async function runArchitectAgent(
  client: LLMClient,
  designDoc: string
): Promise<{ initialState: UniversalState; blueprints: Record<string, Blueprint>; rules: string }> {
  const stream = client.streamJson<{ initialState: string; blueprints: string; rules: string }>(
    ARCHITECT_PROMPT,
    designDoc,
    ArchitectSchema,
    "architect_agent"
  );

  let result = { initialState: "", blueprints: "", rules: "" };
  for await (const chunk of stream) {
    if (chunk) {
      if (chunk.initialState) result.initialState = chunk.initialState;
      if (chunk.blueprints) result.blueprints = chunk.blueprints;
      if (chunk.rules) result.rules = chunk.rules;
    }
  }

  let parsedState: any = {};
  let parsedBlueprints: any = {};

  try {
    if (result.initialState) parsedState = JSON.parse(result.initialState);
  } catch (e) {
    console.error("Failed to parse architect initial state:", e);
    console.error("Raw state:", result.initialState);
  }

  try {
    if (result.blueprints) parsedBlueprints = JSON.parse(result.blueprints);
  } catch (e) {
    console.error("Failed to parse architect blueprints:", e);
    console.error("Raw blueprints:", result.blueprints);
  }

  return {
    initialState: parsedState as UniversalState,
    blueprints: parsedBlueprints as Record<string, Blueprint>,
    rules: result.rules
  };
}
