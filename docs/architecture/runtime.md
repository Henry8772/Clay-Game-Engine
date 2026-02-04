# Runtime Engine Architecture

The runtime engine handles the actual gameplay, including state synchronization, rule enforcement, and AI opponent behavior. It follows a **Server-Authoritative** model where the frontend is a dumb terminal that visualizes state and sends requests.

## 1. Frontend Loading & Visualization

**File**: `app/play/page.tsx`

The frontend bootstraps the game by fetching data from two sources:
1.  **Convex DB**: Primary source for the live `games` table (dynamic state, rules).
2.  **Asset Proxy**: Fallback/Static source for `navmesh.json` and images (served from `backend/data/runs/...`).

### Rendering Process
The state is transformed into a `SceneManifest` passed to the `<SmartScene />` component:
*   **Ambience Layer**: Background image (`background.png`).
*   **Zones Layer**: Debug overlays for the NavMesh tiles.
*   **Actor Layer**: Sprites (`entities`) positioned based on their geometric `pixel_box` or snapped logical location.

## 2. The Game Loop

Everything runs through the Backend Game Engine via **Server Actions**.

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant Action as Server Action
    participant Engine as GameEngine (Game Logic)
    participant Database as Convex

    User->>Frontend: Drag Unit / Type Command
    Frontend->>Action: POST processGameMoveAction(command)
    Action->>Engine: resolveGameAction(command, state, rules)
    Engine->>Engine: Validate & Patch State
    Engine-->>Action: Result (NewState / Error)
    
    alt is Valid Move
        Action->>Database: Mutation (Update State)
        Database-->>Frontend: React Query Update (Re-render)
        
        Note over Action, Database: Enemy AI Turn
        Action->>Engine: AI Logic (Calculate Move)
        Engine->>Engine: Execute AI Move
        Action->>Database: Mutation (Update AI Move)
    end
```

## 3. Interaction Flow

### User Actions
User inputs (drags or text) are converted into a standardized **Natural Language Command** by the frontend hook `useGameEngine`.
*   *Drag Event* -> "Move archer (id: 1) to tile_r2_c2"
*   *Text Input* -> "Attack the goblin with the wizard"

### Game Logic Agent
**File**: `backend/llm/agents/game_logic.ts`

The Engine uses a tool-calling approach. Instead of guessing state updates, it selects specific tools to execute.

1.  **Robust Entity Mapping**: Raw state is simplified to focus on mechanics (Blueprints, Team, Stats).
2.  **Logic Processing**: The LLM chooses valid "Tools" (Move, Attack, Spawn) based on the Rules.
3.  **Execution**: The selected tools are executed to modify the state safely.

### Enemy AI
**File**: `backend/llm/agents/enemy_ai.ts`

This is triggered strictly after a valid user move.
1.  **Input**: The *new* game state (after user move).
2.  **Logic**: An LLM agent analyzes the board strategy.
3.  **Output**: A Natural Language Command (e.g., "Move skeleton to tile_r3_c3").
4.  **Execution**: This command is fed back into the Game Logic Agent to ensure it follows the same rules as the player.
