
/**
 * GraphState defines the shared state across the generation workflow.
 * Trace the flow from User Input -> Final Game Component.
 */
export interface GraphState {
    // 1. Input
    userInput: string;

    // 2. Planner Output
    designDoc: string | null;

    // 3. Architect Output
    initialState: any | null; // JSON structure
    rules: string | null;

    // 4. Artist Output
    imagePrompt: string | null;
    visualLayout: any | null; // List of items/layout intent

    // 5. Gen Output (Mocked/Real)
    generatedImage: string | null; // URL or Base64

    // 6. Mapper Output
    finalState: any | null; // Reconciled JSON
    assetMap: any | null; // ID to Asset Path/URL map

    // New Fields
    entityList: any[] | null;

    // 7. Renderer Output
    reactCode: string | null;
}
