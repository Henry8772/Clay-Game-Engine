
/**
 * GraphState defines the shared state across the generation workflow.
 * Trace the flow from User Input -> Final Game Component.
 */
export interface GraphState {
    // 1. Input
    userInput: string;
    runId?: string;

    // --- NEW IMAGE WORKFLOW STATE ---

    // NEW: The Source of Truth
    gameDesign?: import("../agents/design_agent").GameDesign;

    // --- NEW IMAGE WORKFLOW STATE ---
    sceneImage?: Buffer;
    backgroundImage?: Buffer;
    spriteImage?: Buffer;
    analysisJson?: any[];
    extractedAssets?: Record<string, string>;
    navMesh?: any[];
    finalGameState?: any;
}
