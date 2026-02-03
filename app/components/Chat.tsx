"use client";

import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { processGameMoveAction } from "../actions/game-move";
import { modifyGameAction } from "../actions/modify-game";
import { formatDistanceToNow } from "date-fns";

interface ChatProps {
    gameId?: string; // Convex ID
    currentGameState: any;
    gameRules: string;
    className?: string;
    navMesh?: any[];
    // External Control Props
    externalOptimisticMessage?: string | null;
    externalIsProcessing?: boolean;
}

export const Chat = ({ gameId, currentGameState, gameRules, className, navMesh, externalOptimisticMessage, externalIsProcessing }: ChatProps) => {
    // 1. Data Fetching - Only one list now
    const messages = useQuery(api.messages.list, gameId ? { gameId: gameId as any } : "skip");

    // 2. Local State
    const [input, setInput] = useState("");
    const [isEditMode, setIsEditMode] = useState(false); // Toggle state
    const [localIsProcessing, setLocalIsProcessing] = useState(false);
    const [localOptimisticMessage, setLocalOptimisticMessage] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Derived State
    const isProcessing = localIsProcessing || externalIsProcessing;
    const optimisticMessage = localOptimisticMessage || externalOptimisticMessage;

    // 3. Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isProcessing, optimisticMessage]);

    // 4. Handlers
    const handleSubmit = async () => {
        if (!input.trim() || isProcessing) return;

        // If in Edit Mode, we might want to prefix the command or handle it differently
        // For now, let's prefix it so the LLM knows (or the backend handler knows)
        const command = isEditMode ? `EDIT: ${input}` : input;

        setLocalOptimisticMessage(input); // Show purely the input text
        setInput("");
        setLocalIsProcessing(true);

        try {
            let result;
            if (isEditMode) {
                // GOD MODE ACTION
                if (!gameId) throw new Error("Game ID unknown");
                result = await modifyGameAction(gameId, input);
            } else {
                // STANDARD GAME MOVE
                result = await processGameMoveAction(currentGameState, gameRules, command, navMesh);
            }

            if (!result.success) {
                console.error("Action failed:", result.error);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLocalIsProcessing(false);
            setLocalOptimisticMessage(null);
        }
    };

    return (
        <aside className={`flex flex-col border-l border-neutral-800 bg-black ${className}`}>
            <div className="flex border-b border-neutral-800 bg-neutral-900/50 p-2 items-center justify-between">
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider pl-2">Game Log</span>
                <div className="flex items-center gap-2">
                    {/* Connection Status Indicator could go here */}
                </div>
            </div>

            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-black font-mono"
            >
                {(!messages || messages.length === 0) && !isProcessing && !optimisticMessage && (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                        <p className="text-xs text-neutral-500">Waiting for game start...</p>
                    </div>
                )}

                {messages?.map((msg) => {
                    const isSystem = msg.role === 'system' || msg.type === 'system';
                    const isBattle = msg.type === 'battle';
                    const isUser = msg.role === 'user';

                    if (isBattle) {
                        return (
                            <div key={msg._id} className="flex gap-3 px-2 py-2 hover:bg-neutral-900 rounded transition-colors group border-l-2 border-red-900/50">
                                <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider w-8 shrink-0 py-0.5">Fight</span>
                                <div className="flex-1">
                                    <div className="text-xs text-neutral-300 font-mono leading-snug">
                                        {msg.content}
                                    </div>
                                    <div className="mt-1 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[9px] text-neutral-600">{formatDistanceToNow(msg.timestamp)} ago</span>
                                        {msg.data?.relatedEntityId && <span className="text-[9px] text-neutral-700 font-mono">ID: {msg.data.relatedEntityId.slice(0, 4)}</span>}
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    if (isSystem) {
                        const subType = msg.data?.subType || 'INFO';
                        const colorClass = subType === 'error' ? 'text-red-500' : subType === 'warning' ? 'text-yellow-500' : 'text-blue-500';

                        return (
                            <div key={msg._id} className="flex flex-col py-1 opacity-80 hover:opacity-100 transition-opacity">
                                <div className="flex items-baseline gap-2">
                                    <span className={`text-[9px] font-bold uppercase tracking-wider ${colorClass} w-8 shrink-0`}>
                                        {subType}
                                    </span>
                                    <span className="text-xs text-neutral-400 font-mono leading-relaxed">
                                        {msg.content}
                                    </span>
                                </div>
                            </div>
                        );
                    }

                    // Chat (User or Agent)
                    return (
                        <div key={msg._id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                            <span className="text-[9px] text-neutral-600 mb-1 uppercase tracking-wider">
                                {isUser ? 'usr' : 'sys'}
                            </span>
                            <div
                                className={`
                                    max-w-[95%] px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap rounded border
                                    ${isUser
                                        ? 'bg-white text-black border-white'
                                        : 'bg-neutral-900 text-neutral-300 border-neutral-800'
                                    }
                                `}
                            >
                                {msg.content}
                            </div>
                        </div>
                    );
                })}

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

            {/* Input Area */}
            <div className="p-3 border-t border-neutral-800 bg-black space-y-2">

                {/* Edit Game Toggle */}
                <div className="flex items-center justify-between px-1">
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <div className={`
                            w-8 h-4 rounded-full p-0.5 transition-colors duration-200 ease-in-out
                            ${isEditMode ? 'bg-indigo-600' : 'bg-neutral-800 group-hover:bg-neutral-700'}
                        `}>
                            <div className={`
                                w-3 h-3 bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out
                                ${isEditMode ? 'translate-x-4' : 'translate-x-0'}
                            `} />
                        </div>
                        <span className={`text-[10px] font-medium tracking-wide transition-colors ${isEditMode ? 'text-indigo-400' : 'text-neutral-500 group-hover:text-neutral-400'}`}>
                            EDIT GAME
                        </span>
                        <input
                            type="checkbox"
                            className="hidden"
                            checked={isEditMode}
                            onChange={(e) => setIsEditMode(e.target.checked)}
                        />
                    </label>
                    <span className="text-[9px] text-neutral-600">CLI v1.2</span>
                </div>

                <div className={`
                    relative transition-all duration-300
                    ${isEditMode ? 'p-[1px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-md' : ''}
                `}>
                    <div className="flex items-center gap-2 px-3 py-2 bg-neutral-900 border border-neutral-800 rounded focus-within:border-neutral-600 focus-within:ring-0 transition-colors h-full w-full">
                        <span className={`text-xs ${isEditMode ? 'text-indigo-400' : 'text-neutral-500'}`}>
                            {isEditMode ? '✎' : '$'}
                        </span>
                        <input
                            className="flex-1 bg-transparent border-none outline-none text-xs text-white placeholder-neutral-600 font-mono p-0"
                            placeholder={isEditMode ? "Describe changes to the game state..." : "Enter command..."}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                            disabled={isProcessing}
                            autoFocus
                        />
                    </div>
                </div>

                <div className="flex justify-end px-1">
                    <button
                        className={`text-[10px] underline decoration-neutral-700 underline-offset-2 transition-colors disabled:opacity-30 ${isEditMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-neutral-400 hover:text-white'}`}
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
