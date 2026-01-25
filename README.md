# Gemini 3 Hackathon: AI Game Engine

This project represents the first implementation of a game engine driven entirely by a Gemini. Unlike traditional engines that rely on hard-coded scripts, this framework utilizes natural language as the primary source of game logic and rules. The system supports a high-fidelity frontend, where the environment and mechanics are generated and governed by the AI engine.

The system architecture is divided into two primary functional phases: **Generation** and **Interaction**.

------

## 1. Generation Phase

The generation phase covers the initial creation and setup of the game environment. The objective is to translate abstract natural language concepts into a structured, playable format.

### Workflow Components:

- **Planner:** Receives input in the form of game rules (free text) and establishes the functional requirements for the session.
- **UI Designer & Game Engine:** These modules operate in parallel. The UI Designer generates the visual layout, while the Game Engine outputs the initial **Game State** in a structured data format (JSON).
- **Segmenter (Nanobana):** Once a scene is generated, the segmenter identifies and isolates individual assets. This allows the system to treat visual elements as discrete objects rather than static pixels.
- **Individual Segmenting:** Each isolated asset is assigned a unique ID and a text description, ensuring the engine can track and manipulate specific items during gameplay.

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


## Setup & Installation

### 1. Install Dependencies
Install dependencies for both the frontend (root) and the backend.

**Root (Frontend & Convex):**
```bash
npm install
```

**Backend (LLM Engine):**
```bash
cd backend
npm install
```

## Running the Application

### 1. Frontend
Start the Next.js development server:
```bash
npm run dev
```

### 2. Convex (Backend Database)
Start the Convex dev server to sync the database:
```bash
npx convex dev
```

### 3. Generation Workflow (Test)
To run the detailed generation workflow using Vitest (Real Mode):
```bash
cd backend
npm run test test/real/test_workflow_real.ts
```

### 4. Interaction Workflow (Test)
Open url at `http://localhost:3000/play`, click `Load Test Run`


## Test
All test are hosted in Vitest UI for interactive debug.
```bash
cd backend
npm run test # Opens Vitest UI
```