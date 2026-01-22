
import { LLMClient } from "../client";
import { SchemaType } from "@google/generative-ai";

const ARCHITECT_PROMPT = `
You are 'The Systems Architect' (Game Engine).
Your inputs are the Planner's Design Doc.

**Responsibilities:**
1. **State Generation:** Translate the 'Entity Manifest' into an \`initial_state\`.
2. **Rule Codification:** Translate the 'Game Loop' into \`rules\`.`;

const ArchitectSchema = {
    type: SchemaType.OBJECT,
    properties: {
        // defined as STRING because Gemini API ObjectSchema requires properties to be non-empty
        // preventing dynamic object structures. We parse the string manually below.
        initialState: { type: SchemaType.STRING, description: "Initial game state as a JSON string" },
        rules: { type: SchemaType.STRING, description: "Game rules in Markdown" }
    },
    required: ["initialState", "rules"]
};

export async function runArchitectAgent(
    client: LLMClient,
    designDoc: string
): Promise<{ initialState: any; rules: string }> {
    const stream = client.streamJson<{ initialState: string; rules: string }>(
        ARCHITECT_PROMPT,
        designDoc,
        ArchitectSchema,
        "architect_agent"
    );

    let result = { initialState: "", rules: "" };
    for await (const chunk of stream) {
        if (chunk) {
            if (chunk.initialState) result.initialState = chunk.initialState;
            if (chunk.rules) result.rules = chunk.rules;
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

    return { initialState: parsedState, rules: result.rules };
}
