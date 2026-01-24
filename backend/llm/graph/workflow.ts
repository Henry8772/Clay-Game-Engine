
import { StateGraph, StateGraphArgs, START, END } from "@langchain/langgraph";
import { GraphState } from "./state";
import {
    nodePlanner,
    nodeArchitect,
    nodeUIDesigner,
    nodeGen,
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
    builder.addNode("gen", nodeGen as any);
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
    // Gen output is where this branch currently stops until asset generation is re-integrated

    // Logic Branch Flow
    // Architect -> Renderer (Assuming renderer might use architect state directly now, or waiting for mapper replacement)
    // For now we disconnect the merge into renderer since mapper is gone.
    // However, renderer needs inputs.
    // Let's connect Architect -> Renderer directly as a temporary measure or just end.
    // The visual branch also feeds renderer (layout).
    // Let's just leave them as terminal branches for now to avoid invalid edges if Renderer is broken without mapper.
    // Actually, let's look at Renderer requirements. It needs visualLayout, initialState, assetMap.
    // assetMap came from mapper. Now it's missing.
    // We will leave the graph disconnected at the end of Architect and Gen for now, as I'm removing the legacy parts.
    // Or I can add Renderer back if I can mock the missing parts, but safer to just disconnect.
    // Wait, the plan was just to remove the legacy nodes. I will leave the structure open-ended.

    // Architect -> END
    builder.addEdge("architect" as any, END);

    // Gen -> END
    builder.addEdge("gen" as any, END);

    return builder.compile();
}
