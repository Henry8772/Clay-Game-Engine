
import { LLMClient } from "../client";
import { SchemaType } from "@google/generative-ai";

const ARCHITECT_PROMPT = `
You are 'The Systems Architect' (Game Engine).
Your inputs are the Planner's Design Doc.

**Responsibilities:**
1. **State Generation:** Translate the 'Entity Manifest' into an \`initial_state.json\`.
2. **Rule Codification:** Translate the 'Game Loop' into \`rules.md\`.`;

const ArchitectSchema = {
    type: SchemaType.OBJECT,
    properties: {
        initialState: { type: SchemaType.OBJECT, description: "Initial game state structure" },
        rules: { type: SchemaType.STRING, description: "Game rules in Markdown" }
    },
    required: ["initialState", "rules"]
};

export async function runArchitectAgent(
    client: LLMClient,
    designDoc: string
): Promise<{ initialState: any; rules: string }> {
    const stream = client.streamJson<{ initialState: any; rules: string }>(
        ARCHITECT_PROMPT,
        designDoc,
        ArchitectSchema,
        "architect_agent"
    );

    let result = { initialState: {}, rules: "" };
    for await (const chunk of stream) {
        if (chunk) {
            if (chunk.initialState) result.initialState = chunk.initialState;
            if (chunk.rules) result.rules = chunk.rules;
        }
    }
    return result;
}
