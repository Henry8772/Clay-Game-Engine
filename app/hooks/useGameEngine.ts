import { useState, useCallback } from 'react';
import { processGameMoveAction } from '../actions/game-move'; // We might need to update this signature or create a new action
import { GameAction } from '../../backend/llm/agents/universal_state_types';
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useGameEngine() {
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // TODO: Ideally pass these in or useContext, but for now reusing logic from page.tsx
    const gameStateFromConvex = useQuery(api.games.get);
    const currentState = gameStateFromConvex?.state;
    const rules = gameStateFromConvex?.rules || "";
    // NavMesh is currently fetched via proxy in page.tsx, we might need to elevate that or pass it in.

    // For now, we'll ask the caller to pass the necessary context to sendAction
    // or we assume the Action contains everything needed? NO, the backend needs state.
    // The Server Action `processGameMoveAction` fetches state from DB.

    const sendAction = useCallback(async (action: GameAction, navMesh: any[]) => {
        setIsProcessing(true);
        setError(null);
        try {
            // Convert GameAction to legacy parameters expected by processGameMoveAction
            // OR refactor processGameMoveAction to accept GameAction.

            // For transition, let's refactor processGameMoveAction to accept structured Action.
            // But we can't change it yet. So we do a temporary translation here or creating a NEW action.

            // Wait, processGameMoveAction takes (currentState, rules, command, navMesh).
            // But it refetches activeGame from DB to update it.
            // It uses `currentState` passed from frontend for the calculation?
            // Yes: `const result = await processGameMove(..., currentState, ...)`

            // Translating Action to Command for legacy support until we update the server action
            let command = "";
            const p = action.payload;
            if (action.type === "MOVE") {
                command = `Move entity ${p.entityId} to ${p.targetLocation || p.targetId}`;
            } else if (action.type === "ATTACK") {
                command = `Entity ${p.entityId} attacks ${p.targetId}`;
            } else {
                command = JSON.stringify(action);
            }

            // Call the existing Server Action
            // Note: In the future, we should pass the Action object directly.
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
