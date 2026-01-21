
import { GraphState } from "./state";
import { runPlannerAgent } from "../agents/planner";
import { runArchitectAgent } from "../agents/architect";
import { runArtistAgent } from "../agents/artist";
import { runMapperAgent } from "../agents/mapper";
import { runRendererAgent } from "../agents/renderer";
import { LLMClient } from "../client";
import * as Mocks from "./mocks";
import { runUIDesignerAgent } from "../agents/ui_designer";
import { runSceneDecomposerAgent } from "../agents/scene_decomposer";
import { runAssetRestorerAgent } from "../agents/asset_restorer";

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

// 4. Scene Decomposer Node
export const nodeSceneDecomposer = async (state: GraphState, config?: { configurable?: GenerationGraphConfig }) => {
    const { client, useMock } = config?.configurable || {};
    if (!client) throw new Error("Client not found");

    if (useMock) {
        return { detectedRegions: Mocks.MOCK_DETECTED_REGIONS };
    }

    if (!state.visualLayout) throw new Error("Visual Layout missing");
    const result = await runSceneDecomposerAgent(client, state.visualLayout);
    return { detectedRegions: result };
};

// 5. Asset Restorer Node
export const nodeAssetRestorer = async (state: GraphState, config?: { configurable?: GenerationGraphConfig }) => {
    const { client, useMock } = config?.configurable || {};
    if (!client) throw new Error("Client not found");

    if (useMock) {
        return { restoredAssets: Mocks.MOCK_RESTORED_ASSETS };
    }

    if (!state.detectedRegions) throw new Error("Detected Regions missing");

    // Fan-out: Process each region
    const restoredAssets = await Promise.all(state.detectedRegions.map(region =>
        runAssetRestorerAgent(client, region)
    ));

    return { restoredAssets };
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

// Gen Node (Image Gen) - likely unused in new flow as UI Designer does prompt, but maybe needed for pixel gen?
// Actually UI Designer generates PROMPT. Who generates the IMAGE?
// In the plan: "UI Designer... Generates 'Target Scene'. Output: Image."
// My `ui_designer.ts` output `imagePrompt`.
// So we probably need a "Gen" node that takes prompt -> Image (Buffer/URL).
// `nodeGen` currently does that.
// So `UI Designer` -> `Gen` -> `Scene Decomposer`.
export const nodeGen = async (state: GraphState, config?: { configurable?: GenerationGraphConfig }) => {
    const { useMock } = config?.configurable || {};

    // Always mock for now as we don't have Image Gen API connected
    const generatedImage = useMock ? Mocks.MOCK_GENERATED_IMAGE : "http://placeholder.image/gen.png";
    return { generatedImage };
};

// Mapper Node
export const nodeMapper = async (state: GraphState, config?: { configurable?: GenerationGraphConfig }) => {
    const { client, useMock } = config?.configurable || {};
    if (!client) throw new Error("Client not found");

    if (useMock) {
        return {
            finalState: Mocks.MOCK_FINAL_STATE,
            assetMap: Mocks.MOCK_ASSET_MAP
        };
    }

    // Merge logic: use restoredAssets if available
    let assetMap: Record<string, string> = {};
    if (state.restoredAssets) {
        state.restoredAssets.forEach((asset: any) => {
            assetMap[asset.id] = asset.imagePath || "path/to/asset.png";
        });
    }

    // Call legacy mapper for state logic (assuming it handles design doc)
    const prompt = state.imagePrompt || "";
    const doc = state.designDoc || "";

    // If we have assetMap from Restorer, we might want to pass it or just merge results.
    // Mapper agent normally generates the map. We want to override it with our high-fidelity map.
    const result = await runMapperAgent(client, prompt, doc);

    return {
        finalState: result.finalState,
        assetMap: { ...result.assetMap, ...assetMap } // Priority to restored assets? Or legacy? Let's merge.
    };
};

// Renderer Node
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
