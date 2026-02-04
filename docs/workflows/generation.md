# Generation Workflow

The generation pipeline transforms a user's natural language prompt into a complete, playable game. It relies on a linear graph architecture using `LangGraph` and various AI agents.

**Source**: `backend/llm/graph/workflow.ts`

## Workflow Steps

The process follows a strictly linear sequence. The `GraphState` object is passed through each node, accumulating data.

| Step  | Node Name                 | Input                           | Output            | Description                                                            |
| :---- | :------------------------ | :------------------------------ | :---------------- | :--------------------------------------------------------------------- |
| **1** | `nodeSceneGenerator`      | User Prompt                     | `sceneImage`      | Generates the conceptual visual scene of the game.                     |
| **2** | `nodeBackgroundExtractor` | `sceneImage`                    | `backgroundImage` | Removes dynamic elements to create a clean background plate.           |
| **3** | `nodeSpriteIsolator`      | `sceneImage`                    | `spriteImage`     | Segments foreground entities (characters, items) from the background.  |
| **4** | `nodeVisionAnalyzer`      | `spriteImage`                   | `analysisJson`    | Uses Vision AI to identify potential entities, their names, and roles. |
| **5** | `nodeAssetExtractor`      | `spriteImage`<br>`analysisJson` | `extractedAssets` | Crops and saves individual entity images (PNGs) to disk.               |
| **6** | `nodeNavMeshGenerator`    | `backgroundImage`               | `navMesh`         | Analyzes walkable areas and generates a navigation grid (zones/tiles). |
| **7** | `nodeStateGenerator`      | `analysisJson`<br>`navMesh`     | `finalGameState`  | Synthesizes all data into the final JSON game state structure.         |

## State Preservation

The workflow uses a `GraphState` object to maintain context across nodes.

```typescript
interface GraphState {
    userInput: string;
    runId?: string;
    
    // Artifacts
    sceneImage?: Buffer;
    backgroundImage?: Buffer;
    spriteImage?: Buffer;
    analysisJson?: any[];
    extractedAssets?: string[]; // Paths
    navMesh?: any[];
    finalGameState?: any;
}
```

### Artifact Storage
In addition to memory, artifacts are persisted to the filesystem for debugging and frontend retrieval:
*   **Location**: `backend/data/runs/{runId}/`
*   **Files**:
    *   `scene.png`
    *   `background.png`
    *   `sprites.png`
    *   `analysis.json`
    *   `navmesh.json`
    *   `gamestate.json`
    *   `extracted/*.png`

## Input & Output

*   **Input**: A single string (User Prompt).
*   **Output**: A fully populated `GraphState` object containing the `finalGameState` JSON and references to generated asset files.
