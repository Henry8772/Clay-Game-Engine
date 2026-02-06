# Getting Started

## Prerequisites
*   Node.js 18+
*   NPM or PNPM
*   Google Cloud Project (for Vertex AI / Gemini API)

## Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/google-gemini/gemini-ai-engine.git
    cd gemini-ai-engine
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Copy `.env.example` to `.env.local` and fill in your API keys.
    ```bash
    cp .env.example .env.local
    ```

## Running the Engine

1.  **Start the Convex Database**
    ```bash
    npx convex dev
    ```

2.  **Start the Development Server**
    ```bash
    npm run dev
    ```

3.  Open [http://localhost:3000](http://localhost:3000) in your browser.
