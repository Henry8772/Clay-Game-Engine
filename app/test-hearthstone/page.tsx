"use client";

import { useState, useCallback } from 'react';
import { SmartScene } from '../components/engine/SmartScene';
import { SceneManifest } from '../components/engine/types';

// --- MOCK MANIFEST (This is what the AI Agent would generate) ---
const HEARTHSTONE_MANIFEST: SceneManifest = {
    layers: {
        ambience: [
            {
                id: 'tavern_bg',
                role: 'BACKGROUND',
                // Using a placeholder tavern image (or color for now)
                color: '#1a0b00', // Dark wood brown
                src: '/assets/hearthstone/background.png'
            }
        ],
        stage: [],
        actors: [
            // --- ZONES ---
            {
                id: 'OpponentHand',
                role: 'ZONE',
                type: 'FREE', // Just a visual area
                color: '#4a0404',
                initialState: { x: 150, y: 0 },
                config: { width: 500, height: 100 }
            },
            {
                id: 'Battlefield',
                role: 'ZONE',
                type: 'GRID',
                color: '#000000', // Invisible usually
                initialState: { x: 150, y: 150 },
                config: { width: 500, height: 300, cellSize: 100 } // 5x3 Grid
            },
            {
                id: 'PlayerHand',
                role: 'ZONE',
                type: 'FAN',
                color: '#004400',
                initialState: { x: 150, y: 500 },
                config: { width: 500, height: 100 }
            },
            // --- ENTITIES ---
            {
                id: 'Card_AzureDrake',
                role: 'SPRITE',
                color: 'blue',
                initialState: { x: 200, y: 520 }, // Starts in hand
                src: '/assets/hearthstone/card-1.png'
            },
            {
                id: 'Card_Ragnaros',
                role: 'SPRITE',
                color: 'red',
                initialState: { x: 300, y: 520 }, // Starts in hand
                src: '/assets/hearthstone/card-2.png'
            }
        ],
        juice: []
    }
};

export default function HearthstoneTestPage() {
    const [lastLog, setLastLog] = useState("Waiting...");

    const handleAction = useCallback((cmd: string) => {
        setLastLog(cmd);
        console.log("AI ACTION:", cmd);
    }, []);

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center font-sans text-white">
            <h1 className="mb-4 text-xl font-bold text-amber-500">Hearthstone Mock: 4-Layer Engine</h1>

            <div className="relative overflow-hidden">
                <SmartScene
                    manifest={HEARTHSTONE_MANIFEST}
                    onAction={handleAction}
                    width={800}
                    height={600}
                />

                {/* UI OVERLAY (Layer 4) */}
                <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
                    <div className="bg-black/80 backdrop-blur text-green-400 font-mono p-2 rounded text-sm text-center border border-white/10">
                        &gt; {lastLog}
                    </div>
                </div>
            </div>

            <p className="mt-4 text-gray-500 text-sm max-w-lg text-center">
                Layers: 0. Ambience (Parallax) | 1. Board (Fit) | 2. Actors & Zones | 3. Juice <br />
                Engine separates "Data" (JSON) from "Logic" (React/Pixi).
            </p>
        </div>
    );
}
