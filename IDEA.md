# Gemini 3 Hackathon: AI Game Engine

This project represents the first implementation of a game engine driven entirely by a Gemini. Unlike traditional engines that rely on hard-coded scripts, this framework utilizes natural language as the primary source of game logic and rules. The system supports a high-fidelity frontend, where the environment and mechanics are generated and governed by the AI engine.

The system architecture is divided into two primary functional phases: **Generation** and **Interaction**.

------

## 1. Generation Phase

The generation phase covers the initial creation and setup of the game environment. The objective is to translate abstract natural language concepts into a structured, playable format.

### Workflow Components:



- **Planner** (Step 01)
  - **Function:** Receives natural language game rules and establishes functional requirements. It outputs a list of necessary assets (e.g., "We need a mage card, a wooden table, and a coin") to guide the generation downstream, ensuring the visual AI knows exactly what to look for.
- **Architect** (Step 02A)
  - **Function:** Parallelly outputs the initial **Game State** (JSON), defining the logic and stats for the assets (e.g., `{ "id": "card_mage", "attack": 5 }`) that will soon be visually extracted.
- **Game Designer** (Step 02B)
  - **Function:**
    -  Generates a high-fidelity "Target Scene" (a single, cohesive image containing all elements). This serves as the visual reference for the decomposition process.
- **Assert Generator** (Step 02B-1)
  - **Function:**
    -  Take the `Game Designer` generated scene image as refernce, to genereate a image for the asset.
-  **Game Frontend Genertor** (Step 03)
  - **Function:**
    -  Take the state from architect and entity list from Architect, ensure each state can be plug into the frontend typescript code, as each entity is linked by asset, the frontend should be able to render the asset based on the state.
-  


------

## 2. Interaction Phase

The interaction phase manages the runtime execution of the game. It handles the communication between the player, the game state, and the AI engine.

### Operational Loop:

- **Game Renderer:** Processes the game state and wireframes to display the interaction layer, typically built using React.
- **State Management (Convex):** A centralized backend (using Convex) manages the synchronization between the user interface and the game engine.
- **Inference Engine:** The engine evaluates user actions against the established natural language rules to determine the resulting state.
- **AI Player:** Because the rules are stored as natural language, an AI agent can interpret and interact with the game using the same logic as a human player.

------

## 4. Future Roadmap: Real-Time Adaptive UI

The next stage of development focuses on the implementation of **Adaptive Game UI**.

In current iterations, the UI remains relatively static once generated. The future objective is to enable the Game Engine to request and generate entirely new UI components in real-time. This will allow the frontend to transform dynamically based on game events—for example, shifting the entire control scheme or visual theme instantly as the narrative or mechanical requirements of the game evolve.