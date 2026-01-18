// @ts-nocheck
import { StateGraph, StateGraphArgs, START, END } from "@langchain/langgraph";
import { LLMClient } from "../client";
import { GameStateList } from "../../models/game_state";
import { extractGameState } from "../agents/game_state";

/**
 * Define the state interface for our graph.
 * It holds the extracted game states.
 */
export interface GraphState {
    gameStates: GameStateList | null;
}

/**
 * Arguments for compiling the graph.
 */
interface GameStateGraphArgs {
    client: LLMClient;
    rules: string;
    description: string;
    useMock?: boolean;
}

/**
 * Creates and compiles the StateGraph for Game State Extraction.
 */
export function compileGameGraph() {
    // 1. Define the State Graph
    const graphState: StateGraphArgs<GraphState>["channels"] = {
        gameStates: {
            value: (x: GameStateList | null, y: GameStateList | null) => y ?? x,
            default: () => null,
        },
    };

    const builder = new StateGraph<GraphState>({ channels: graphState });

    // 2. Define Nodes
    // We wrap the existing 'extractGameState' agent function into a node.
    // Note: Since 'extractGameState' is a generator, we'll iterate it to get the final result.
    const extractStateNode = async (state: GraphState, config?: { configurable?: GameStateGraphArgs }) => {
        const { client, rules, description, useMock } = config?.configurable || {};

        if (!client || !rules || !description) {
            throw new Error("Missing required configuration for extraction node.");
        }

        const generator = extractGameState(client, rules, description, useMock);
        let finalState: GameStateList | null = null;

        for await (const partial of generator) {
            finalState = partial;
        }

        return { gameStates: finalState };
    };

    builder.addNode("extract_state", extractStateNode);

    // 3. Define Edges
    builder.addEdge(START, "extract_state" as any);
    builder.addEdge("extract_state" as any, END);

    // 4. Compile
    return builder.compile();
}

/**
 * Helper to print the Mermaid diagram of the graph.
 */
export async function printMermaid() {
    const app = compileGameGraph();
    const mermaid = await app.getGraph().drawMermaid();
    console.log("\n📊 --- Mermaid Graph Visualization ---");
    console.log(mermaid);
    console.log("--------------------------------------\n");
    return mermaid;
}
