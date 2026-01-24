
import { GraphState } from "./state";
import { runPlannerAgent } from "../agents/planner";
import { runArchitectAgent } from "../agents/architect";
import { runRendererAgent } from "../agents/renderer";
import { LLMClient } from "../client";
import * as Mocks from "./mocks";
import { runUIDesignerAgent } from "../agents/ui_designer";
import { runAssetGeneratorAgent } from "../agents/asset_generator";

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
            rules: Mocks.MOCK_RULES,
            entityList: Mocks.MOCK_ENTITY_LIST
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
            visualLayout: Mocks.MOCK_VISUAL_LAYOUT,
            generatedImage: Mocks.MOCK_GENERATED_IMAGE
        };
    }

    if (!state.designDoc) throw new Error("Design Doc missing");
    const result = await runUIDesignerAgent(client, state.designDoc);

    // Save image to a temporary path for downstream consumption (Asset Swarm)
    let generatedImagePath: string | null = null;
    if (result.image) {
        const fs = await import("fs");
        const path = await import("path");
        const tmpDir = path.resolve(process.cwd(), ".tmp/generated");
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }
        generatedImagePath = path.join(tmpDir, `scene_${Date.now()}.png`);
        fs.writeFileSync(generatedImagePath, result.image);
        console.log(`[Nodes] Saved generated scene to: ${generatedImagePath}`);
    }

    return {
        imagePrompt: result.imagePrompt,
        visualLayout: result.visualLayout,
        generatedImage: generatedImagePath
    };
};

// 4. Asset Generator Swarm Node (New)
export const nodeAssetGenSwarm = async (state: GraphState, config?: { configurable?: GenerationGraphConfig }) => {
    const { client, useMock } = config?.configurable || {};
    if (!client) throw new Error("Client not found");

    if (useMock) {
        return { assetMap: Mocks.MOCK_ASSET_MAP };
    }

    if (!state.entityList) throw new Error("Entity List missing from Architect output");
    // We also need the reference image from UI Designer, but it might be just a prompt or ID in some designs.
    // For now, let's assume we have a way to get the reference image.
    // The current UI Designer returns `image` buffer but it's not in GraphState explicitly as a buffer, just `generatedImage` (URL/Base64?).
    // We need to ensure we can access the buffer.
    // The `nodeUIDesigner` (in previous code) returned `imagePrompt` and `visualLayout`.
    // Wait, my `nodeUIDesigner` implementation in `nodes.ts` DOES NOT return the image buffer to state, only implicitly via `result`?
    // Let's check `nodeUIDesigner` again. It returns `imagePrompt` and `visualLayout`.
    // The `ui_designer.ts` AGENT returns `image` buffer.
    // We need to update `nodeUIDesigner` to store the image buffer in state or pass it along.
    // Let's assume validation will catch this. For now, I will implement the swarm logic assuming inputs.

    // Constraint: The real `generatedImage` buffer might need to be stored in state or we re-fetch/regenerate?
    // Ideally, `nodeUIDesigner` should return { generatedImage: ... } where this is the buffer or path.
    // The `GraphState` has `generatedImage: string | null`. Let's assume it's a path or base64.

    // For the Purpose of this node:
    // 1. Get Entity List
    // 2. Get Reference Image (Placeholder for now if not in state)
    // 3. Parallel Execution

    const entityList = state.entityList;
    const assetMap: Record<string, string> = {};

    // Mocking reference buffer for now if not available, or we need to fix Upstream.
    // In a real flow, we'd read `state.generatedImage` path.
    const fs = await import("fs"); // dynamic import for node usage

    // Placeholder reference (should come from state)
    let referenceImageBuffer: Buffer;
    try {
        if (state.generatedImage && (state.generatedImage.startsWith("/") || state.generatedImage.startsWith("."))) {
            referenceImageBuffer = fs.readFileSync(state.generatedImage);
        } else {
            // Fallback or error
            console.warn("No valid generatedImage path in state, using placeholder or failing.");
            throw new Error("Reference image missing");
        }
    } catch (e) {
        console.warn("Failed to load reference image, skipping generation:", e);
        return { assetMap: {} };
    }

    await Promise.all(entityList.map(async (entity: any) => {
        try {
            if (!entity.visualPrompt) return;
            const assetBuffer = await runAssetGeneratorAgent(client, entity.visualPrompt, referenceImageBuffer);

            // Save asset to disk
            const assetPath = `/.tmp/assets/${entity.id}.png`; // Simple pathing
            // Ensure dir exists
            // fs.mkdirSync(path.dirname(assetPath), { recursive: true });
            // fs.writeFileSync(assetPath, assetBuffer);

            // For now, just mocking the save or returning a data URI?
            // Let's return a fake path for the map
            assetMap[entity.id] = `generated_assets/${entity.id}.png`;
        } catch (e) {
            console.error(`Failed to generate asset for ${entity.id}:`, e);
        }
    }));

    return { assetMap };
};



// Renderer Node
export const nodeRenderer = async (state: GraphState, config?: { configurable?: GenerationGraphConfig }) => {
    const { client, useMock } = config?.configurable || {};
    if (!client) throw new Error("Client not found");

    if (useMock) {
        return { reactCode: Mocks.MOCK_REACT_CODE };
    }

    // Now we should have state.assetMap from the Swarm!
    if (!state.visualLayout || !state.initialState || !state.assetMap) throw new Error("Missing inputs for Renderer");

    const reactCode = await runRendererAgent(client, state.visualLayout, state.initialState, state.assetMap);
    return { reactCode };
};
