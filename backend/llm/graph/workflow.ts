
import { StateGraph, StateGraphArgs, START, END } from "@langchain/langgraph";
import { GraphState } from "./state";
import {
    nodePlanner,
    nodeArchitect,
    nodeUIDesigner,
    nodeAssetGenSwarm,
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
        entityList: { value: (x, y) => y ?? x, default: () => null },
        reactCode: { value: (x, y) => y ?? x, default: () => null },
    };

    const builder = new StateGraph<GraphState>({ channels: graphState });

    // 2. Add Nodes
    builder.addNode("planner", nodePlanner as any);
    builder.addNode("architect", nodeArchitect as any);
    builder.addNode("ui_designer", nodeUIDesigner as any);
    builder.addNode("asset_swarm", nodeAssetGenSwarm as any);
    builder.addNode("renderer", nodeRenderer as any);

    // 3. Define Edges (Linear Flow)

    // Start -> Planner
    builder.addEdge(START, "planner" as any);

    // Planner -> Architect
    builder.addEdge("planner" as any, "architect" as any);

    // Architect -> UI Designer
    builder.addEdge("architect" as any, "ui_designer" as any);

    // UI Designer -> Asset Swarm
    builder.addEdge("ui_designer" as any, "asset_swarm" as any);

    // Asset Swarm -> Renderer
    builder.addEdge("asset_swarm" as any, "renderer" as any);

    // Renderer -> END
    builder.addEdge("renderer" as any, END);

    return builder.compile();
}
