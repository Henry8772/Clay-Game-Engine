
import { GraphState } from "./state";
import { runPlannerAgent } from "../agents/planner";
import { runArchitectAgent } from "../agents/architect";
import { runRendererAgent } from "../agents/renderer";
import { LLMClient } from "../client";
import * as Mocks from "./mocks";
import { runUIDesignerAgent } from "../agents/ui_designer";
import { runAssetGeneratorAgent } from "../agents/asset_generator";

// Helper to save artifacts
const saveRunArtifact = async (runId: string | undefined, filename: string, content: string | Buffer) => {
    if (!runId) return;
    try {
        const fs = await import("fs");
        const path = await import("path");
        const runDir = path.resolve(process.cwd(), ".tmp/runs", runId);
        if (!fs.existsSync(runDir)) {
            fs.mkdirSync(runDir, { recursive: true });
        }
        await fs.promises.writeFile(path.join(runDir, filename), content);
        console.log(`[Nodes] Saved ${filename} for run ${runId}`);
    } catch (e) {
        console.error(`[Nodes] Failed to save ${filename}:`, e);
    }
};

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

    // Save progress
    await saveRunArtifact(state.runId, "design_doc.md", designDoc);

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

    // Save progress
    const architectDump = JSON.stringify({
        initialState: result.initialState,
        rules: result.rules,
        entityList: result.entityList
    }, null, 2);
    await saveRunArtifact(state.runId, "architect_output.json", architectDump);

    return {
        initialState: result.initialState,
        rules: result.rules,
        entityList: result.entityList
    };
};

// 3. UI Designer Node
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
    const runId = state.runId;

    if (result.image && runId) {
        const fs = await import("fs");
        const path = await import("path");
        const tmpDir = path.resolve(process.cwd(), ".tmp/runs", runId, "generated");
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }
        generatedImagePath = path.join(tmpDir, `scene.png`);
        fs.writeFileSync(generatedImagePath, result.image);
        console.log(`[Nodes] Saved generated scene to: ${generatedImagePath}`);
    }

    // Save metadata
    const uiDump = JSON.stringify({
        imagePrompt: result.imagePrompt,
        visualLayout: result.visualLayout,
        generatedImagePath
    }, null, 2);
    await saveRunArtifact(runId, "ui_designer_output.json", uiDump);

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
            const path = await import("path");
            const runId = state.runId || "default";
            const assetsDir = path.resolve(process.cwd(), ".tmp/runs", runId, "assets");

            if (!fs.existsSync(assetsDir)) {
                fs.mkdirSync(assetsDir, { recursive: true });
            }

            const assetPath = path.join(assetsDir, `${entity.id}.png`);
            fs.writeFileSync(assetPath, assetBuffer);
            assetMap[entity.id] = assetPath;
        } catch (e) {
            console.error(`Failed to generate asset for ${entity.id}:`, e);
        }
    }));

    await saveRunArtifact(state.runId, "asset_map.json", JSON.stringify(assetMap, null, 2));

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

    // Safeguard: Inject INITIAL_STATE and GAME_RULES if missing
    let finalCode = reactCode;

    // Check and inject INITIAL_STATE
    if (!finalCode.includes("export const INITIAL_STATE")) {
        const stateStr = JSON.stringify(state.initialState, null, 2);
        finalCode += `\n\nexport const INITIAL_STATE = ${stateStr};\n`;
    }

    // Check and inject GAME_RULES
    if (!finalCode.includes("export const GAME_RULES")) {
        // Use JSON.stringify for safety but we might want just a string literal if it's text
        // rules is likely a string block
        const rulesStr = JSON.stringify(state.rules || "");
        finalCode += `\n\nexport const GAME_RULES = ${rulesStr};\n`;
    }

    // Safeguard: Ensure "Game" is exported as a named export
    // Remove "export default Game" if present
    if (finalCode.includes("export default Game")) {
        finalCode = finalCode.replace("export default Game;", "");
        finalCode = finalCode.replace("export default Game", "");
    }

    // Ensure the function is exported
    // Regex to find "const Game" or "function Game" and make sure it has "export"
    if (!finalCode.includes("export const Game") && !finalCode.includes("export function Game")) {
        // Try to find definition
        if (finalCode.includes("const Game")) {
            finalCode = finalCode.replace("const Game", "export const Game");
        } else if (finalCode.includes("function Game")) {
            finalCode = finalCode.replace("function Game", "export function Game");
        }
    }

    // Safeguard: Ensure Game accepts initialState prop (simplified check, regex would be better for full parsing)
    // We look for "({ initialState" or "props.initialState" or similar, but simplified: 
    // We just warn or rely on the agent prompt for the prop structure, 
    // BUT we can try to patch the functional component signature if completely missing.
    // For now, the prompt update is the primary defense for props.

    await saveRunArtifact(state.runId, "game-slot.tsx", finalCode);

    return { reactCode: finalCode };
};
