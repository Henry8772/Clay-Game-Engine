
import { StateGraph, StateGraphArgs, START, END } from "@langchain/langgraph";
import { GraphState } from "./state";
import {
    nodeDesignGenerator,
    nodeSceneGenerator,
    nodeBackgroundExtractor,
    nodeSpriteIsolator,
    nodeVisionAnalyzer,
    nodeAssetExtractor,
    nodeNavMeshGenerator,
    nodeStateGenerator
} from "./nodes";

/**
 * Compile the Generation Workflow Graph.
 */
export function compileGenerationGraph() {
    // 1. Define State Channels
    const graphState: StateGraphArgs<GraphState>["channels"] = {
        userInput: { value: (x, y) => y ?? x, default: () => "" },
        runId: { value: (x, y) => y ?? x, default: () => "" },

        // NEW: The Source of Truth
        gameDesign: { value: (x, y) => y ?? x, default: () => undefined },

        // New Image Workflow artifacts
        sceneImage: { value: (x, y) => y ?? x, default: () => undefined },
        backgroundImage: { value: (x, y) => y ?? x, default: () => undefined },
        spriteImage: { value: (x, y) => y ?? x, default: () => undefined },
        analysisJson: { value: (x, y) => y ?? x, default: () => undefined },
        extractedAssets: { value: (x, y) => y ?? x, default: () => undefined },
        navMesh: { value: (x, y) => y ?? x, default: () => undefined },
        finalGameState: { value: (x, y) => y ?? x, default: () => undefined },
    };

    const builder = new StateGraph<GraphState>({ channels: graphState });

    // 2. Add Nodes
    builder.addNode("design_generator", nodeDesignGenerator as any);
    builder.addNode("scene_generator", nodeSceneGenerator as any);
    builder.addNode("background_extractor", nodeBackgroundExtractor as any);
    builder.addNode("sprite_isolator", nodeSpriteIsolator as any);
    builder.addNode("vision_analyzer", nodeVisionAnalyzer as any);
    builder.addNode("asset_extractor", nodeAssetExtractor as any);
    builder.addNode("navmesh_generator", nodeNavMeshGenerator as any);
    builder.addNode("state_generator", nodeStateGenerator as any);

    // 3. Define Edges (Linear Flow)

    // START -> Design
    builder.addEdge(START, "design_generator" as any);

    // Design -> Scene
    builder.addEdge("design_generator" as any, "scene_generator" as any);

    // Scene -> Background
    builder.addEdge("scene_generator" as any, "background_extractor" as any);

    // Background -> Sprite
    // (Note: Sprite uses scene, but we sequence it here to ensure background is done/saved)
    builder.addEdge("background_extractor" as any, "sprite_isolator" as any);

    // Sprite -> Vision
    builder.addEdge("sprite_isolator" as any, "vision_analyzer" as any);

    // Vision -> Extraction
    builder.addEdge("vision_analyzer" as any, "asset_extractor" as any);

    // Extraction -> NavMesh
    // (NavMesh uses Background, but we sequence it later to allow extraction to finish first)
    builder.addEdge("asset_extractor" as any, "navmesh_generator" as any);

    // NavMesh -> State
    builder.addEdge("navmesh_generator" as any, "state_generator" as any);

    // State -> END
    builder.addEdge("state_generator" as any, END);

    return builder.compile();
}
