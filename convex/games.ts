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
        runId: v.optional(v.string()), // <--- NEW
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
            isActive: true,
            runId: args.runId, // <--- NEW
        });

        // No initial history needed for now, or could insert a system message
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

        // Insert user command into messages table
        if (args.command) {
            await ctx.db.insert("messages", {
                gameId: args.gameId,
                role: "user",
                content: args.command,
                timestamp: Date.now() - 1 // ensure slightly before agent
            });
        }

        // Insert agent summary into messages table
        await ctx.db.insert("messages", {
            gameId: args.gameId,
            role: "agent",
            content: args.summary,
            timestamp: Date.now()
        });

        await ctx.db.patch(args.gameId, {
            state: args.newState,
        });
    }
});

export const fastMove = mutation({
    args: {
        gameId: v.id("games"),
        entityId: v.string(),
        newPixelBox: v.array(v.number()), // [ymin, xmin, ymax, xmax]
    },
    handler: async (ctx, args) => {
        const game = await ctx.db.get(args.gameId);
        if (!game) throw new Error("Game not found");

        const currentState = game.state;
        if (!currentState || !currentState.entities) {
            throw new Error("Invalid game state");
        }

        const entities = currentState.entities;
        const entityIndex = entities.findIndex((e: any) => e.id === args.entityId);

        if (entityIndex === -1) {
            console.error(`Entity ${args.entityId} not found in state`);
            return; // Or throw
        }

        // Update the specific entity
        entities[entityIndex].pixel_box = args.newPixelBox;

        // Save back
        await ctx.db.patch(args.gameId, {
            state: {
                ...currentState,
                entities: entities // This works because we mutated the array reference or created a new one if we were careful, but here we likely need to be careful about immutability if Convex cares, but usually assigning the modified object is fine. simpler to clone if needed.
                // JS objects are references. `entities` is a reference to the array in `currentState`.
                // Modifying `entities[index]` modifies `currentState`.
                // So passing `currentState` back is fine.
            }
        });
    }
});
