"use client";

import React, { useState, useMemo, useEffect } from "react";
// import { Game, INITIAL_STATE, GAME_RULES } from "../generated/game-slot";
import { SmartScene } from "../components/engine/SmartScene";
import { SceneManifest, AssetManifest } from "../components/engine/types";
import { generateGameAction } from "../actions/generate";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

import { GameErrorBoundary } from "../components/GameErrorBoundary";
import { Chat } from "../components/Chat";

// Temporary Initial State reflecting the structure we expect from the backend
const FALLBACK_GAMESTATE = {
    entities: []
};

export default function PlayPage() {
    const [prompt, setPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);

    // Convex State Management
    const gameStateFromConvex = useQuery(api.games.get);

    // Derived State
    const convexState = gameStateFromConvex?.state;

    // Local state for fetched gamestate (Dev workflow)
    const [localGameState, setLocalGameState] = useState<any>(null);
    const [navMesh, setNavMesh] = useState<any[]>([]);

    useEffect(() => {
        // FETCH WORKFLOW:
        // In this experiment, we generate gamestate.json in the backend.
        // We fetch it via the proxy to iterate quickly without DB sync.
        Promise.all([
            fetch('/api/asset-proxy/experiment-3/gamestate.json').then(res => res.json()),
            fetch('/api/asset-proxy/experiment-3/navmesh.json').then(res => res.json()).catch(() => [])
        ]).then(([gameState, navData]) => {
            console.log("Loaded content from proxy:", { gameState, navData });
            setLocalGameState(gameState);
            setNavMesh(navData);
        }).catch(err => console.error("Failed to load local content:", err));
    }, []);

    // Fallback logic: Convex -> Local File -> Empty
    const currentGameState = (convexState && convexState.entities)
        ? convexState
        : (localGameState || FALLBACK_GAMESTATE);

    console.log("Current Game State:", currentGameState);

    const rules = gameStateFromConvex?.rules || "Standard game rules";
    const gameId = gameStateFromConvex?._id;

    // Transform GameState to SceneManifest
    const manifest: SceneManifest = useMemo(() => {
        // SCENE DIMENSIONS (Matches background.png)
        const SCENE_WIDTH = 1408;
        const SCENE_HEIGHT = 736;

        // Scale factors (Input is 1000x1000 normalized)
        const scaleX = SCENE_WIDTH / 1000;
        const scaleY = SCENE_HEIGHT / 1000;

        // 1. Ambience Layer
        const ambience: AssetManifest = {
            id: 'background',
            role: 'BACKGROUND',
            src: '/api/asset-proxy/experiment-3/background.png',
            initialState: {
                x: 0,
                y: 0
            }
        };

        // 2. Zones Layer (From NavMesh)
        const zones = navMesh.map((zone: any, index: number): AssetManifest => {
            // box_2d: [ymin, xmin, ymax, xmax]
            const [ymin, xmin, ymax, xmax] = zone.box_2d;
            const w = xmax - xmin;
            const h = ymax - ymin;

            // Ensure unique ID even if labels repeat (e.g. multiple 'sidebar_slot')
            const uniqueId = `${zone.label}_${index}`;

            return {
                id: uniqueId,
                role: 'ZONE',
                color: '#00FF00', // Debug Green
                config: {
                    width: w * scaleX,
                    height: h * scaleY,
                    label: zone.label
                },
                initialState: {
                    x: xmin * scaleX, // CollisionSystem expects Top-Left
                    y: ymin * scaleY
                }
            };
        });

        // Helper to check intersection
        const isInside = (point: { x: number, y: number }, box: number[]) => {
            // box: [ymin, xmin, ymax, xmax] (Original 1000-space)
            const [ymin, xmin, ymax, xmax] = box;
            return point.x >= xmin && point.x <= xmax && point.y >= ymin && point.y <= ymax;
        };

        // 3. Actor Layer
        // Map gamestate entities to sprite props
        const actors = (currentGameState.entities || []).map((entity: any): AssetManifest => {
            const ymin = entity.pixel_box ? entity.pixel_box[0] : 0;
            const xmin = entity.pixel_box ? entity.pixel_box[1] : 0;
            const ymax = entity.pixel_box ? entity.pixel_box[2] : 100;
            const xmax = entity.pixel_box ? entity.pixel_box[3] : 100;

            const boxWidth = xmax - xmin;
            const boxHeight = ymax - ymin;

            // Raw Center (in 1000-space)
            const cx = xmin + boxWidth / 2;
            const cy = ymin + boxHeight / 2;

            // SNAP LOGIC: Find which NavMesh tile this center falls into
            let finalX = xmin * scaleX + (boxWidth * scaleX / 2);
            let finalY = ymin * scaleY + (boxHeight * scaleY / 2);

            if (navMesh && navMesh.length > 0) {
                const matchingZone = navMesh.find((zone: any) => isInside({ x: cx, y: cy }, zone.box_2d));
                if (matchingZone) {
                    // Snap to Zone Center
                    const [zYmin, zXmin, zYmax, zXmax] = matchingZone.box_2d;
                    const zWidth = zXmax - zXmin;
                    const zHeight = zYmax - zYmin;

                    finalX = (zXmin * scaleX) + (zWidth * scaleX / 2);
                    finalY = (zYmin * scaleY) + (zHeight * scaleY / 2);
                }
            }

            return {
                id: entity.id,
                role: 'SPRITE',
                src: entity.src || '/placeholder.png',
                initialState: {
                    x: finalX,
                    y: finalY,
                },
                config: {
                    label: entity.label,
                    width: boxWidth * scaleX,
                    height: boxHeight * scaleY,
                    draggable: true,
                }
            };
        });

        return {
            layers: {
                ambience: [ambience],
                actors: [...zones, ...actors], // Render zones behind actors
                stage: [],
                juice: []
            },
            physics: {
                enabled: true,
                zones: []
            }
        };
    }, [currentGameState, navMesh]);

    const handleAction = (command: string) => {
        console.log("Scene Action:", command);
    };

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

    const [showDebug, setShowDebug] = useState(false);

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
                        <span className="text-xs text-neutral-500 font-mono">VISUAL MODE</span>
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
                        className={`px-3 py-1.5 text-xs font-medium border rounded transition-colors ${showDebug
                            ? "bg-green-900/30 text-green-400 border-green-800 hover:bg-green-900/50"
                            : "text-neutral-400 hover:text-white border-neutral-800 hover:border-neutral-600"}`}
                        onClick={() => setShowDebug(!showDebug)}
                    >
                        {showDebug ? "Hide NavMesh" : "Show NavMesh"}
                    </button>

                    <button
                        className="px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-600 rounded transition-colors"
                        onClick={async () => {
                            const { loadTestGameAction } = await import("../actions/load-test");
                            const res = await loadTestGameAction();
                            if (res.success) {
                                console.log("Loaded test game!");
                                window.location.reload();
                            }
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
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">Live Sreaming</span>
                        </div>
                    </div>

                    <div className="flex-1 relative overflow-hidden flex items-center justify-center p-8 bg-neutral-950">
                        <div className="relative z-10 w-full h-full border border-neutral-800 rounded bg-black shadow-2xl overflow-hidden flex items-center justify-center">
                            <GameErrorBoundary>
                                <SmartScene
                                    manifest={manifest}
                                    onAction={handleAction}
                                    width={1408}
                                    height={736}
                                    debugZones={showDebug}
                                />
                            </GameErrorBoundary>
                        </div>
                    </div>
                </section>

                <Chat
                    gameId={gameId}
                    currentGameState={currentGameState}
                    gameRules={rules}
                    navMesh={navMesh}
                    className="w-96 border-l border-neutral-800"
                />
            </main>
        </div>
    );
}
