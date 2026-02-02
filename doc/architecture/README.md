# Game Engine Architecture Overview

This directory documents the high-level architecture of the "Game as Image" engine. The system is designed to generate 2D pixel-art games from natural language prompts and run them in a server-authoritative hybrid engine.

## Core Components

The architecture consists of three main pillars:

1.  **Generation Pipeline (Backend Graph)**
    *   **Goal**: Turn a user prompt into a playable game state + assets.
    *   **Tech**: LangGraph, Node.js, Image Generation Models.
    *   [Read more](./generation_workflow.md)

2.  **Runtime Engine (Frontend & Backend)**
    *   **Goal**: Play the game with rule enforcement and AI opponents.
    *   **Tech**: Next.js (React), Convex (DB), Node.js (Referee Agent).
    *   [Read more](./runtime_engine.md)

3.  **Data Persistence (Convex & Files)**
    *   **Goal**: Store game states, history, and large asset files.
    *   **Tech**: Convex (State/Meta), FileSystem (Assets/Runs).
    *   [Read more](./data_persistence.md)

## High-Level Data Flow

```mermaid
graph TD
    User[User Prompt] -->|Input| Generator[Generation Pipeline]
    Generator -->|Artifacts| Assets[Files (Images/JSON)]
    Generator -->|Game State| Convex[Convex DB]
    
    Convex -->|Load| Client[Frontend Client]
    Assets -->|Load| Client
    
    Client -->|Action| ServerAction[Backend Server Action]
    ServerAction -->|Process| Referee[Game Referee Agent]
    ServerAction -->|Update| Convex
```
