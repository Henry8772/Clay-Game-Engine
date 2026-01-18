
import { GraphState } from "./state";
import { runPlannerAgent } from "../agents/planner";
import { runArchitectAgent } from "../agents/architect";
import { runArtistAgent } from "../agents/artist";
import { runMapperAgent } from "../agents/mapper";
import { runRendererAgent } from "../agents/renderer";
import { LLMClient } from "../client";
import * as Mocks from "./mocks";

export interface GenerationGraphConfig {
    client: LLMClient;
    useMock?: boolean;
}

// 1. Planner Node
export const nodePlanner = async (state: GraphState, config?: { configurable?: GenerationGraphConfig }) => {
    const { client, useMock } = config?.configurable || {};
    if (!client) throw new Error("Client not found");

    if (useMock) {
        return { designDoc: Mocks.MOCK_DESIGN_DOC };
    }

    const designDoc = await runPlannerAgent(client, state.userInput);
    return { designDoc };
};

// 2. Architect Node
export const nodeArchitect = async (state: GraphState, config?: { configurable?: GenerationGraphConfig }) => {
    const { client, useMock } = config?.configurable || {};
    if (!client) throw new Error("Client not found");

    if (useMock) {
        return {
            initialState: Mocks.MOCK_INITIAL_STATE,
            rules: Mocks.MOCK_RULES
        };
    }

    if (!state.designDoc) throw new Error("Design Doc missing");
    const result = await runArchitectAgent(client, state.designDoc);
    return {
        initialState: result.initialState,
        rules: result.rules
    };
};

// 3. Artist Node
export const nodeArtist = async (state: GraphState, config?: { configurable?: GenerationGraphConfig }) => {
    const { client, useMock } = config?.configurable || {};
    if (!client) throw new Error("Client not found");

    if (useMock) {
        return {
            imagePrompt: Mocks.MOCK_IMAGE_PROMPT,
            visualLayout: Mocks.MOCK_VISUAL_LAYOUT
        };
    }

    if (!state.designDoc) throw new Error("Design Doc missing");
    const result = await runArtistAgent(client, state.designDoc);
    return {
        imagePrompt: result.imagePrompt,
        visualLayout: result.visualLayout
    };
};

// 4. Gen Node (Image Gen)
export const nodeGen = async (state: GraphState, config?: { configurable?: GenerationGraphConfig }) => {
    const { useMock } = config?.configurable || {};

    // Always mock for now as we don't have Image Gen API connected
    // In real implementation, this would call DALL-E 3 or similar
    const generatedImage = useMock ? Mocks.MOCK_GENERATED_IMAGE : "http://placeholder.image/gen.png";
    return { generatedImage };
};

// 5. Mapper Node
export const nodeMapper = async (state: GraphState, config?: { configurable?: GenerationGraphConfig }) => {
    const { client, useMock } = config?.configurable || {};
    if (!client) throw new Error("Client not found");

    if (useMock) {
        return {
            finalState: Mocks.MOCK_FINAL_STATE,
            assetMap: Mocks.MOCK_ASSET_MAP
        };
    }

    if (!state.imagePrompt || !state.designDoc) throw new Error("Missing inputs for Mapper");
    // We ignore the actual image pixels for the textual mapper agent, just passing the prompts/intent
    const result = await runMapperAgent(client, state.imagePrompt, state.designDoc);
    return {
        finalState: result.finalState,
        assetMap: result.assetMap
    };
};

// 6. Renderer Node
export const nodeRenderer = async (state: GraphState, config?: { configurable?: GenerationGraphConfig }) => {
    const { client, useMock } = config?.configurable || {};
    if (!client) throw new Error("Client not found");

    if (useMock) {
        return { reactCode: Mocks.MOCK_REACT_CODE };
    }

    if (!state.visualLayout || !state.initialState || !state.assetMap) throw new Error("Missing inputs for Renderer");

    const reactCode = await runRendererAgent(client, state.visualLayout, state.initialState, state.assetMap);
    return { reactCode };
};
