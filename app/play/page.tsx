"use client";

import React, { useState } from "react";
import { Game } from "../generated/game-slot";
import { generateGameAction } from "../actions/generate";

export default function PlayPage() {
    const [prompt, setPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async () => {
        if (!prompt) return;
        setIsGenerating(true);
        try {
            const result = await generateGameAction(prompt);
            if (result.success) {
                console.log("Game generated successfully!");
                // Force a re-render or notification if needed,
                // but Next.js HMR should handle the component update automatically.
            } else {
                console.error("Failed to generate game");
            }
        } catch (e) {
            console.error("Error generating game:", e);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex flex-col items-center min-h-screen p-8 gap-8">
            <h1 className="text-3xl font-bold">AI Game Generator</h1>

            <div className="w-full max-w-2xl flex gap-4">
                <input
                    type="text"
                    className="flex-1 p-2 border border-gray-300 rounded text-black"
                    placeholder="Describe your game (e.g., 'A snake game with neon colors')"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={isGenerating}
                />
                <button
                    className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                >
                    {isGenerating ? "Generating..." : "Generate"}
                </button>
                <button
                    className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                    onClick={async () => {
                        const { loadTestGameAction } = await import("../actions/load-test");
                        const res = await loadTestGameAction();
                        if (res.success) {
                            console.log("Loaded test game!");
                        } else {
                            alert("Failed to load test game: " + res.error);
                        }
                    }}
                    disabled={isGenerating}
                >
                    Load Test Run
                </button>
                <button
                    className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                    onClick={async () => {
                        const { resetGameAction } = await import("../actions/reset");
                        await resetGameAction();
                        window.location.reload(); // Force reload to clear error boundary if crashed
                    }}
                    disabled={isGenerating}
                >
                    Reset
                </button>
            </div>

            <div className="w-full max-w-4xl border border-gray-200 rounded-xl p-4 min-h-[500px] shadow-sm bg-white text-black">
                <div className="h-full w-full relative">
                    <Game />
                </div>
            </div>
        </div>
    );
}
