"use client";

import React, { useState, useEffect } from "react";
import { Game, INITIAL_STATE, GAME_RULES } from "../generated/game-slot";
import { generateGameAction } from "../actions/generate";
import { processGameMoveAction } from "../actions/game-move";

export default function PlayPage() {
    const [prompt, setPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);

    // Game State Management
    const [currentGameState, setCurrentGameState] = useState<any>(INITIAL_STATE);
    const [chatInput, setChatInput] = useState("");
    const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'agent', content: string }[]>([]);
    const [isProcessingMove, setIsProcessingMove] = useState(false);

    // Update state when INITIAL_STATE changes (e.g. after loading test)
    useEffect(() => {
        setCurrentGameState(INITIAL_STATE);
    }, [INITIAL_STATE]);

    const handleGenerate = async () => {
        if (!prompt) return;
        setIsGenerating(true);
        try {
            const result = await generateGameAction(prompt);
            if (result.success) {
                console.log("Game generated successfully!");
                // Note: This forces a refresh because the generate action overwrites the file.
                // Ideally we should reload or the HMR handles it.
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
        setChatMessages(prev => [...prev, { role: 'user', content: input }]);
        setIsProcessingMove(true);

        try {
            // Use current state and rules using the agent
            const rules = GAME_RULES || "Standard game rules";
            const result = await processGameMoveAction(currentGameState, rules, input);
            const res = result as any;

            if (res.success && res.newState) {
                setCurrentGameState(res.newState);
                setChatMessages(prev => [...prev, { role: 'agent', content: res.summary }]);
            } else {
                setChatMessages(prev => [...prev, { role: 'agent', content: "Error: " + (res.error || res.summary || "Unknown error") }]);
            }
        } catch (e) {
            setChatMessages(prev => [...prev, { role: 'agent', content: "System Error: " + String(e) }]);
        } finally {
            setIsProcessingMove(false);
        }
    };

    return (
        <div className="flex flex-col items-center min-h-screen p-8 gap-8">
            <h1 className="text-3xl font-bold">AI Game Generator & Agent</h1>

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
                            // We might need to reload to pick up the new const exports if HMR doesn't handle non-component exports well?
                            // But usually it's fine.
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
                        {chatMessages.length === 0 && (
                            <div className="text-gray-500 italic text-sm">Send a move command to start...</div>
                        )}
                        {chatMessages.map((msg, i) => (
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
