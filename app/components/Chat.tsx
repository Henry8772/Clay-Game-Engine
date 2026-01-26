"use client";

import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { processGameMoveAction } from "../actions/game-move";

interface ChatProps {
    gameId?: string; // Convex ID
    currentGameState: any;
    gameRules: string;
    className?: string;
}

export const Chat = ({ gameId, currentGameState, gameRules, className }: ChatProps) => {
    // 1. Data Fetching
    const messages = useQuery(api.messages.list, gameId ? { gameId: gameId as any } : "skip");

    // 2. Local State
    const [input, setInput] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [optimisticMessage, setOptimisticMessage] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // 3. Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isProcessing, optimisticMessage]);

    // 4. Handlers
    const handleSubmit = async () => {
        if (!input.trim() || isProcessing) return;

        const command = input;
        setOptimisticMessage(command); // Show immediately
        setInput("");
        setIsProcessing(true);

        try {
            const result = await processGameMoveAction(currentGameState, gameRules, command);
            if (!result.success) {
                console.error("Move failed:", result.error);
                // Optionally show toast
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsProcessing(false);
            setOptimisticMessage(null); // Clear optimistic message (should be in DB now)
        }
    };

    return (
        <aside className={`flex flex-col border-l border-neutral-800 bg-black ${className}`}>
            <div className="px-4 py-3 border-b border-neutral-800 bg-black">
                <h2 className="text-xs font-semibold text-white uppercase tracking-wider">
                    Console Output
                </h2>
            </div>

            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-black font-mono"
            >
                {(!messages || messages.length === 0) && !isProcessing && !optimisticMessage && (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                        <p className="text-xs text-neutral-500">Waiting for commands...</p>
                    </div>
                )}

                {messages?.map((msg) => (
                    <div key={msg._id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
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

                {/* Optimistic User Message */}
                {optimisticMessage && (
                    <div className="flex flex-col items-end opacity-70">
                        <span className="text-[9px] text-neutral-600 mb-1 uppercase tracking-wider">usr (sending)</span>
                        <div className="max-w-[95%] px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap rounded border bg-white text-black border-white">
                            {optimisticMessage}
                        </div>
                    </div>
                )}

                {/* System Processing Indicator */}
                {isProcessing && (
                    <div className="flex flex-col items-start animate-pulse">
                        <span className="text-[9px] text-neutral-600 mb-1 uppercase tracking-wider">sys</span>
                        <div className="flex items-center gap-2 px-3 py-2 text-xs rounded border bg-neutral-900 text-neutral-400 border-neutral-800 border-dashed">
                            <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
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
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                            disabled={isProcessing}
                            autoFocus
                        />
                    </div>
                </div>
                <div className="flex justify-between items-center mt-2 px-1">
                    <span className="text-[9px] text-neutral-600">Gemini Engine CLI v1.1</span>
                    <button
                        className="text-[10px] text-neutral-400 hover:text-white underline decoration-neutral-700 underline-offset-2 transition-colors disabled:opacity-30"
                        onClick={handleSubmit}
                        disabled={!input.trim() || isProcessing}
                    >
                        Execute
                    </button>
                </div>
            </div>
        </aside>
    );
};
