"use client";

import React, { useState } from "react";
import { Game, INITIAL_STATE, GAME_RULES } from "../generated/game-slot";
import { generateGameAction } from "../actions/generate";
import { processGameMoveAction } from "../actions/game-move";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

import { GameErrorBoundary } from "../components/GameErrorBoundary";

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
            const rules = gameStateFromConvex?.rules || GAME_RULES || "Standard game rules";
            const result = await processGameMoveAction(currentGameState, rules, input);
            const res = result as any;

            if (!res.success) {
                console.error("Move failed:", res.error);
            }
        } catch (e) {
            console.error("System Error:", e);
        } finally {
            setIsProcessingMove(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-black text-white font-sans antialiased selection:bg-white selection:text-black">
            {/* Header / Control Bar */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-black sticky top-0 z-10 w-full">
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                        <span className="font-bold text-black text-xs">G</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <h1 className="text-sm font-semibold tracking-tight">Gemini Engine</h1>
                        <span className="text-xs text-neutral-500 font-mono">BETA</span>
                    </div>
                </div>

                <div className="flex-1 max-w-2xl mx-8">
                    <div className="flex items-center group relative">
                        <input
                            type="text"
                            className="w-full bg-neutral-900 border border-neutral-800 rounded px-4 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all"
                            placeholder="Describe your game idea..."
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            disabled={isGenerating}
                            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                        />
                        <div className="absolute right-1 top-1 bottom-1">
                            <button
                                className={`h-full px-3 text-xs font-medium rounded transition-colors ${prompt && !isGenerating
                                    ? "bg-white text-black hover:bg-neutral-200"
                                    : "bg-transparent text-neutral-600 cursor-not-allowed"
                                    }`}
                                onClick={handleGenerate}
                                disabled={!prompt || isGenerating}
                            >
                                {isGenerating ? "Generating..." : "Generate"}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        className="px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-600 rounded transition-colors"
                        onClick={async () => {
                            const { loadTestGameAction } = await import("../actions/load-test");
                            const res = await loadTestGameAction();
                            if (res.success) console.log("Loaded test game!");
                            else alert("Failed: " + res.error);
                        }}
                        disabled={isGenerating}
                    >
                        Load Test
                    </button>
                    <button
                        className="px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-600 rounded transition-colors"
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
            </header>

            {/* Main Content */}
            <main className="flex-1 flex overflow-hidden">

                {/* Game Area */}
                <section className="flex-1 flex flex-col min-w-0 bg-neutral-950 relative">

                    {/* Toolbar for Game Panel */}
                    <div className="h-10 border-b border-neutral-800 bg-black flex items-center px-4 justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">Preview Environment</span>
                        </div>
                    </div>

                    <div className="flex-1 relative overflow-hidden flex items-center justify-center p-8 bg-neutral-950">
                        <div className="relative z-10 w-full h-full border border-neutral-800 rounded bg-black shadow-2xl overflow-hidden">
                            <GameErrorBoundary>
                                <Game initialState={currentGameState} />
                            </GameErrorBoundary>
                        </div>
                    </div>
                </section>

                {/* Chat / Agent Sidebar */}
                <aside className="w-[400px] flex flex-col bg-black border-l border-neutral-800 z-20">
                    <div className="px-4 py-3 border-b border-neutral-800 bg-black">
                        <h2 className="text-xs font-semibold text-white uppercase tracking-wider">
                            Console Output
                        </h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-black font-mono">
                        {history.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                                <p className="text-xs text-neutral-500">Waiting for commands...</p>
                            </div>
                        )}

                        {history.map((msg: any, i: number) => (
                            <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <span className="text-[9px] text-neutral-600 mb-1 uppercase tracking-wider">
                                    {msg.role === 'user' ? 'usr' : 'sys'}
                                </span>
                                <div
                                    className={`
                                        max-w-[95%] px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap rounded border
                                        ${msg.role === 'user'
                                            ? 'bg-white text-black border-white'
                                            : 'bg-neutral-900 text-neutral-300 border-neutral-800'
                                        }
                                    `}
                                >
                                    {msg.content}
                                </div>
                            </div>
                        ))}

                        {isProcessingMove && (
                            <div className="flex items-center gap-2 text-[10px] text-neutral-500 px-2 py-1">
                                <span className="animate-pulse">_ processing...</span>
                            </div>
                        )}
                    </div>

                    <div className="p-3 border-t border-neutral-800 bg-black">
                        <div className="relative">
                            <div className="flex items-center gap-2 px-3 py-2 bg-neutral-900 border border-neutral-800 rounded focus-within:border-neutral-600 focus-within:ring-0 transition-colors">
                                <span className="text-neutral-500 text-xs">$</span>
                                <input
                                    className="flex-1 bg-transparent border-none outline-none text-xs text-white placeholder-neutral-600 font-mono p-0"
                                    placeholder="Enter command..."
                                    value={chatInput}
                                    onChange={e => setChatInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleChatSubmit()}
                                    disabled={isProcessingMove}
                                />
                            </div>
                        </div>
                        <div className="flex justify-between items-center mt-2 px-1">
                            <span className="text-[9px] text-neutral-600">Gemini Engine CLI v1.0</span>
                            <button
                                className="text-[10px] text-neutral-400 hover:text-white underline decoration-neutral-700 underline-offset-2 transition-colors disabled:opacity-30"
                                onClick={handleChatSubmit}
                                disabled={!chatInput.trim() || isProcessingMove}
                            >
                                Execute
                            </button>
                        </div>
                    </div>
                </aside>
            </main>
        </div>
    );
}
