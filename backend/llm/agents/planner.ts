
import { LLMClient } from "../client";
import { SchemaType } from "@google/generative-ai";

export const PLANNER_SYSTEM_PROMPT = `
You are 'The Planner' (Game Designer).
Your goal is to take a raw user idea and convert it into a concrete 'Game Design Document'.

**Responsibilities:**
1. **Theme & Atmosphere:** Describe the vibe.
2. **Entity Manifest:** List every object needed.
3. **Game Loop:** How does a turn work? Win condition?
4. **CRITICAL - Interface Definition:** Explicitly describe the **Game Board Layout**.

**Output Format:**
Return a Markdown string with the following sections:
# Game Design Doc
## Theme
...
## Entity Manifest
...
## Game Loop
...
## Interface Definition
...
`;

export async function runPlanner(
    client: LLMClient,
    userInput: string,
    model: string = "gemini-2.5-flash"
): Promise<string> {
    const stream = client.streamJson<any>(
        PLANNER_SYSTEM_PROMPT,
        userInput,
        null, // No strict schema for markdown output, but wait, streamJson expects JSON. 
        // We should use a text generation method if we want MD. 
        // However, client.ts only exposes streamJson. 
        // Let's wrap the MD in a JSON object or modify client to support text.
        // For now, let's ask for JSON that contains the markdown, or just use streamJson and expect a JSON object with a 'content' field.
        "planner_agent"
    );

    // Let's ask for updates to the design doc in JSON format so we can stream it, 
    // OR we can just use the backend directly if we want text.
    // But `client.ts` wraps backend. 
    // Let's check `client.ts` again. It has `streamJson`. 
    // We will ask for a JSON object: { designDoc: string }

    // Actually, let's just modify the prompt to ask for JSON.
    /*
    {
        "designDoc": "# Game Design Doc..."
    }
    */

    let finalDoc = "";
    for await (const chunk of stream) {
        if (chunk && chunk.designDoc) {
            finalDoc = chunk.designDoc;
        }
    }
    return finalDoc;
}

// Adjusted Prompt for JSON output
// Adjusted Prompt for JSON output
export const PLANNER_JSON_PROMPT = `
You are 'The Planner' (Game Designer).
Your goal is to take a raw user idea and convert it into a concrete 'Game Design Document'.

**Responsibilities:**
1. **Theme & Atmosphere:** Describe the vibe.
2. **Entity Manifest:** List every object needed.
3. **Game Loop:** How does a turn work? Win condition?
4. **CRITICAL - Interface Definition:** Explicitly describe the **Game Board Layout**.
`;

const PlannerSchema = {
    type: SchemaType.OBJECT,
    properties: {
        designDoc: { type: SchemaType.STRING, description: "The complete Game Design Document in Markdown format" }
    },
    required: ["designDoc"]
};

export async function runPlannerAgent(
    client: LLMClient,
    userInput: string
): Promise<string> {
    const stream = client.streamJson<{ designDoc: string }>(
        PLANNER_JSON_PROMPT,
        userInput,
        PlannerSchema,
        "planner_agent"
    );

    let finalDoc = "";
    for await (const chunk of stream) {
        if (chunk && chunk.designDoc) {
            finalDoc = chunk.designDoc;
        }
    }
    return finalDoc;
}
