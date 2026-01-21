
import { StateGraph, StateGraphArgs, START, END } from "@langchain/langgraph";
import { GraphState } from "./state";
import {
    nodePlanner,
    nodeArchitect,
    nodeUIDesigner,
    nodeSceneDecomposer,
    nodeAssetRestorer,
    nodeGen,
    nodeMapper,
    nodeRenderer
} from "./nodes";

/**
 * Compile the Generation Workflow Graph.
 */
export function compileGenerationGraph() {
    // 1. Define State Channels
    const graphState: StateGraphArgs<GraphState>["channels"] = {
        userInput: { value: (x, y) => y ?? x, default: () => "" },
        designDoc: { value: (x, y) => y ?? x, default: () => null },
        initialState: { value: (x, y) => y ?? x, default: () => null },
        rules: { value: (x, y) => y ?? x, default: () => null },
        imagePrompt: { value: (x, y) => y ?? x, default: () => null },
        visualLayout: { value: (x, y) => y ?? x, default: () => null },
        generatedImage: { value: (x, y) => y ?? x, default: () => null },
        finalState: { value: (x, y) => y ?? x, default: () => null },
        assetMap: { value: (x, y) => y ?? x, default: () => null },
        reactCode: { value: (x, y) => y ?? x, default: () => null },
        detectedRegions: { value: (x, y) => y ?? x, default: () => null },
        restoredAssets: { value: (x, y) => y ?? x, default: () => null },
    };

    const builder = new StateGraph<GraphState>({ channels: graphState });

    // 2. Add Nodes
    builder.addNode("planner", nodePlanner as any);
    builder.addNode("architect", nodeArchitect as any);
    builder.addNode("ui_designer", nodeUIDesigner as any);
    builder.addNode("gen", nodeGen as any);
    builder.addNode("scene_decomposer", nodeSceneDecomposer as any);
    builder.addNode("asset_restorer", nodeAssetRestorer as any);
    builder.addNode("mapper", nodeMapper as any);
    builder.addNode("renderer", nodeRenderer as any);

    // 3. Define Edges (Use explicit logic-visual split)

    // Start -> Planner
    builder.addEdge(START, "planner" as any);

    // Planner -> Architect (Logic Branch)
    builder.addEdge("planner" as any, "architect" as any);

    // Planner -> UI Designer (Visual Branch)
    builder.addEdge("planner" as any, "ui_designer" as any);

    // Visual Branch Flow
    builder.addEdge("ui_designer" as any, "gen" as any);
    builder.addEdge("gen" as any, "scene_decomposer" as any);
    builder.addEdge("scene_decomposer" as any, "asset_restorer" as any);

    // Merge: Both Architect and Asset Restorer feed into Mapper
    // Note: In strict DAG, Mapper runs when BOTH are ready if acting as join, or twice.
    // For simplicity, we just add edges.
    builder.addEdge("architect" as any, "mapper" as any);
    builder.addEdge("asset_restorer" as any, "mapper" as any);

    // Mapper -> Renderer -> End
    builder.addEdge("mapper" as any, "renderer" as any);
    builder.addEdge("renderer" as any, END);

    return builder.compile();
}
