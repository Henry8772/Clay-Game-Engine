### Core Concept: The "Smart Client" Strategy

To achieve zero-latency interactions (dragging, targeting) in a game where the rules are generated dynamically, we must shift from a "dumb terminal" model to a **Smart Client** model.

Instead of the frontend asking the server "Can I do this?" for every mouse movement, the Generation Pipeline will provide the frontend with a "Physics & Capabilities" manifest. This allows the browser to mathematically validate moves and targets instantly, only sending the final decision to the server for security verification.

------

### Step 1: Update the Generation Pipeline (The "Rulebook")

We need to change what the AI Generator produces. Currently, it likely produces a list of entities and text rules. It must now produce structured **Metadata Definitions** for every unit class (e.g., Archer, Warrior, Chess Pawn).

The Generator must output three distinct categories of logic for each unit type:

1. **Identity:** Name, description, and visual assets.
2. **Movement Logic:** How it moves (e.g., grid-walking, flying, teleporting), its maximum range (e.g., 3 tiles), and what terrain blocks it (e.g., walls, water).
3. **Action Capabilities:** A list of skills (e.g., "Attack", "Heal"). Each skill must define its targeting requirements:
   - **Target Type:** Does it need a specific tile, an enemy entity, an ally entity, or no target at all?
   - **Range:** How far away can the target be?
   - **Area of Effect:** Does it hit one tile or a cluster?

### Step 2: Implement "Take and Place" (Immediate Movement)

This handles the user picking up a unit and seeing where they can drop it. This bypasses the slow backend LLM entirely during the drag operation.

1. **The "Take" Action:** When the user clicks and holds a unit, the frontend looks up that unit's **Movement Logic** from the definitions created in Step 1.
2. **Client-Side Pathfinding:** The frontend immediately runs a fast calculation (like a flood-fill algorithm) using the unit's range and the local Navigation Mesh (NavMesh). It calculates every reachable tile that isn't blocked by a wall or obstacle.
3. **Visual Feedback:** The reachable tiles are highlighted (e.g., glowing green). If the user drags the mouse over an invalid tile, the cursor changes to indicate it is blocked.
4. **The "Drop" Action:**
   - **Valid Drop:** If the user releases the mouse on a green tile, the unit snaps to the grid. The frontend creates a "Move Command" and sends it to the server.
   - **Invalid Drop:** If the user releases on an invalid area, the unit visually springs back to its original starting position.

### Step 3: Implement Universal Skill Targeting

This allows the UI to handle complex spells or attacks without hard-coding specific game logic.

1. **Context Menus:** When a unit is selected, the UI renders buttons based on the **Action Capabilities** list defined in Step 1.
2. **Targeting Mode:** If the user clicks an action that requires a target (e.g., "Fireball"), the interface enters a "Targeting State."
3. **Filtering:** The frontend uses the action's metadata (Range, Target Type) to filter the board. It grays out everything invalid.
   - *Example:* If the skill is "Heal Ally," all enemies and empty tiles become unclickable. Only friendly units within range remain active.
4. **Execution:** Once a valid target is clicked, the frontend constructs a natural language sentence (e.g., "Cleric casts Heal on Paladin") and sends it to the server.

### Step 4: The Dual-Loop Verification (Security)

We maintain server authority to prevent cheating and handle complex edge cases that the client might miss.

1. **Optimistic UI (Fast Loop):** The frontend assumes the move is valid based on the logic in Step 2 and 3. It updates the screen immediately so the game feels responsive.
2. **Server Validation (Slow Loop):** The "Move Command" arrives at the backend. The AI Referee (LLM) validates the move against the full game state.
   - *Success:* The server saves the new state. The client silently syncs.
   - *Rejection:* If the move was actually illegal (e.g., the unit was "frozen" by a status effect the client logic missed), the server sends an error. The client performs a "rollback," snapping the unit back to its previous position.