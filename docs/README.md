# Gemini AI Engine Documentation

Welcome to the documentation for the Gemini AI Engine, a system designed to generate and run 2D pixel-art games from natural language prompts.

## 🚀 Getting Started
*   [**Installation & Setup**](./getting-started.md): How to run the engine locally.

## 🏗️ Architecture
High-level design and component overview.

*   [**Overview**](./architecture/overview.md): The big picture (Generation + Runtime + Persistence).
*   [**Runtime Engine**](./architecture/runtime.md): How the game loop, referee, and AI work.
*   [**Data Persistence**](./architecture/persistence.md): Database schema (Convex) and file storage.

## 🔄 Workflows
Deep-dives into specific functional processes.

*   [**Generation Workflow**](./workflows/generation.md): From user prompt to assets & code.
*   [**Interaction Workflow**](./workflows/interaction.md): How player commands are processed.
*   [**Modification Workflow**](./workflows/modification.md): How the engine modifies the game on the fly.
