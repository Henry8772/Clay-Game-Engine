# Gemini AI Game Engine

> **The first game engine driven entirely by Gemini.**
>
> *🏆 Built for the Gemini 3 Hackathon*

This project represents a paradigm shift in game development. Unlike traditional engines that rely on hard-coded scripts and static assets, this framework uses **natural language as the primary source of truth**. The engine, powered by **Gemini 2.5 Flash & Nanobana Pro**, generates the environment, assets, and game rules on the fly, and acts as a real-time game server by interpreting player actions through a multimodal agentic pipeline.

---

## Highlights: Why This Engine Differs

This project is not just a game generator; it is a **Native Multimodal Engine** that solves the biggest problems in Generative AI gaming: consistency, state management, and real-time modification.

### 1. True "Vibe Coding" for Players (God Mode)

Most "vibe coding" tools are for developers. We brought it to the **end-user**.

- **The Feature:** Players can rewrite game rules or visuals mid-game using natural language (e.g., *"Make the floor lava and give everyone heat resistance"*).
- **The Tech:** We preserve the game state while hot-swapping assets and JSON logic rules in real-time. No recompilation, no restart—just instant reality shifting.

### 2. Solving the "Generative Hallucination" Problem

Generative games often suffer from shifting visuals and inconsistent scales. We solved this with a **"Scene-First" Pipeline**.

- **The Difference:** Instead of generating assets individually (which leads to style, scale and size mismatches), we generate the **entire scene first**.
- **The Execution:** Our specialized agent swarm then deconstructs this single coherent image into a background, a NavMesh, and perfectly scaled sprites. This guarantees that every character fits the world perfectly because they were born from it.

### 3. The "Sandwich" Architecture (Visual-Agnostic Actions)

We built a novel interaction layer that separates **Intent** from **Execution**.

- **Top Layer (Actions):** User inputs (drag, pinch, click) are treated as abstract intents.
- **Middle Layer (Assets):** The visual representation (sprites, cards) is purely cosmetic.
- **Bottom Layer (Logic):** The "Text-as-State" engine processes the intent against the rules.
- **Why it matters:** This makes the engine **content-agnostic**. The AI can swap a "Knight" for a "Spaceship" instantly, and the interaction logic (Drag-to-Move) remains perfectly functional without a single line of code change.

### 4. Game State as a "Chat Protocol"

We reimagined multiplayer networking by treating the game state as a **Multi-User Chat Session**.

- **Innovation:** The entire game state is a JSON object stored in a conversation history.
- **Benefit:** Multiplayer synchronization becomes trivial. Player A sends a "Move" message, the AI Referee validates it, and the state updates for Player B like a new chat message. This allows for infinite scalability and purely AI-managed networking.

### 5. Zero Hard-Coded Logic

Unlike hybrid engines that use AI for assets but C# for logic, our engine is **100% Linguistic**.

- **The Breakthrough:** The physics, combat rules, and movement logic are just text strings processed by Gemini 2.0 Flash.
- **The Impact:** This enables "Infinite Gameplay." You aren't limited to what the developer coded. If you tell the AI *"Knights can jump over walls,"* it becomes a true mechanic instantly, executed by the AI Referee.


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

