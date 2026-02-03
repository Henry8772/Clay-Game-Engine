# Gemini AI Game Engine

> **The first game engine driven entirely by Gemini.**

This project represents a paradigm shift in game development. Unlike traditional engines that rely on hard-coded scripts and static assets, this framework uses **natural language as the primary source of truth**. The engine, powered by Gemini 1.5 Pro/Flash, generates the environment, assets, and game rules on the fly, and even acts as the game server by interpreting player actions and strictly enforcing rules.

## ✨ Key Features

### 1. Generative World Building
Turn a simple text prompt into a fully playable game scene.
-   **Planner Agent**: Deconstructs your high-level request (e.g., "A spooky dungeon with a dragon") into a functional design document.
-   **Architect Agent**: Converts the design into a massive JSON state object, defining entities, stats, and relationships.
-   **Asset Swarm**: A parallelized fleet of agents that generate visual assets (sprites, backgrounds) and functional data (NavMeshes) for every entity in the scene.

### 2. LLM as Game Server (API Client Pattern)
The game logic is not hard-coded in C++ or C#. It is **inferred** by the LLM.
-   The "Game Logic Agent" receives the current state and the user's action.
-   It decides **validity** based on the generated rules.
-   It executes the move by calling strictly defined **Game Tools** (functions like `moveEntity`, `applyDamage`, `spawnItem`).
-   This allows for infinite gameplay possibilities that are still constrained by rigorous code execution.

### 3. "God Mode" (Real-Time Modification)
Change the game while playing it.
-   Type a command like "Make the background lava and give everyone fire resistance."
-   The **modification_agent** analyzes the request, updates the visual assets in real-time, and patches the JSON game state to reflect the new mechanics.
-   State synchronization is handled instantly via **Convex**.

### 4. Smart Assets
-   **Automated NavMesh**: Valid walkability masks are generated automatically from the background image.
-   **Sprite Extraction**: Characters and items are segmented from generated scenes and processed for transparency and consistency.

---

## 🏗 Architecture

The system operates in two main phases: **Generation** and **Run**.

### Generation Phase (The "Compiler")
1.  **User Input**: "I want a sci-fi chess game."
2.  `SceneAgent` orchestrates the workflow.
3.  `VisionAgent` & `SpriteAgent` generate the visuals.
4.  `NavigationAgent` computes pathfinding meshes.
5.  Output: A comprehensive `gamestate.json` stored in the backend.

### Run Phase (The "Runtime")
1.  **Frontend**: A Next.js 15 application utilizing React for the game loop.
2.  **State Sync**: [Convex](https://www.convex.dev/) acts as the realtime database, pushing state changes to the client (60fps feel).
3.  **Game Loop**:
    -   User clicks -> Action sent to Convex.
    -   Convex enqueues action for the `GameLogic` agent.
    -   LLM processes action -> updates Convex state -> Client updates.

---

## Setup & Installation

### 1. Install Dependencies
Install dependencies for both the frontend (root) and the backend.

**Root (Frontend & Convex):**
```bash
npm install
```

**Backend (LLM Engine):**
```bash
cd backend
npm install
```

## Running the Application
```bash

npm run dev:all
```

### Generation Workflow 
To run the detailed generation workflow using Vitest (Real Mode):
```bash
cd backend
npm run test
```

run test/real/test_workflow_real test in Vitet UI

Open url at `http://localhost:3000/play`, click `Load Test Run`


