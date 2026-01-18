
import { StateGraph, StateGraphArgs, START, END } from "@langchain/langgraph";
import { GraphState } from "./state";
import {
    nodePlanner,
    nodeArchitect,
    nodeArtist,
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
    };

    const builder = new StateGraph<GraphState>({ channels: graphState });

    // 2. Add Nodes
    builder.addNode("planner", nodePlanner as any);
    builder.addNode("architect", nodeArchitect as any);
    builder.addNode("artist", nodeArtist as any);
    builder.addNode("gen", nodeGen as any);
    builder.addNode("mapper", nodeMapper as any);
    builder.addNode("renderer", nodeRenderer as any);

    // 3. Define Edges (Linear Flow for Robustness)
    builder.addEdge(START, "planner" as any);
    builder.addEdge("planner" as any, "architect" as any);
    builder.addEdge("architect" as any, "artist" as any);
    builder.addEdge("artist" as any, "gen" as any);
    builder.addEdge("gen" as any, "mapper" as any);
    builder.addEdge("mapper" as any, "renderer" as any);
    builder.addEdge("renderer" as any, END);

    return builder.compile();
}
