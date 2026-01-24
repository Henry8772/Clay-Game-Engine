"use client";

import React, { useState } from "react";
import { Game, INITIAL_STATE, GAME_RULES } from "../generated/game-slot";
import { generateGameAction } from "../actions/generate";
import { processGameMoveAction } from "../actions/game-move";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function PlayPage() {
    const [prompt, setPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);

    // Convex State Management
    const gameStateFromConvex = useQuery(api.games.get);
    const [chatInput, setChatInput] = useState("");
    const [isProcessingMove, setIsProcessingMove] = useState(false);

    // Derived State
    const currentGameState = gameStateFromConvex?.state || INITIAL_STATE;
    const history = gameStateFromConvex?.history || [];

    const handleGenerate = async () => {
        if (!prompt) return;
        setIsGenerating(true);
        try {
            const result = await generateGameAction(prompt);
            if (result.success) {
                console.log("Game generated successfully!");
            } else {
                console.error("Failed to generate game");
            }
        } catch (e) {
            console.error("Error generating game:", e);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleChatSubmit = async () => {
        if (!chatInput.trim() || isProcessingMove) return;

        const input = chatInput;
        setChatInput("");
        setIsProcessingMove(true);

        try {
            // Optimistic update could go here, but for now we rely on the server action + convex sync
            const rules = gameStateFromConvex?.rules || GAME_RULES || "Standard game rules";
            const result = await processGameMoveAction(currentGameState, rules, input);
            const res = result as any;

            if (!res.success) {
                // We could push a local error message to a toast or local state
                console.error("Move failed:", res.error);
            }
            // State update happens automatically via Convex subscription
        } catch (e) {
            console.error("System Error:", e);
        } finally {
            setIsProcessingMove(false);
        }
    };

    return (
        <div className="flex flex-col items-center min-h-screen p-8 gap-8">
            <h1 className="text-3xl font-bold">AI Game Generator & Agent (Convex Synced)</h1>

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
                        window.location.reload();
                    }}
                    disabled={isGenerating}
                >
                    Reset
                </button>
            </div>

            <div className="flex gap-4 w-full max-w-6xl">
                {/* Game Area */}
                <div className="flex-1 border border-gray-200 rounded-xl p-4 min-h-[500px] shadow-sm bg-white text-black relative">
                    <div className="h-full w-full relative">
                        <Game initialState={currentGameState} />
                    </div>
                </div>

                {/* Chat Area */}
                <div className="w-80 border border-gray-700 bg-gray-900 text-white rounded-xl p-4 flex flex-col h-[600px]">
                    <h2 className="text-xl font-bold mb-4">Game Agent</h2>
                    <div className="flex-1 overflow-y-auto mb-4 space-y-2 pr-2">
                        {history.length === 0 && (
                            <div className="text-gray-500 italic text-sm">Send a move command to start...</div>
                        )}
                        {history.map((msg: any, i: number) => (
                            <div key={i} className={`p-3 rounded-lg text-sm max-w-[90%] ${msg.role === 'user' ? 'bg-blue-600 self-end ml-auto' : 'bg-gray-700 self-start mr-auto'}`}>
                                {msg.content}
                            </div>
                        ))}
                        {isProcessingMove && (
                            <div className="text-gray-400 text-xs animate-pulse">Agent is thinking...</div>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <input
                            className="flex-1 text-black p-2 rounded"
                            placeholder="e.g. Move knight to b3"
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleChatSubmit()}
                            disabled={isProcessingMove}
                        />
                        <button
                            className="bg-green-600 px-3 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                            onClick={handleChatSubmit}
                            disabled={isProcessingMove}
                        >
                            Send
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
