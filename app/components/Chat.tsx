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
    // Turn Control Props
    isPlayerTurn?: boolean;
    onEndTurn?: () => void;
    isInteractionLocked?: boolean;
}

export const Chat = ({
    gameId,
    currentGameState,
    gameRules,
    className,
    navMesh,
    externalOptimisticMessage,
    externalIsProcessing,
    isPlayerTurn = false,
    onEndTurn,
    isInteractionLocked = false
}: ChatProps) => {
    // 1. Data Fetching - Only one list now
    const messages = useQuery(api.messages.list, gameId ? { gameId: gameId as any } : "skip");

    // 2. Local State
    const [input, setInput] = useState("");
    const [isEditMode, setIsEditMode] = useState(false); // Toggle state
    const [localIsProcessing, setLocalIsProcessing] = useState(false);
    const [localOptimisticMessage, setLocalOptimisticMessage] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Derived State
    const isProcessing = localIsProcessing || externalIsProcessing;
    const optimisticMessage = localOptimisticMessage || externalOptimisticMessage;

    // 3. Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isProcessing, optimisticMessage]);

    // Auto-resize textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto'; // Reset to auto to get correct scrollHeight
            textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`; // Grow up to 150px
        }
    }, [input]);

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
                // STANDARD GAME MOVE
                result = await processGameMoveAction(currentGameState, gameRules, {
                    type: 'CHAT',
                    description: command,
                    payload: { text: command }
                }, navMesh);
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
        <aside className={`flex flex-col border-l border-neutral-800 bg-black min-h-0 ${className}`}>
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
                    // Refined Role Checks
                    const isSystem = msg.role === 'system' || msg.type === 'system';
                    const isBattle = msg.type === 'battle';
                    const isUser = msg.role === 'user';
                    const isAI = msg.role === 'assistant' || msg.role === 'agent';

                    if (isBattle) {
                        return (
                            <div key={msg._id} className="flex gap-4 px-2 py-3 hover:bg-neutral-900/50 rounded transition-colors group border-l-2 border-red-900/50 pl-4 relative overflow-hidden">
                                <div className="absolute inset-0 bg-red-950/10 z-0" />
                                <div className="z-10 flex flex-col items-center gap-1 pt-1 min-w-[30px]">
                                    <span className="text-[9px] text-red-500 font-bold uppercase tracking-wider">Fight</span>
                                </div>
                                <div className="flex-1 z-10">
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
                        // System logs (Game Engine Outputs) - Structured or Legacy
                        const subType = msg.data?.subType || 'LOG';
                        const logs = msg.data?.logs; // Check for structured logs

                        if (logs && Array.isArray(logs)) {
                            return (
                                <div key={msg._id} className="flex flex-col gap-1 py-2 pl-2 group transition-opacity select-none border-l-2 border-transparent hover:border-neutral-800">
                                    {logs.map((log: any, idx: number) => {
                                        const isDanger = log.type === 'danger';
                                        const isWarning = log.type === 'warning';
                                        const isSuccess = log.type === 'success';
                                        const isInfo = log.type === 'info';
                                        const isMod = log.type === 'modification';

                                        return (
                                            <div key={idx} className="flex-1 font-mono">
                                                <div className="flex items-baseline gap-2">
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider w-8 shrink-0 select-none
                                                        ${isDanger ? "text-red-500" : isWarning ? "text-yellow-500" : isSuccess ? "text-green-500" : isMod ? "text-indigo-400" : "text-neutral-600"}
                                                    `}>
                                                        {isDanger ? "DEAD" : isWarning ? "WARN" : isSuccess ? "WIN" : isMod ? "MOD" : "LOG"}
                                                    </span>
                                                    <span className={`text-[10px] leading-relaxed whitespace-pre-wrap font-medium
                                                        ${isDanger ? "text-red-400" : isWarning ? "text-yellow-200" : isSuccess ? "text-green-300" : "text-neutral-400"}
                                                    `}>
                                                        {log.message}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        }

                        // Fallback to legacy string content
                        const isError = subType === 'error';
                        const isWarning = subType === 'warning';
                        const isModification = subType === 'modification_log';

                        return (
                            <div key={msg._id} className="flex gap-3 py-1 pl-2 group transition-opacity select-none">
                                <div className="flex-1 font-mono">
                                    <div className="flex items-baseline gap-2">
                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${isError ? "text-red-400" : isWarning ? "text-yellow-400" : isModification ? "text-indigo-400" : "text-neutral-500"} w-8 shrink-0 select-none`}>
                                            {isModification ? "MOD" : subType}
                                        </span>
                                        <span className="text-xs text-neutral-300 leading-relaxed whitespace-pre-wrap font-medium">
                                            {msg.content}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    // User Message - Right side, High Contrast, Rectangle
                    if (isUser) {
                        return (
                            <div key={msg._id} className="flex flex-col items-end mt-4 mb-2 pl-12">
                                <div className="flex items-center gap-2 mb-1 mr-1">
                                    <span className="text-[10px] text-neutral-400 font-medium tracking-wider uppercase">You</span>
                                </div>
                                <div className="max-w-full px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap rounded border bg-neutral-100 text-neutral-900 border-white font-medium shadow-sm">
                                    {msg.content}
                                </div>
                            </div>
                        );
                    }

                    // AI Message - Left side, High Contrast, Rectangle
                    if (isAI) {
                        return (
                            <div key={msg._id} className="flex flex-col items-start mt-4 mb-2 pr-12">
                                <div className="flex items-center gap-2 mb-1 ml-1">
                                    <span className="text-[10px] text-indigo-400 font-bold tracking-wider uppercase drop-shadow-[0_0_3px_rgba(99,102,241,0.8)]">AI Opponent</span>
                                </div>
                                <div className="max-w-full px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap rounded border bg-indigo-900/40 text-neutral-100 border-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.1)] backdrop-blur-sm">
                                    {msg.content}
                                </div>
                            </div>
                        );
                    }

                    // Fallback
                    return <div key={msg._id} className="text-xs text-red-500">Unknown message type: {msg.role}</div>;
                })}

                {/* Optimistic User Message */}
                {optimisticMessage && (
                    <div className="flex flex-col items-end opacity-70 mt-4 mb-2 pl-12">
                        <span className="text-[9px] text-neutral-600 mb-1 uppercase tracking-wider">usr (sending)</span>
                        <div className="max-w-full px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap rounded border bg-neutral-100 text-neutral-900 border-white font-medium">
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

            {/* Turn Controls - Integrated */}
            <div className="h-12 border-t border-neutral-800 bg-neutral-900/30 flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isPlayerTurn ? "bg-green-500" : "bg-red-500"}`} />
                    <span className="text-[10px] font-mono text-white font-bold uppercase tracking-wider">
                        {isPlayerTurn ? "YOUR TURN" : "ENEMY TURN"}
                    </span>
                </div>

                <button
                    onClick={onEndTurn}
                    disabled={isInteractionLocked || !isPlayerTurn}
                    className={`px-3 py-1 text-xs font-bold rounded border transition-all ${isInteractionLocked || !isPlayerTurn
                        ? "bg-neutral-900 text-neutral-600 border-neutral-800 cursor-not-allowed"
                        : "bg-neutral-100 text-black border-white hover:bg-neutral-200 active:scale-95"
                        }`}
                >
                    {isInteractionLocked && isPlayerTurn ? "..." : "End Turn"}
                </button>
            </div>

            {/* Input Area */}
            <div className="p-3 border-t border-neutral-800 bg-black space-y-2 shrink-0">

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
                    <div className="flex items-start gap-2 px-3 py-2 bg-neutral-900 border border-neutral-800 rounded focus-within:border-neutral-600 focus-within:ring-0 transition-colors w-full">
                        <span className={`text-xs mt-0.5 ${isEditMode ? 'text-indigo-400' : 'text-neutral-500'}`}>
                            {isEditMode ? '✎' : '$'}
                        </span>
                        <textarea
                            ref={textareaRef}
                            rows={1}
                            className="flex-1 bg-transparent border-none outline-none text-xs text-white placeholder-neutral-600 font-mono p-0 resize-none overflow-y-auto min-h-[1.5em]"
                            placeholder={isEditMode ? "Describe changes to the game state..." : "Enter command..."}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit();
                                }
                            }}
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
