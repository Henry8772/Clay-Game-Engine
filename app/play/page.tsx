"use client";

import React, { useState, useMemo, useEffect } from "react";
import { SmartScene } from "../components/engine/SmartScene";
import { SceneManifest, AssetManifest, UserCommand } from "../components/engine/types";
import { useGameEngine } from "../hooks/useGameEngine";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

import { GameErrorBoundary } from "../components/GameErrorBoundary";
import { Chat } from "../components/Chat";
import { createGameAction } from "../actions/create-game";
import { GameDataEditor } from "../components/GameDataEditor";


// Temporary Initial State reflecting the structure we expect from the backend
const FALLBACK_GAMESTATE = {
    entities: []
};

export default function PlayPage() {
    const [prompt, setPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);

    // Convex State Management
    const gameStateFromConvex = useQuery(api.games.get, {});

    // Derived State
    const convexState = gameStateFromConvex?.state;

    // Run Management
    const [availableRuns, setAvailableRuns] = useState<string[]>([]);
    const [isLoadingRuns, setIsLoadingRuns] = useState(true);
    const [selectedRunId, setSelectedRunId] = useState<string>("boardgame"); // Default to empty, will be set by effect

    const [navMesh, setNavMesh] = useState<any[]>([]);

    // 1. Fetch Available Runs on Mount
    useEffect(() => {
        setIsLoadingRuns(true);
        fetch('/api/runs')
            .then(res => res.json())
            .then(data => {
                if (data.runs && Array.isArray(data.runs)) {
                    setAvailableRuns(data.runs);

                    // Priority Logic:
                    // 1. LocalStorage (User preference)
                    // 2. Hardcoded specific runs (Dev preference)
                    // 3. First available alpha-sorted

                    let targetRun = "";
                    const savedRun = localStorage.getItem('gemini_selected_run');

                    if (savedRun && data.runs.includes(savedRun)) {
                        targetRun = savedRun;
                    } else {
                        // Priority: run_test_real_agents -> run_test_real_workflow -> experiment-3 -> First available
                        if (data.runs.includes('run_test_real_agents')) {
                            targetRun = 'run_test_real_agents';
                        } else if (data.runs.includes('run_test_real_workflow')) {
                            targetRun = 'run_test_real_workflow';
                        } else if (data.runs.includes('experiment-3')) {
                            targetRun = 'experiment-3';
                        } else {
                            targetRun = data.runs[0];
                        }
                    }

                    // Only update if differnt/empty to avoid unnecessary re-renders or overrides if state was already set (though on mount it shouldn't be)
                    // We check !selectedRunId to allow for default state if needed, but here we want to enforce the determined logic
                    if (targetRun) {
                        setSelectedRunId(targetRun);
                    }
                }
            })
            .catch(err => console.error("Failed to fetch runs:", err))
            .finally(() => setIsLoadingRuns(false));
    }, []);

    // Persist selection
    useEffect(() => {
        if (selectedRunId) {
            localStorage.setItem('gemini_selected_run', selectedRunId);
        }
    }, [selectedRunId]);

    // Fallback logic: Convex -> Empty
    const currentGameState = convexState || FALLBACK_GAMESTATE;
    const assets = currentGameState?.meta?.vars || {};

    useEffect(() => {
        // STRATEGY 1: Load directly from the live Game State (Best Practice / Fast)
        // The Modification Agent updates this directly in the DB.
        if (currentGameState?.navMesh && Array.isArray(currentGameState.navMesh) && currentGameState.navMesh.length > 0) {
            console.log("Using Live NavMesh from Convex State");
            setNavMesh(currentGameState.navMesh);
            return;
        }

        // STRATEGY 2: Fallback to File Fetch (Legacy / Slow)
        // Only runs if the NavMesh isn't in the DB object (e.g., older runs)
        const basePath = `/api/asset-proxy/runs/${selectedRunId}`;
        const navMeshUrl = basePath + '/' + assets.navmesh;

        if (navMeshUrl && assets.navmesh) {
            console.log("Loading NavMesh from File (Legacy):", navMeshUrl);
            fetch(navMeshUrl)
                .then(res => res.json())
                .then(data => setNavMesh(data))
                .catch(err => console.error("Failed to load navmesh file:", err));
        } else {
            setNavMesh([]);
        }
    }, [currentGameState?.navMesh, assets.navmesh, selectedRunId]);

    // 1. Derive Turn Status
    const activePlayerId = currentGameState?.meta?.activePlayerId || 'player';
    const players = currentGameState?.meta?.players || [];
    const activePlayerObj = players.find((p: any) => p.id === activePlayerId);

    // Check if it's a human turn (either by type 'human' or legacy 'player' ID)
    const isPlayerTurn = activePlayerObj
        ? activePlayerObj.type === 'human'
        : activePlayerId === 'player';

    // 2. Logic to block interaction
    // We block if it's not our turn, OR if we are currently sending a command
    // We need a local processing state for the command action specifically
    const [isProcessingAction, setIsProcessingAction] = useState(false);
    const isInteractionLocked = !isPlayerTurn || isProcessingAction || isGenerating;

    // Normalize entities AND Hydrate from Blueprints
    const entitiesList = useMemo(() => {
        if (!currentGameState?.entities) return [];

        const rawEntities = Array.isArray(currentGameState.entities)
            ? currentGameState.entities
            : Object.values(currentGameState.entities);

        const blueprints = currentGameState.blueprints || {};

        return rawEntities.map((e: any) => {
            // If the entity is missing data, try to fill it from blueprint
            const bp = blueprints[e.t];
            return {
                ...e,
                label: e.label || bp?.label || e.id,
                src: e.src || bp?.src || '/placeholder.png', // Fallback
                type: e.type || bp?.type
            };
        });
    }, [currentGameState]);

    const rules = gameStateFromConvex?.rules || "Standard game rules";
    const gameId = gameStateFromConvex?._id;

    const [reachableTiles, setReachableTiles] = useState<Set<string>>(new Set());
    const fastMove = useMutation(api.games.fastMove);

    const resetGame = useMutation(api.games.reset);
    const debugUpdateState = useMutation(api.games.debugUpdateState);

    const [isEditorOpen, setIsEditorOpen] = useState(false);

    const handleSaveGameState = async (newState: any) => {
        if (!gameId) return;
        await debugUpdateState({
            gameId,
            newState
        });
    };

    const load_test = async () => {
        if (!selectedRunId) return;
        setIsGenerating(true);
        try {
            const basePath = `/api/asset-proxy/runs/${selectedRunId}`;
            const res = await fetch(`${basePath}/gamestate.json`);
            if (!res.ok) throw new Error("Gamestate missing");
            const data = await res.json();

            // Handle new ArchitectOutput structure
            let initialState = data;
            if (data.initialState) {
                initialState = data.initialState;
            }


            // Call Convex Mutation to Reset/Load Game
            console.log(`[CLIENT LOAD] Sending content to Convex for run ${selectedRunId}:`, initialState);
            await resetGame({
                initialState: initialState,
                rules: data.rules || "Standard game rules",
                runId: selectedRunId,
                engine_tools: data.engine_tools,
                engine_logic: data.engine_logic
            });

            // Reset local UI state
            setReachableTiles(new Set());
            setChatOptimisticMessage(null);

            // No reload - let Convex subscriptions update the UI
            // window.location.reload(); 

        } catch (e) {
            console.error("Failed to load test run:", e);
            alert("Failed to load run: " + selectedRunId);
        } finally {
            setIsGenerating(false);
        }
    };

    // Transform GameState to SceneManifest
    const manifest: SceneManifest = useMemo(() => {
        // SCENE DIMENSIONS (Matches background.png)
        const SCENE_WIDTH = 1408;
        const SCENE_HEIGHT = 736;

        // Dynamic Source Base Path
        const basePath = `/api/asset-proxy/runs/${selectedRunId}`;

        // Scale factors (Input is 1000x1000 normalized)
        const scaleX = SCENE_WIDTH / 1000;
        const scaleY = SCENE_HEIGHT / 1000;

        const background_url = basePath + '/' + assets.background;

        // 1. Ambience Layer
        const ambience: AssetManifest = {
            id: 'background',
            role: 'BACKGROUND',
            // Use the state URL directly. 
            // Fallback only if the state is brand new/empty.
            src: background_url,
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
            const label = zone.label;

            // Highlight Logic
            const isReachable = reachableTiles.has(label);

            return {
                id: zone.label,
                role: 'ZONE',
                color: isReachable ? '#00FFFF' : '#38bdf8', // Cyan if reachable, Sky 400 otherwise
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
        const actors = entitiesList.map((entity: any): AssetManifest => {
            const SPRITE_SCALE = 1;
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

            // Construct src with proxy path if needed
            let finalSrc = entity.src || '/placeholder.png';
            if (finalSrc && !finalSrc.startsWith('http') && !finalSrc.startsWith('/')) {
                // If relative path (e.g. "extracted/archer.png"), prepend proxy base
                finalSrc = `${basePath}/${finalSrc}`;
            }

            return {
                id: entity.id,
                role: 'SPRITE',
                src: finalSrc,
                initialState: {
                    x: finalX,
                    y: finalY,
                },
                config: {
                    label: entity.label,
                    width: undefined,
                    anchor: 0.5,
                    height: undefined,
                    scale: { x: SPRITE_SCALE, y: SPRITE_SCALE },
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
    }, [currentGameState, navMesh, reachableTiles, selectedRunId, assets.background]);

    // Chat Coordination State
    const [chatOptimisticMessage, setChatOptimisticMessage] = useState<string | null>(null);
    const [chatIsProcessing, setChatIsProcessing] = useState(false);

    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const { sendAction } = useGameEngine();

    const handleAction = async (commandOrEvent: string | object) => {
        try {
            // 1. HANDLE CHAT (String input)
            if (typeof commandOrEvent === 'string' && !commandOrEvent.startsWith('{')) {
                if (isInteractionLocked) return;

                // Construct Chat Command
                const chatAction: UserCommand = {
                    type: "CHAT",
                    description: `Player says: "${commandOrEvent}"`,
                    payload: { text: commandOrEvent }
                };

                await executeCommand(chatAction);
                return;
            }

            // 2. HANDLE SMART SCENE EVENTS (JSON String or Object)
            const event = typeof commandOrEvent === 'string'
                ? JSON.parse(commandOrEvent)
                : commandOrEvent;

            // IGNORE Pick Up (Visual only)
            if (event.type === 'PICK_UP') return;

            // HANDLE MOVE / DROP
            if (event.type === 'MOVE') {
                setReachableTiles(new Set());

                const { entityId, to } = event;
                const entity = entitiesList.find((e: any) => e.id === entityId);
                if (!entity || !to) return;

                // Determine Description based on context (Optional flavor)
                const isCard = entity.type === 'prop' || entity.label.toLowerCase().includes('card');
                const desc = isCard
                    ? `Player plays card ${entity.label} on ${to}`
                    : `Player moves ${entity.label} to ${to}`;

                // CONSTRUCT STRUCTURED COMMAND
                const moveAction: UserCommand = {
                    type: "MOVE",
                    description: desc,
                    payload: {
                        entityId: entityId,
                        targetId: to
                    }
                };

                await executeCommand(moveAction);
            }

        } catch (e) {
            console.error("Failed to parse action:", e);
            setReachableTiles(new Set());
            setRefreshTrigger(p => p + 1);
            setIsProcessingAction(false);
        }
    };

    // Helper to actually send to server
    const executeCommand = async (action: UserCommand) => {
        setIsProcessingAction(true);
        // VISUAL FEEDBACK: Show in chat immediately
        setChatOptimisticMessage(action.description);
        setChatIsProcessing(true);

        try {
            const { processGameMoveAction } = await import("../actions/game-move");
            // PASS THE OBJECT, NOT THE STRING
            // @ts-ignore - We are about to update the server action signature
            const result = await processGameMoveAction(currentGameState, rules as string, action, navMesh);

            if (result.success) {
                result.logs?.forEach((log: any) => console.log("GAME LOG:", log));
            } else {
                console.error("Move failed:", result.error);
                setRefreshTrigger(p => p + 1);
                if (result.error) alert(result.error);
            }
        } finally {
            setIsProcessingAction(false);
            // Clear visual feedback
            setChatOptimisticMessage(null);
            setChatIsProcessing(false);
        }
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) return;

        setIsGenerating(true);
        try {
            // 1. Create a placeholder game entry in Convex (using reset to clear old games)
            // We use a temporary ID or just let reset generate one.
            // But createGameAction needs a gameId.
            // reset returns the new gameId.
            const newGameId = await resetGame({
                initialState: { entities: [] },
                rules: "Generating...",
                status: "generating",
                progress: "Starting..."
            });

            if (!newGameId) throw new Error("Failed to create game");

            // 2. Fire the Server Action
            await createGameAction(prompt, newGameId);

            setPrompt("");

        } catch (e) {
            console.error("Generation failed:", e);
            alert("Generation failed. See console.");
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
                        {isLoadingRuns && <option value="">Loading runs...</option>}
                        {!isLoadingRuns && availableRuns.length === 0 && <option value="">No runs found</option>}
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
                        {showDebug ? "NavMesh" : "NavMesh"}
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            className="px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-600 rounded transition-colors"
                            onClick={load_test}
                            disabled={isGenerating}
                        >
                            Load
                        </button>
                        <button
                            className={`px-3 py-1.5 text-xs font-medium border rounded transition-colors ${isEditorOpen
                                ? "bg-white text-black border-white"
                                : "text-neutral-400 hover:text-white border-neutral-800 hover:border-neutral-600"}`}
                            onClick={() => setIsEditorOpen(true)}
                            disabled={!currentGameState}
                        >
                            Edit State
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
                        <div className="flex items-center gap-4">
                            {/* Turn Indicator */}
                            <div className="flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isPlayerTurn ? "bg-green-500" : "bg-red-500"}`} />
                                <span className="text-[10px] font-mono text-white font-bold uppercase tracking-wider">
                                    {isPlayerTurn ? "YOUR TURN" : "ENEMY TURN"}
                                </span>
                            </div>

                            {/* End Turn Button */}
                            <button
                                onClick={() => handleAction("ACTION: END_TURN")}
                                disabled={isInteractionLocked || !isPlayerTurn}
                                className={`px-3 py-1 text-xs font-bold rounded border transition-all ${isInteractionLocked || !isPlayerTurn
                                    ? "bg-neutral-900 text-neutral-600 border-neutral-800 cursor-not-allowed"
                                    : "bg-neutral-100 text-black border-white hover:bg-neutral-200 active:scale-95"
                                    }`}
                            >
                                {isProcessingAction ? "..." : "End Turn"}
                            </button>
                        </div>
                        <div className="text-[10px] font-mono text-neutral-600">
                            RUN: {selectedRunId}
                        </div>
                    </div>



                    <div className="flex-1 relative overflow-hidden flex items-center justify-center p-8 bg-neutral-950">
                        <div className="relative z-10 w-full h-full border border-neutral-800 rounded bg-black shadow-2xl overflow-hidden flex items-center justify-center">
                            {gameStateFromConvex?.status === 'generating' ? (
                                <div className="flex flex-col items-center justify-center gap-4 animate-in fade-in duration-500">
                                    <div className="w-12 h-12 border-4 border-neutral-800 border-t-white rounded-full animate-spin" />
                                    <div className="space-y-1 text-center">
                                        <h3 className="text-lg font-medium text-white">Generating Game</h3>
                                        <p className="text-sm text-neutral-500 font-mono">
                                            {gameStateFromConvex.progress || "Initializing..."}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <GameErrorBoundary>
                                    <SmartScene
                                        manifest={manifest}
                                        onAction={handleAction}
                                        width={1408}
                                        height={736}
                                        debugZones={showDebug}
                                        refreshTrigger={refreshTrigger}
                                        readOnly={isInteractionLocked} // Pass readOnly prop
                                    />
                                </GameErrorBoundary>
                            )}
                        </div>
                    </div>
                </section >

                <Chat
                    gameId={gameId}
                    currentGameState={currentGameState}
                    gameRules={rules}
                    navMesh={navMesh}
                    className="w-96 border-l border-neutral-800"
                    externalOptimisticMessage={chatOptimisticMessage}
                    externalIsProcessing={chatIsProcessing}
                />
            </main >

            <GameDataEditor
                isOpen={isEditorOpen}
                onClose={() => setIsEditorOpen(false)}
                onSave={handleSaveGameState}
                initialData={currentGameState}
            />
        </div >
    );
}
