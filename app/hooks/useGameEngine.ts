import { useState, useCallback } from 'react';
import { processGameMoveAction } from '../actions/game-move'; // We might need to update this signature or create a new action
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useGameEngine() {
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const gameStateFromConvex = useQuery(api.games.get);
    const currentState = gameStateFromConvex?.state;
    const rules = gameStateFromConvex?.rules || "";

    //TODO: load navmesh from convex, not let frotnend pass it
    const sendAction = useCallback(async (action: string, navMesh: any[]) => {
        setIsProcessing(true);
        setError(null);
        try {
            let command = action;

            const result = await processGameMoveAction(currentState, rules, command, navMesh);

            if (!result.success) {
                setError(result.error || "Unknown error");
                console.error("Action failed:", result.error);
            }
            return result;

        } catch (e: any) {
            setError(e.message);
            console.error("Hook error:", e);
        } finally {
            setIsProcessing(false);
        }
    }, [currentState, rules]);

    return {
        sendAction,
        isProcessing,
        error
    };
}
