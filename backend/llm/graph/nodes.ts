
import { GraphState } from "./state";
import { runPlannerAgent } from "../agents/planner";
import { runArchitectAgent } from "../agents/architect";
import { runArtistAgent } from "../agents/artist";
import { runRendererAgent } from "../agents/renderer";
import { LLMClient } from "../client";
import * as Mocks from "./mocks";
import { runUIDesignerAgent } from "../agents/ui_designer";

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

// 3. UI Designer Node (Replaces Artist)
export const nodeUIDesigner = async (state: GraphState, config?: { configurable?: GenerationGraphConfig }) => {
    const { client, useMock } = config?.configurable || {};
    if (!client) throw new Error("Client not found");

    if (useMock) {
        return {
            imagePrompt: Mocks.MOCK_IMAGE_PROMPT,
            visualLayout: Mocks.MOCK_VISUAL_LAYOUT
        };
    }

    if (!state.designDoc) throw new Error("Design Doc missing");
    const result = await runUIDesignerAgent(client, state.designDoc);
    return {
        imagePrompt: result.imagePrompt,
        visualLayout: result.visualLayout
    };
};

// Legacy Artist Node (Optional, kept for backward compatibility if needed, but not used in new graph)
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

// Gen Node (Image Gen)
export const nodeGen = async (state: GraphState, config?: { configurable?: GenerationGraphConfig }) => {
    const { useMock } = config?.configurable || {};

    // Always mock for now as we don't have Image Gen API connected
    const generatedImage = useMock ? Mocks.MOCK_GENERATED_IMAGE : "http://placeholder.image/gen.png";
    return { generatedImage };
};

// Renderer Node
export const nodeRenderer = async (state: GraphState, config?: { configurable?: GenerationGraphConfig }) => {
    const { client, useMock } = config?.configurable || {};
    if (!client) throw new Error("Client not found");

    if (useMock) {
        return { reactCode: Mocks.MOCK_REACT_CODE };
    }

    // Note: assetMap is currently removed from state, so this might fail if checking for it.
    // However, we are removing the agents that produce it.
    // We should probably update this node to be robust or just leave it fail until fixed by new agents.
    // For now, removing assetMap check to allow compilation, or just keep it as is and let it be partial?
    // The request is to remove legacy agents.
    // If I leave `state.assetMap` here, it will be an error if I remove it from `GraphState` interface.
    // So I must remove `state.assetMap` usage here or update it.
    // I will comment it out or simplify.

    if (!state.visualLayout || !state.initialState) throw new Error("Missing inputs for Renderer");

    // Mock asset map for now or empty?
    const assetMap = {};
    const reactCode = await runRendererAgent(client, state.visualLayout, state.initialState, assetMap);
    return { reactCode };
};
