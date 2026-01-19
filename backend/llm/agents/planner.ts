
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
...`;

export async function runPlanner(
    client: LLMClient,
    userInput: string,
    model: string = "gemini-2.5-flash"
): Promise<string> {
    const stream = client.streamJson<any>(
        PLANNER_SYSTEM_PROMPT,
        userInput,
        null,
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
