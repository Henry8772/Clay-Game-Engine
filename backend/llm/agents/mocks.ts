import { GameStateList } from "../../models/game_state";

export const mockGameStateExtraction = (): GameStateList => ({
    states: [
        {
            name: "score",
            description: "Current player score",
            type: "integer",
            initialValue: 0,
        },
        {
            name: "isGameOver",
            description: "Flag to indicate if the game has ended",
            type: "boolean",
            initialValue: false,
        },
        {
            name: "inventory",
            description: "List of items held by the player",
            type: "array",
            initialValue: null, // or []
        },
    ],
});
