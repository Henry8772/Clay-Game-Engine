# Modification Workflow ("God Mode")

This document explains the **Modification Agent**, which allows users to alter the game's assets, rules, and state in real-time using natural language (e.g., "Turn the floor into lava").

**Source**: `backend/llm/agents/modification_agent.ts`

## Overview

The Modification Agent bypasses the standard game rules. It interprets the user's intent and selects from a suite of powerful tools to reshape the game reality.

## Workflow

1.  **User Request**: "Spawn 3 Orcs near the center."
2.  **Tool Selection**: The LLM analyzes the request and selects a tool from `modification_tools.ts`.
3.  **Execution**: The engine executes the logic (often involving image generation/editing) and updates the state.

## Available Tools

The agent has access to the following capabilities:

### 1. `generate_background`
Replaces the entire game background while attempting to maintain perspective.
*   **Strategy**: Uses `client.editImage()` if a background exists (to preserve layout), or `client.generateImage()` for a fresh start.
*   **Update**: Updates `state.meta.vars.background`.

### 2. `spawn_entity`
Creates new entities and adds them to the game.
*   **Args**: `count`, `name`, `description`, `team`.
*   **Strategy**:
    *   Checks for a master sprite sheet (`sprites.png`) to use as a style reference.
    *   Uses `client.editImage()` to generate a new variation matching that style.
    *   Create a new entity entry in `state.entities` with default stats.

### 3. `update_visual_style`
Redraws specific existing entities.
*   **Args**: `targetName` (e.g., "goblin"), `newStyleDescription` (e.g., "cyberpunk robot").
*   **Strategy**:
    *   Locates the source image of the target entity.
    *   Uses `client.editImage()` to redraw it while maintaining pose and size.
    *   Updates the `src` property of all matching entities.

### 4. `trigger_regeneration`
If the request is too fundamental (e.g., "Change the game from Chess to Checkers"), the agent can trigger a full game regeneration.
*   **Action**: restart the generation workflow with a `newPrompt`.

## State Synchronization

Changes made by this agent are immediately pushed to **Convex**. The frontend, subscribed to the game state, reflects these visual changes instantly without a page reload.
