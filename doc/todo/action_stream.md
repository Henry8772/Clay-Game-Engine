### Core Concept: "The Director and The Actor"

- **The Backend (Director):** Calculates the entire enemy turn instantly in milliseconds. It saves the *Final State* (where everyone ended up) and produces a *Script* (a list of what happened to get there).
- **The Frontend (Actor):** Receives the Script. It pauses the game logic and "plays a movie" of the events one by one. When the movie finishes, it unlocks the controls.

------

### Step 1: Define the "Action Protocol" (The Script)

You need a standardized JSON structure that describes *visual* events, not just data changes. This sits in your database alongside the Game State.

We define a sequential array called `lastTurnLogs`. Each item is an **Atomic Event**:

1. **Movement Event:** Contains the `UnitID` and the specific **Path Array** (list of tiles) the unit walked. This is crucial—the client shouldn't re-calculate the path; it should just follow the "breadcrumbs" the server sent.
2. **Skill Event:** Contains `SourceID`, `TargetID`, `SkillName` (e.g., "Fireball"), and `VisualMeta` (e.g., "Explosion_Color: Red").
3. **Result Event:** Contains `TargetID`, `Type` ("Damage", "Heal", "Death"), and `Value` ("-10").

### Step 2: The Backend "Recorder" (The Director)

Currently, your Game Engine likely updates variables directly (e.g., `goblin.hp -= 10`). You must wrap these updates in a **Recorder System**.

1. **Start Recording:** When the Enemy AI begins its turn, initialize an empty list: `current_turn_events = []`.
2. **Intercept Logic:**
   - **Move:** When the AI decides to move, run the pathfinding. *Before* updating the coordinate, push a `MOVE` event with the full path to the list.
   - **Attack:** When the AI calculates damage, update the HP *and* push an `ATTACK` event followed by a `DAMAGE` event to the list.
3. **Commit:** At the end of the AI's logic, save the `New Game State` AND the `current_turn_events` to the database in a single transaction.

**Key Insight:** The backend calculation happens "instantly." The delay/pacing happens entirely on the client.

### Step 3: The Frontend "Cinema Mode" (The Actor)

The Frontend needs a new mode. It is no longer just "rendering the state." It is a **State Machine**.

1. **The "Live" State:** By default, the frontend renders the authoritative state from the database.
2. **The "New Data" Trigger:** When Convex sends an update, the frontend checks: *"Is the Turn Counter higher than before?"*
3. **Enter "Cinema Mode" (Lock Input):**
   - The frontend **hides** the real unit positions for a moment (or keeps them at their *old* positions).
   - It creates a **Queue** from the `lastTurnLogs`.
4. **Process Queue (The Loop):**
   - **Pop Event 1 (Move):** The frontend takes the "Ghost" unit and animates it sliding along the path array. It waits for the animation (e.g., 500ms) to finish.
   - **Pop Event 2 (Attack):** It triggers the attack animation on the sprite. It waits for the impact frame.
   - **Pop Event 3 (Damage):** It spawns a floating text number "-10" over the target.
5. **Exit Cinema Mode:** When the queue is empty, the frontend does a final **State Sync**. It snaps all units to their true positions from the database (just in case the animation drifted) and unlocks the UI for the player's turn.

### Step 4: Visualizing the "Thinking" Phase

To make it feel like the AI is "streaming" (thinking), rather than just dumping the whole turn at once, you have two options:

**Option A: The "Fake" Stream (Easiest & Robust)**

- The Backend calculates the *entire* turn at once.
- The Frontend receives the full list.
- The Frontend simply inserts a `WAIT` event (e.g., 1 second) between distinct actions in the queue. This creates the *illusion* that the AI is pausing to think between moving and shooting.

**Option B: The "Real" Stream (Complex)**

- The Backend AI calculates *Action 1*, saves to DB.
- Client plays *Action 1*.
- Backend AI calculates *Action 2*, saves to DB.
- Client plays *Action 2*.
- *Warning:* This introduces massive database thrashing and network latency overhead. **Stick to Option A (The Fake Stream)** for the MVP. It feels identical to the user but is much more stable.

### Summary of Data Flow

1. **AI (Server):** "I choose to move Goblin to (3,3) and attack Hero."
2. **Recorder (Server):**
   - `Log: [ {MOVE: Goblin, Path: [(1,1)...(3,3)]}, {ATTACK: Goblin->Hero}, {DAMAGE: Hero, -10} ]`
   - `State: Goblin is at (3,3), Hero has 90 HP.`
3. **Database:** Updates `Game` table.
4. **Client:** Detects update. Locks UI.
5. **Client Queue:**
   - Slide Goblin sprite along path... (Done)
   - Play Slash Animation... (Done)
   - Show "-10" text... (Done)
6. **Client:** Unlocks UI. "Your Turn."