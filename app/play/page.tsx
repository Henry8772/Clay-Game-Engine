"use client";

import React, { useState, useMemo, useEffect } from "react";
// import { Game, INITIAL_STATE, GAME_RULES } from "../generated/game-slot";
import { BASE_GAME_RULES, SPRITE_RULES } from "../game-rules";
import { SmartScene } from "../components/engine/SmartScene";
import { SceneManifest, AssetManifest } from "../components/engine/types";
import { generateGameAction } from "../actions/generate";
// import { processGameMoveAction } from "../actions/game-move";
import { useGameEngine } from "../hooks/useGameEngine";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

import { GameErrorBoundary } from "../components/GameErrorBoundary";
import { Chat } from "../components/Chat";
import { useMovementLogic } from "../hooks/useMovementLogic";

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

    // Run Management
    const [availableRuns, setAvailableRuns] = useState<string[]>([]);
    const [selectedRunId, setSelectedRunId] = useState<string>("experiment-3"); // Default

    // Local state for fetched gamestate (Dev workflow)
    const [localGameState, setLocalGameState] = useState<any>(null);
    const [blueprints, setBlueprints] = useState<Record<string, any>>({});
    const [navMesh, setNavMesh] = useState<any[]>([]);

    // 1. Fetch Available Runs on Mount
    useEffect(() => {
        fetch('/api/runs')
            .then(res => res.json())
            .then(data => {
                if (data.runs && Array.isArray(data.runs)) {
                    setAvailableRuns(data.runs);
                    // Optionally set default if not 'experiment-3'
                    // if (data.runs.length > 0) setSelectedRunId(data.runs[0]);
                }
            })
            .catch(err => console.error("Failed to fetch runs:", err));
    }, []);

    // 2. Fetch Data when Selected Run Changes
    useEffect(() => {
        console.log("Fetching data for run:", selectedRunId);
        // FETCH WORKFLOW:
        // We fetch gamestate and navmesh via the proxy.
        // The proxy path logic: /api/asset-proxy/runs/{runId}/{filename}

        const basePath = selectedRunId === 'experiment-3'
            ? '/api/asset-proxy/experiment-3' // Legacy path
            : `/api/asset-proxy/runs/${selectedRunId}`;

        Promise.all([
            fetch(`${basePath}/gamestate.json`).then(res => {
                if (!res.ok) throw new Error("Gamestate missing");
                return res.json();
            }),
            fetch(`${basePath}/navmesh.json`).then(res => res.json()).catch(() => [])
        ]).then(([data, navData]) => {
            console.log("Loaded content:", { data, navData });

            // Handle new ArchitectOutput structure
            if (data.initialState) {
                setLocalGameState(data.initialState);
                if (data.blueprints) setBlueprints(data.blueprints);
            } else {
                setLocalGameState(data);
                setBlueprints({}); // Reset if legacy format
            }

            setNavMesh(navData);
        }).catch(err => {
            console.error(`Failed to load content for ${selectedRunId}:`, err);
            // Reset to avoid stale state
            setLocalGameState(null);
            setNavMesh([]);
            setBlueprints({});
        });
    }, [selectedRunId]);

    // Fallback logic: Convex -> Local File -> Empty
    const currentGameState = (convexState && convexState.entities)
        ? convexState
        : (localGameState || FALLBACK_GAMESTATE);

    console.log("Current Game State:", currentGameState);

    const rules = gameStateFromConvex?.rules || "Standard game rules";
    const gameId = gameStateFromConvex?._id;

    // Movement Logic Hook
    const { getReachableTiles } = useMovementLogic();
    const [reachableTiles, setReachableTiles] = useState<Set<string>>(new Set());

    // Transform GameState to SceneManifest
    const manifest: SceneManifest = useMemo(() => {
        // SCENE DIMENSIONS (Matches background.png)
        const SCENE_WIDTH = 1408;
        const SCENE_HEIGHT = 736;

        // Dynamic Source Base Path
        const basePath = selectedRunId === 'experiment-3'
            ? '/api/asset-proxy/experiment-3'
            : `/api/asset-proxy/runs/${selectedRunId}`;

        // Scale factors (Input is 1000x1000 normalized)
        const scaleX = SCENE_WIDTH / 1000;
        const scaleY = SCENE_HEIGHT / 1000;

        // 1. Ambience Layer
        const ambience: AssetManifest = {
            id: 'background',
            role: 'BACKGROUND',
            src: `${basePath}/background.png`,
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
            const label = zone.label;

            // Highlight Logic
            const isReachable = reachableTiles.has(label);
            const baseColor = isReachable ? '#00FF00' : '#00FF00'; // Always green base, but we will use visibility?
            // Actually, DropZone uses 'visible' prop for debugging.
            // We want to repurpose DropZone or add a Highlight layer?
            // Existing DropZone logic: debugColor={asset.color}. 
            // If we want to show it, we need to pass a color.

            return {
                id: uniqueId,
                role: 'ZONE',
                color: isReachable ? '#00FFFF' : '#00FF00', // Cyan if reachable
                config: {
                    width: w * scaleX,
                    height: h * scaleY,
                    label: zone.label,
                    // Pass a custom prop to indicate highlighting?
                    highlight: isReachable
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
            if (!entity) return null as any; // Safe guard

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

            let currentZoneLabel = null;
            if (navMesh && navMesh.length > 0) {
                const matchingZone = navMesh.find((zone: any) => isInside({ x: cx, y: cy }, zone.box_2d));
                if (matchingZone) {
                    currentZoneLabel = matchingZone.label;
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
                    // Store logic data for pick-up event
                    templateId: entity.t,
                    currentZone: currentZoneLabel
                }
            };
        }).filter(Boolean);

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
    }, [currentGameState, navMesh, reachableTiles, selectedRunId]);

    // Chat Coordination State
    const [chatOptimisticMessage, setChatOptimisticMessage] = useState<string | null>(null);
    const [chatIsProcessing, setChatIsProcessing] = useState(false);

    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const { sendAction } = useGameEngine();

    const handleAction = async (commandOrEvent: string) => {
        // console.log("Scene Action:", commandOrEvent);
        try {
            // Check if it's a JSON event from SmartScene
            if (commandOrEvent.startsWith('{')) {
                const event = JSON.parse(commandOrEvent);

                // PICK UP EVENT (Start Drag)
                if (event.type === 'PICK_UP') {
                    const { entityId, entityConfig } = event;
                    const templateId = entityConfig?.templateId;
                    const currentZone = entityConfig?.currentZone;

                    if (templateId && currentZone && blueprints[templateId]) {
                        const metadata = blueprints[templateId];
                        if (metadata.movement) {
                            const occupied = new Set<string>(); // TODO: Calculate occupied from currentState
                            const allTiles = navMesh.map((z: any) => z.label);

                            const reached = getReachableTiles(currentZone, metadata.movement, occupied, allTiles);
                            setReachableTiles(reached);
                        }
                    }
                    return;
                }

                // DROP EVENT (End Drag)
                if (event.type === 'MOVE') {
                    setReachableTiles(new Set()); // Clear highlights

                    const { entity, entityId, to } = event;
                    if (!to || to === event.from) {
                        console.log("Move cancelled or dropped on same tile.");
                        setRefreshTrigger(p => p + 1); // Ensure revert if dragged but dropped on same
                        return;
                    }

                    // Strip unique suffix from DropZone ID (e.g. "tile_r0_c0_0" -> "tile_r0_c0")
                    // We need unique IDs for React keys, but the game logic expects the raw label.
                    const targetLabel = to.replace(/_\d+$/, '');

                    // Construct Natural Language Command
                    // We include ID to be precise
                    const moveCommand = `Move ${entity} (id: ${entityId}) to ${targetLabel}`;
                    console.log("Generated Command from Drag:", moveCommand);

                    const actionPayload = {
                        type: "MOVE" as const,
                        playerId: "local_player",
                        payload: {
                            entityId: entityId,
                            targetLocation: targetLabel,
                            entityName: entity
                        },
                        timestamp: Date.now()
                    };

                    await sendAction(actionPayload, navMesh);

                    // Force refresh - if invalid, this snaps back. If valid, this remounts at new position.
                    setRefreshTrigger(p => p + 1);
                }
            } else {
                console.log("Unknown action format:", commandOrEvent);
            }
        } catch (e) {
            console.error("Failed to parse action:", e);
            setReachableTiles(new Set());
            setRefreshTrigger(p => p + 1); // Safety revert
        }
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

                    {/* RUN SELECTOR */}
                    <select
                        className="px-2 py-1.5 text-xs bg-black text-neutral-400 border border-neutral-800 rounded hover:border-neutral-600 outline-none"
                        value={selectedRunId}
                        onChange={(e) => setSelectedRunId(e.target.value)}
                    >
                        <option value="experiment-3">Default (Experiment 3)</option>
                        {availableRuns.map(run => (
                            <option key={run} value={run}>{run}</option>
                        ))}
                    </select>

                    <button
                        className={`px-3 py-1.5 text-xs font-medium border rounded transition-colors ${showDebug
                            ? "bg-green-900/30 text-green-400 border-green-800 hover:bg-green-900/50"
                            : "text-neutral-400 hover:text-white border-neutral-800 hover:border-neutral-600"}`}
                        onClick={() => setShowDebug(!showDebug)}
                    >
                        {showDebug ? "Hide NavMesh" : "Show NavMesh"}
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            className="px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-600 rounded transition-colors"
                            onClick={async () => {
                                // Reloads page, which re-triggers fetch for selectedRunId
                                window.location.reload();
                            }}
                            disabled={isGenerating}
                        >
                            Refresh
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
                        <div className="text-[10px] font-mono text-neutral-600">
                            RUN: {selectedRunId}
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
                                    debugZones={showDebug || reachableTiles.size > 0}
                                    refreshTrigger={refreshTrigger}
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
                    externalOptimisticMessage={chatOptimisticMessage}
                    externalIsProcessing={chatIsProcessing}
                />
            </main>
        </div>
    );
}
