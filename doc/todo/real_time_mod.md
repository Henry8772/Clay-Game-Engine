### The "Reconciliation" Architecture

You need to inject a new step into your Generation Pipeline between **Step 6 (NavMesh)** and **Step 7 (State Gen)**.

#### 1. The Trigger (Client Side)

When the user types *"Turn the forest into a lava wasteland"* in the chat:

1. **Pause the Game:** The Frontend stops all ticking.
2. **Snapshot:** You don't just take a screenshot. You capture **two** things:
   - **Visual Context:** The current `scene.png` (or a composite of background + entities).
   - **Logical State:** The current JSON `GameState` (Positions, HP, Items, History).
3. **Payload:** You send `{ userPrompt, visualContext, oldGameState }` to the backend.

#### 2. The Regeneration (Standard Pipeline)

The pipeline runs mostly as normal:

- **Scene Gen:** Creates the new "Lava Wasteland" image.
- **NavMesh Gen:** Analyzes the new image. **Crucially, the walkable areas have changed.** (Old trees are gone, new lava pools exist).

#### 3. The New Component: The "Reconciliation Agent"

This is the "Merger" you asked for. It replaces the standard `nodeStateGenerator` for this specific workflow.

**Inputs:**

1. `Old_State` (Where units *were*, what HP they *had*).
2. `New_NavMesh` (Where units *can* walk now).
3. `New_Visual_Analysis` (What the new world looks like).

**The Logic (Prompt Engineering):** You ask the LLM to perform a **"State Migration"** using a prompt like this:

> "We are migrating a game session. Here is the OLD state (list of units: Archer, Goblin). Here is the NEW map (NavMesh).
>
> **Task:**
>
> 1. **Preserve Entities:** Keep all existing units, their names, HP, and statuses.
> 2. **Remap Positions:** The map has changed. If a unit's old coordinate `(10,10)` is now 'Lava' (Blocked), move them to the nearest safe 'Floor' tile.
> 3. **Contextualize:** If the environment is now 'Hot', maybe apply a 'Sweating' status effect to everyone."

**Output:** A `New_State` JSON that contains the *old* characters validly placed on the *new* map.

------

### Critical Risks & How to Solve Them

This "Snapshot -> Regenerate" workflow has three major points of failure you must handle.

#### 1. The "Wall" Problem (Invalid Coordinates)

- **Scenario:** The player's Knight is at `x:5, y:5`. The user prompts: *"Build a fortress here."* The generator puts a thick stone wall at `x:5, y:5`.
- **Result:** If you just copy coordinates, the Knight is now inside a wall.
- **Solution:** The **Reconciliation Agent** must have access to the `New_NavMesh`. You must force it to output valid coordinates.
  - *Algorithm Fallback:* Even if the Agent says "Put him at 5,5", your code should run a `FindNearestWalkableTile(target)` function before spawning the unit.

#### 2. Visual Artifacts (The Screenshot Trap)

- **Scenario:** You take a screenshot of the *browser* to send to the generator. The screenshot includes HP bars, selection circles, and the "Menu" button.
- **Result:** The Image Generator (Stable Diffusion/DALL-E) sees the HP bar as part of the world. It generates a new scene where the clouds look like HP bars.
- **Solution:** **Don't screenshot the browser.** Since you have the layers (Background, Sprites) separated, compose a **"Clean Frame"** on the backend or frontend (Canvas export) that excludes UI, grids, and cursors. Send *that* to the generator.

#### 3. Entity Duplication (The Ghost Problem)

- **Scenario:** The user says *"Make it winter."* You send the image of the Knight standing there. The generator draws a snowy scene *with the Knight baked into the background image*. Then your engine places the *Sprite* of the Knight on top.
- **Result:** You see two Knights: one static frozen one in the background, and one moving sprite on top.
- **Solution:** You need to send the **Background Only** (without sprites) to the generator if you want to change the environment.
  - *Alternative:* If the user wants to transform the *units* too (e.g., "Turn everyone into zombies"), you send the full scene, generate a full new scene, and then run **Extraction** again to get new sprites. This is much heavier/slower.

### 