"use client";

import { useState, useCallback } from 'react';
import { PixiStage } from '../components/test/PixiStage';
import { GameEntity } from '../components/test/GameEntity';

export default function TestPixiPage() {
    const [lastCommand, setLastCommand] = useState<string>("Waiting for interaction...");
    const [logs, setLogs] = useState<string[]>([]);

    // The "Backend Action" Handler
    const handleUserAction = useCallback((command: string) => {
        setLastCommand(command);
        setLogs(prev => [command, ...prev].slice(0, 5));
        console.log("SEND TO LLM:", command);
    }, []);

    return (
        <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-10">

            {/* THE SAFETY SANDWICH CONTAINER */}
            <div className="relative w-[800px] h-[600px] border border-neutral-700 rounded-xl overflow-hidden shadow-2xl bg-black">

                {/* LAYER 1: PixiJS Canvas (The Game World) */}
                {/* We use our new Vanilla Pixi Wrapper */}
                <PixiStage width={800} height={600}>

                    {/* SIMULATED AI GENERATED CONTENT */}
                    <GameEntity
                        id="p1"
                        name="Red Knight"
                        initialX={150}
                        initialY={150}
                        color="red"
                        onAction={handleUserAction}
                    />

                    <GameEntity
                        id="p2"
                        name="Blue Wizard"
                        initialX={350}
                        initialY={150}
                        color="blue"
                        onAction={handleUserAction}
                    />
                </PixiStage>

                {/* LAYER 2: HTML Interaction Overlay (Context-Aware UI) */}
                <div className="absolute top-0 right-0 p-4 pointer-events-none">
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-lg text-white w-64 pointer-events-auto">
                        <h3 className="font-bold border-b border-white/20 pb-2 mb-2">🔹 AI Action Translator</h3>

                        <div className="mb-4">
                            <span className="text-xs text-neutral-400 uppercase">Latest Command</span>
                            <div className="text-green-400 font-mono text-sm mt-1">
                                &gt; {lastCommand}
                            </div>
                        </div>

                        <div>
                            <span className="text-xs text-neutral-400 uppercase">History</span>
                            <ul className="text-xs text-neutral-300 mt-1 space-y-1 font-mono">
                                {logs.map((log, i) => (
                                    <li key={i} className="opacity-70">- {log}</li>
                                ))}
                            </ul>
                        </div>

                        <div className="mt-4 border-t border-white/10 pt-2">
                            <p className="text-[10px] text-gray-400">
                                System: PixiJS v7 (Vanilla) + React 19
                            </p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
