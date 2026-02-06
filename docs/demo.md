# Engine Demos

This document outlines the two primary demo scenarios designed to showcase the full range of the Gemini AI Game Engine.

While **Demo 1** focuses on the "Happy Path" of generating a standard playable game, **Demo 2** is designed to demonstrate the engine's deep semantic understanding and real-time modification capabilities ("God Mode").

---

## Demo 1: The Tactical Boardgame (Standard Generation)

**Objective:** Demonstrate the end-to-end flow of "Text-to-Game." This demo proves that the system can hallucinate a coherent visual style, understand game rules, and generate a functional turn-based strategy game from scratch.



### The Prompt
> "Create a tactical battle between a team of holy knights and a swarm of skeletons in a dark dungeon. The knights have high defense, and the skeletons are weak but numerous."

![Generated Board Game](../assets/gallery/demo1-boardgame.png)
*Figure 1: The generated tactical RPG based on the user's prompt.*

### Highlights
1.  **Visual Cohesion:** The engine generates a single scene first, ensuring the Knights and Skeletons match the Dungeon environment perfectly in lighting and pixel scale.
2.  **Logic Generation:** The `Game Logic Agent` interprets "high defense" by assigning higher HP/Armor stats in the generated `gamestate.json`.
3.  **AI Opponent:** The player takes their turn, and the `Enemy AI` (Gemini) analyzes the board state to flank the player.

### Why this matters
It establishes the baseline competence of the engine: it creates functional, fun games in under 60 seconds.

---

## Demo 2: The "Impossible" Puzzle (Environment Awareness)

**Objective:** Demonstrate the **"Game as Image"** architecture. This demo highlights that the engine does not just use images as decoration—it maps the *semantics* of the background image directly to the game physics (NavMesh).



> **Principle:** "Give people wonderful tools, and they'll do wonderful things."



### The Setup
We generate a game that is **mathematically impossible to win** in its initial state.
* **Goal:** The player must reach a Treasure Chest.
* **Obstacle:** The chest is surrounded by a river of Lava.
* **Mechanic:** The `NavMesh Agent` detects the red/orange texture as "Lava" and marks those tiles as `Death Zones` or `Unwalkable`.

![Impossible Puzzle State](../assets/gallery/demo2-puzzle-before-mod.png)
*Figure 2: The initial state. The lava (red pixels) is automatically tagged as unwalkable, making the chest unreachable.*

### The "God Mode" Solution
The user cannot play their way to victory using standard moves. They must use the **Live Modification Agent** to rewrite the reality of the game world.

#### Step 1: The Command
The user opens the chat and types:
> *"The lava is too hot. Freeze the river so I can walk across."*

#### Step 2: The Modification Loop
1.  **Visual Synthesis:** The `modification_agent` uses the "Nano Banana" model (via `client.editImage`) to repaint the lava pixels into Ice pixels, maintaining the exact perspective of the room.
2.  **Semantic Remapping:** The engine triggers a hot-reload of the `navmesh_agent`.
3.  **Physics Update:** The agent analyzes the new "Ice" pixels. It recognizes them as solid ground (or slippery ground) rather than a hazard.
4.  **State Patching:** The `NavMesh` is updated in Convex. The "Death Zone" tags are removed, and the tiles become `Walkable`.

![Modified Puzzle State](../assets/gallery/demp2-puzzle-after-mod.png)
*Figure 3: The modified state. The user has frozen the river, and the engine has updated the NavMesh to allow movement across the ice.*



#### Step 3: The Win
The player can now move their character across the frozen river to collect the chest.

### Why this matters
* **Environment-Awareness:** The engine understands that *changing the image changes the rules*.
* **Deep Integration:** We aren't just swapping a PNG; we are cascading that visual change down through the logic layer, the pathfinding algorithm, and the rulebook instantly.