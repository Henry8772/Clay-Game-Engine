# Interaction Workflow

This document explains how the game handles user interactions (`Game Logic`), maintaining game state consistency through state enrichment, logic processing, and re-hydration.

**Source**: `backend/llm/agents/game_logic.ts`

## Overview

The Gemini Game Engine uses a "Game Logic" agent that converts user intents into strict tool calls. Instead of applying JSON patches directly, the LLM outputs a sequence of "Engine Commands" (like `MOVE`, `ATTACK`, `SPAWN`) which are then executed by the system. This ensures that all changes flow through a predictable and verifiable layer.

```mermaid
graph TD
    Client[Client (React)] -->|Action: processGameMove| Server[Server Action]
    Server -->|Command + State + Rules| Logic[Game Logic Agent]
    
    subgraph Logic Agent
        Input[User Intent] --> LLM[Gemini 1.5 Pro]
        LLM -->|Tool Calls| Tools[Engine Tools]
        Tools -->|MOVE/ATTACK| Logic[Game Logic Execution]
    end
    
    Logic -->|New State| Convex[Convex DB]
```

## Detailed Steps

### 1. Robust Entity Mapping
Before sending data to the LLM, the engine prepares a simplified list of entities.
*   **Source**: `backend/llm/agents/game_logic.ts`
*   **Process**: Maps raw state entities to a cleaner format, resolving Blueprints (templates) and exposing critical info like `spawns` (what unit a card creates).

### 2. Logic & Tool Definition
The agent is provided with:
*   **Available Tools**: Definitions for `MOVE`, `ATTACK`, `DESTROY`, `SPAWN`, etc.
*   **Logic Guide**: Natural language instructions (e.g., "If user plays a card, spawn the unit").

### 3. LLM Processing
The LLM (Gemini) decides which tools to call.
*   **Input**: "I play the Orc card on tile_r2_c2."
*   **Output**:
    ```json
    [
      { "name": "DESTROY", "args": { "entityId": "card_orc" } },
      { "name": "SPAWN", "args": { "templateId": "orc_warrior", "toZoneId": "tile_r2_c2" } }
    ]
    ```

## Comparison with Legacy Referee
*   **Legacy (Referee)**: Output JSON Patches directly to state. Harder to validate logic.
*   **New (Game Logic)**: Output Tool Calls. The engine handles the actual state mutation, ensuring rules (like "cannot move into walls") are enforced by the tool code, not just the LLM.

## Enemy AI

The Enemy AI (`enemy_ai.ts`) follows a similar flow but generates a **Command** string instead of patches. This command is then fed back into the Referee to ensure the AI follows the exact same rules as the player.
