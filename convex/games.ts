import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get the current active game (single singleton game for now)
export const get = query({
    args: {},
    handler: async (ctx) => {
        // Return the most recently updated active game, or null
        const game = await ctx.db.query("games")
            .filter(q => q.eq(q.field("isActive"), true))
            .order("desc") // default order by creation usually suffices or add index
            .first();
        return game;
    },
});

// Seed/Reset the game
export const reset = mutation({
    args: {
        initialState: v.any(),
        rules: v.string(),
    },
    handler: async (ctx, args) => {
        // Deactivate all old games
        const oldGames = await ctx.db.query("games").filter(q => q.eq(q.field("isActive"), true)).collect();
        for (const game of oldGames) {
            await ctx.db.patch(game._id, { isActive: false });
        }

        // Create new game
        const gameId = await ctx.db.insert("games", {
            state: args.initialState,
            rules: args.rules,
            history: [],
            isActive: true,
        });
        return gameId;
    },
});

// Update the game state and append to history
export const updateState = mutation({
    args: {
        gameId: v.id("games"),
        newState: v.any(),
        summary: v.string(),
        role: v.string(), // "user" or "agent"
        command: v.string() // The text causing this update
    },
    handler: async (ctx, args) => {
        const game = await ctx.db.get(args.gameId);
        if (!game) throw new Error("Game not found");

        // Add user command to history if any
        const newHistory = [...game.history];
        if (args.command) {
            newHistory.push({ role: "user", content: args.command });
        }
        // Add agent summary
        newHistory.push({ role: "agent", content: args.summary });

        await ctx.db.patch(args.gameId, {
            state: args.newState,
            history: newHistory
        });
    }
});
