# Clay Game Engine

> **The first game engine driven entirely by Gemini.**
>
> *🏆 Built for the Gemini 3 Hackathon | Made with ❤️*

This project is a **Native Multimodal Engine**. Unlike tools that just generate code, we use **Gemini 2.5 Flash** as the runtime server. The engine manages state, rules, and assets purely through language, enabling **real-time "God Mode"** modifications in multiplayer environments.


## What is this project?
Game development is traditionally rigid: hard-coded physics, static assets, and compiled binaries. If you want to change the rules, you have to rewrite the code.

We built a "Liquid" Game Engine. By treating the entire game state—from the sprite sheet to the rulebook—as a multimodal context window, we allow users to generate, play, and rewrite games using natural language. It’s not just "Text-to-Game"; it’s a living, breathing engine where the AI is the CPU.

For a deep dive into the architecture and workflows, please visit our [Technical Documentation](docs/README.md).

## Gallery
TODO: add game galleries to show game we created.

Check out our [Demo Showcase](docs/demo.md) to see the engine in action:
*   **[Demo 1: The Tactical Boardgame](docs/demo.md#demo-1-the-tactical-boardgame-standard-generation)** - A complete generated RPG.
*   **[Demo 2: The Impossible Puzzle](docs/demo.md#demo-2-the-impossible-puzzle-environment-awareness)** - Real-time "God Mode" modification.

---

## Difference

We are moving beyond "Text-to-Code." We are doing "Text-to-State."

| **Feature**        | **Traditional Engine** | **AI Code Generators**     | **Gemini Game Engine**      |
| ------------------ | ---------------------- | -------------------------- | --------------------------- |
| **Core Logic**     | Hard-coded (C++/C#)    | AI writes code (Python/JS) | **Linguistic (Prompts)**    |
| **State Source**   | Binary Memory          | Local Variables            | **Chat History (JSON)**     |
| **Asset Pipeline** | Manual Import          | Inconsistent Generation    | **Scene-First Consistency** |
| **Multiplayer**    | Complex Networking     | Usually Single Player      | **Native (Chat Protocol)**  |
| **Modifiability**  | Recompile & Restart    | Regenerate & Restart       | **Hot-Swap in Real-Time**   |

## Key Innovations

- **The "Sandwich" Architecture:** We separate **Intent** from **Execution**. User inputs (like dragging) are abstract intents, while the visuals are purely cosmetic.
- **True "God Mode":** Players can rewrite rules or visuals mid-game (e.g., *"Make the floor lava"*) with zero recompiling. The engine hot-swaps assets and JSON rules in real-time.
- **No Hallucinations (Scene-First):** We generate the **entire scene as one image** first, then deconstruct it into assets. This guarantees perfect scale and style consistency.
- **Zero Hard-Coded Logic:** Physics and combat are just text strings processed by the LLM. If you write *"Knights can jump walls,"* it becomes a mechanic instantly.


------

## How it works

### 1. Generation: The "Instant Studio"

*How a text prompt becomes a playable game.*

When you type a prompt like *"A tactical chess game in a volcano,"* the system doesn't just look up a template. It spins up a team of specialized AI agents that work like a movie studio pipeline.

#### The Pipeline

1. **The Concept Artist (Scene Agent):**

   First, the AI imagines the entire game screen. It generates a single, high-fidelity image of the board, the characters, and the UI, exactly as they should look during gameplay.

   ![alt text](assets/images/scene.png)

2. **The Set Designer (Background Agent):**

   The system looks at that image and surgically removes all the characters and items, leaving behind a clean, empty background (the "stage").
   ![alt text](assets/images/background.png)

3. **The Casting Director (Sprite & Extraction Agents):**

   Simultaneously, it isolates every character and item from the original image. It cuts them out, makes their backgrounds transparent, and prepares them as digital "stickers" (sprites) to be moved around.
   |                   White BG                   |                   Black BG                   |              Transparent               |
   | :------------------------------------------: | :------------------------------------------: | :------------------------------------: |
   | ![alt text](assets/images/sprites_white.png) | ![alt text](assets/images/sprites_black.png) | ![alt text](assets/images/sprites.png) |

4. **The Vision Segmentation (Vision & Segmentation Agent):**

    After sprites are prepared, the Vision Agent scans the sprite sheet to identify and segment each unique game object. It draws bounding boxes around every card, unit, and item, assigning them precise 2D coordinates and labels (e.g., "skeleton_card", "orc_miniature"). This map tells the engine exactly where every interactive element lives within the image file.

    ![alt text](assets/images/sprites_segmented.png)

5. **The Cartographer (NavMesh Agent):**

   The AI looks at the background and figures out where characters can walk. It draws an invisible grid over the floor, identifying obstacles (like lava or rocks) automatically.

    ![alt text](assets/images/navmesh.png)

6. **The Architect (State Agent):**

   Finally, the AI compiles everything into a "Game State." It assigns health points, teams (Red vs. Blue), and names to the characters it just found, linking the visual stickers to actual game rules.

------

### 2. User Interaction: The "AI Referee"

*How the game is played.*

In traditional games, clicking a unit triggers a hard-coded script. In this engine, the AI watches your moves and interprets them like a Dungeon Master in a tabletop RPG.

#### The Gameplay Loop

1. **The Intent:**

   When you drag a "Knight" to a tile, the frontend sends a message: *"User wants to move Entity_A to Tile_B."*

2. **The Logic Check (Game Logic Agent):**

   The AI receives this message along with the current Rulebook. It asks:

   - *Is this a valid move according to the rules?*
   - *Is the path blocked?*
   - *Is it this player's turn?*

3. **The Execution (Tools):**

   If the move is valid, the AI selects a "Tool" (a specific engine command) to execute it, such as `MOVE_ENTITY` or `ATTACK`.

4. **The Update:**

   The game state is updated instantly in the database (Convex), and the screen updates for all players.

> **Why this matters:** Because the logic is linguistic, not hard-coded, you can have infinite rule variations without rewriting the engine code.

------

### 3. Modification: "God Mode"

*Changing the game while playing it.*

This is the engine's most powerful feature. Because the game exists as data and images controlled by AI, you can rewrite reality on the fly.

#### How it Works

1. **The Request:**

   You type a command into the chat, e.g., *"Turn the floor into ice and give everyone slip mechanics."*

2. **The Director (Modification Agent):**

   The AI analyzes your request and decides what needs to change. It can do two things:

   - **Visual Patching:** It might generate a new background image (Ice) or repaint specific characters.
   - **Rule Patching:** It updates the JSON "Rulebook" to include new mechanics (e.g., "Movement range increased on ice").

3. **Hot-Swapping:**

   The engine swaps the assets and rules in real-time. The game doesn't restart; the ground beneath the characters simply transforms, and the new rules apply immediately to the next turn.


---

## Setup & Installation

### 1. Install Dependencies
Install dependencies for both the frontend (root) and the backend.

**Root (Frontend & Convex):**
```bash
npm install
npx convex dev #press enter for default
```

## Running the Application
```bash

npm run dev:all
```

