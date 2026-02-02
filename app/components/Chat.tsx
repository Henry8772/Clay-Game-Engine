"use client";

import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { processGameMoveAction } from "../actions/game-move";
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
    // 1. Data Fetching
    const messages = useQuery(api.messages.list, gameId ? { gameId: gameId as any } : "skip");
    const systemLogs = useQuery(api.logs.listSystem, gameId ? { gameId: gameId as any } : "skip");
    const battleLogs = useQuery(api.logs.listBattle, gameId ? { gameId: gameId as any } : "skip");

    // Tab State
    type Tab = 'CREATE' | 'SYSTEM' | 'BATTLE';
    const [activeTab, setActiveTab] = useState<Tab>('CREATE');

    // 2. Local State
    const [input, setInput] = useState("");
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

        const command = input;
        setLocalOptimisticMessage(command); // Show immediately
        setInput("");
        setLocalIsProcessing(true);

        try {
            const result = await processGameMoveAction(currentGameState, gameRules, command, navMesh);
            if (!result.success) {
                console.error("Move failed:", result.error);
                // Optionally show toast
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLocalIsProcessing(false);
            setLocalOptimisticMessage(null); // Clear optimistic message (should be in DB now)
        }
    };

    return (
        <aside className={`flex flex-col border-l border-neutral-800 bg-black ${className}`}>
            <div className="flex border-b border-neutral-800 bg-black">
                <button
                    className={`flex-1 px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${activeTab === 'CREATE' ? 'text-white border-b-2 border-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                    onClick={() => setActiveTab('CREATE')}
                >
                    CREATE
                </button>
                <button
                    className={`flex-1 px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${activeTab === 'SYSTEM' ? 'text-white border-b-2 border-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                    onClick={() => setActiveTab('SYSTEM')}
                >
                    System
                </button>
                <button
                    className={`flex-1 px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${activeTab === 'BATTLE' ? 'text-white border-b-2 border-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                    onClick={() => setActiveTab('BATTLE')}
                >
                    Battle
                </button>
            </div>

            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-black font-mono"
            >
                {/* CREATE VIEW */}
                {activeTab === 'CREATE' && (
                    <>
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
                    </>
                )}

                {/* SYSTEM VIEW */}
                {activeTab === 'SYSTEM' && (
                    <div className="space-y-3">
                        {(!systemLogs || systemLogs.length === 0) && (
                            <div className="text-center opacity-40 text-xs text-neutral-500 mt-10">No system events.</div>
                        )}
                        {systemLogs?.map((log) => (
                            <div key={log._id} className="flex flex-col border-b border-neutral-900 pb-2 last:border-0">
                                <div className="flex justify-between items-center mb-1">
                                    <span className={`text-[9px] font-bold uppercase tracking-wider ${log.type === 'error' ? 'text-red-500' : log.type === 'warning' ? 'text-yellow-500' : 'text-blue-500'}`}>
                                        {log.type || 'INFO'}
                                    </span>
                                    {log.timestamp && <span className="text-[9px] text-neutral-600">{formatDistanceToNow(log.timestamp, { addSuffix: true })}</span>}
                                </div>
                                <div className="text-xs text-neutral-300 font-mono leading-relaxed">
                                    {log.content}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* BATTLE VIEW */}
                {activeTab === 'BATTLE' && (
                    <div className="space-y-2">
                        {(!battleLogs || battleLogs.length === 0) && (
                            <div className="text-center opacity-40 text-xs text-neutral-500 mt-10">No battle logs.</div>
                        )}
                        {battleLogs?.map((log) => (
                            <div key={log._id} className="flex gap-3 px-2 py-2 hover:bg-neutral-900 rounded transition-colors group">
                                <div className="mt-1 w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0 opacity-60 group-hover:opacity-100" />
                                <div className="flex-1">
                                    <div className="text-xs text-neutral-300 font-mono leading-snug">
                                        {log.content}
                                    </div>
                                    <div className="mt-1 flex justify-between items-center">
                                        {log.timestamp && <span className="text-[9px] text-neutral-700 group-hover:text-neutral-500 transaction-colors">{formatDistanceToNow(log.timestamp)} ago</span>}
                                        {log.relatedEntityId && <span className="text-[9px] text-neutral-700 font-mono">ID: {log.relatedEntityId.slice(0, 8)}</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Input is only for Console Tab? Or global? Assuming Global for now, but contextually for Console */}
            <div className="p-3 border-t border-neutral-800 bg-black">
                {activeTab === 'CREATE' ? (
                    <>
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
                    </>
                ) : (
                    <div className="flex justify-center items-center h-16 text-xs text-neutral-600 italic">
                        {activeTab === 'SYSTEM' ? 'System logs are read-only.' : 'Battle logs are read-only.'}
                    </div>
                )}
            </div>
        </aside>
    );
};
