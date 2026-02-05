
import { GraphState } from "./state";
import { LLMClient } from "../client";
import { runSceneAgent } from "../agents/scene_agent";
import { runBackgroundAgent } from "../agents/background_agent";
import { runSpriteAgent } from "../agents/sprite_agent";
import { runVisionAgent } from "../agents/vision_agent";
import { runExtractionAgent } from "../agents/extraction_agent";
import { runNavMeshAgent } from "../agents/navmesh_agent";
import { runStateAgent } from "../agents/state_agent";
import { runDesignAgent } from "../agents/design_agent";
import * as Mocks from "./mocks";

// Helper to save artifacts
const saveRunArtifact = async (runId: string | undefined, filename: string, content: string | Buffer) => {
    if (!runId) return;
    try {
        const fs = await import("fs");
        const path = await import("path");
        const { DATA_RUNS_DIR } = await import("../utils/paths");
        const runDir = path.resolve(DATA_RUNS_DIR, runId);
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
    onProgress?: (msg: string) => Promise<void>;
}

// 0. Design Generator (NEW)
export const nodeDesignGenerator = async (state: GraphState, config?: { configurable?: GenerationGraphConfig }) => {
    const { client, onProgress } = config?.configurable || {};
    if (!client) throw new Error("Client not found");

    if (onProgress) await onProgress("Architecting Game Design...");

    const gameDesign = await runDesignAgent(client, state.userInput);
    await saveRunArtifact(state.runId, "design.json", JSON.stringify(gameDesign, null, 2));

    return { gameDesign };
};

// 1. Scene Generator
export const nodeSceneGenerator = async (state: GraphState, config?: { configurable?: GenerationGraphConfig }) => {
    const { client, onProgress } = config?.configurable || {};
    if (!client) throw new Error("Client not found");
    if (!state.gameDesign) throw new Error("Game Design missing");

    if (onProgress) await onProgress("Generating Scene...");

    const sceneImage = await runSceneAgent(client, state.gameDesign);
    await saveRunArtifact(state.runId, "scene.png", sceneImage);

    return { sceneImage };
};

// 2. Background Extractor
export const nodeBackgroundExtractor = async (state: GraphState, config?: { configurable?: GenerationGraphConfig }) => {
    const { client, onProgress } = config?.configurable || {};
    if (!client) throw new Error("Client not found");
    if (!state.sceneImage) throw new Error("Scene image missing");

    if (onProgress) await onProgress("Extracting Background...");

    const backgroundImage = await runBackgroundAgent(client, state.sceneImage);
    await saveRunArtifact(state.runId, "background.png", backgroundImage);

    return { backgroundImage };
};

// 3. Sprite Isolator
export const nodeSpriteIsolator = async (state: GraphState, config?: { configurable?: GenerationGraphConfig }) => {
    const { client, onProgress } = config?.configurable || {};
    if (!client) throw new Error("Client not found");
    if (!state.sceneImage) throw new Error("Scene image missing");

    if (onProgress) await onProgress("Isolating Sprites...");

    // Resolve run directory
    let runDir = undefined;
    if (state.runId) {
        const path = await import("path");
        const { DATA_RUNS_DIR } = await import("../utils/paths");
        runDir = path.resolve(DATA_RUNS_DIR, state.runId);
    }

    const spriteImage = await runSpriteAgent(client, state.sceneImage, runDir || "");
    await saveRunArtifact(state.runId, "sprites.png", spriteImage);

    return { spriteImage };
};

// 4. Vision Analyzer
export const nodeVisionAnalyzer = async (state: GraphState, config?: { configurable?: GenerationGraphConfig }) => {
    const { client, onProgress } = config?.configurable || {};
    if (!client) throw new Error("Client not found");
    if (!state.spriteImage) throw new Error("Sprite image missing");
    if (!state.gameDesign) throw new Error("Game Design missing");

    if (onProgress) await onProgress("Analyzing Sprites...");

    const analysisJson = await runVisionAgent(client, state.spriteImage, state.gameDesign);
    await saveRunArtifact(state.runId, "analysis.json", JSON.stringify(analysisJson, null, 2));

    return { analysisJson };
};

// 5. Asset Extractor
export const nodeAssetExtractor = async (state: GraphState, config?: { configurable?: GenerationGraphConfig }) => {
    const { onProgress } = config?.configurable || {};
    if (!state.spriteImage) throw new Error("Sprite image missing");
    if (!state.analysisJson) throw new Error("Analysis JSON missing");

    if (onProgress) await onProgress("Extracting Assets...");

    // Determine output directory based on runId
    const runId = state.runId || "debug_run";
    const path = await import("path");
    const { DATA_RUNS_DIR } = await import("../utils/paths");
    const outputDir = path.resolve(DATA_RUNS_DIR, runId, "extracted");

    const extractedAssets = await runExtractionAgent(state.spriteImage, state.analysisJson, outputDir);
    // Assets are saved by the agent directly to the outputDir

    return { extractedAssets };
};

// 6. NavMesh Generator
export const nodeNavMeshGenerator = async (state: GraphState, config?: { configurable?: GenerationGraphConfig }) => {
    const { client, onProgress } = config?.configurable || {};
    if (!client) throw new Error("Client not found");
    if (!state.backgroundImage) throw new Error("Background image missing");
    if (!state.gameDesign) throw new Error("Game Design missing");

    if (onProgress) await onProgress("Generating NavMesh...");

    const navMesh = await runNavMeshAgent(client, state.backgroundImage, state.gameDesign);
    await saveRunArtifact(state.runId, "navmesh.json", JSON.stringify(navMesh, null, 2));

    return { navMesh };
};

// 7. State Generator
export const nodeStateGenerator = async (state: GraphState, config?: { configurable?: GenerationGraphConfig }) => {
    const { client, onProgress } = config?.configurable || {};
    if (!client) throw new Error("Client not found");
    if (!state.analysisJson) throw new Error("Analysis JSON missing");
    if (!state.navMesh) throw new Error("NavMesh missing");
    if (!state.runId) throw new Error("Run ID missing");
    if (!state.gameDesign) throw new Error("Game Design missing");

    if (onProgress) await onProgress("Generating Game State...");

    const finalGameState = await runStateAgent(client, state.analysisJson, state.navMesh, state.runId, state.gameDesign);
    await saveRunArtifact(state.runId, "gamestate.json", JSON.stringify(finalGameState, null, 2));

    return { finalGameState };
};
