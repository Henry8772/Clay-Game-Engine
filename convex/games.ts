import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get the current active game (single singleton game for now)
// Get the current active game (single singleton game for now)
export const get = query({
    args: { id: v.optional(v.id("games")) },
    handler: async (ctx, args) => {
        if (args.id) {
            return await ctx.db.get(args.id);
        }
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
        engine_tools: v.optional(v.any()), // <--- NEW
        engine_logic: v.optional(v.string()), // <--- NEW
        status: v.optional(v.string()), // <--- NEW
        progress: v.optional(v.string()) // <--- NEW
    },
    handler: async (ctx, args) => {
        console.log(`[GAME RESET] Loading run: ${args.runId}`);
        const entityCount = args.initialState?.entities
            ? (Array.isArray(args.initialState.entities) ? args.initialState.entities.length : Object.keys(args.initialState.entities).length)
            : 0;
        console.log(`[GAME RESET] Content check: ${entityCount} entities loaded from state.`);


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
            engine_tools: args.engine_tools,
            engine_logic: args.engine_logic,
            status: args.status || "playing", // Default to playing if not specified (legacy resets)
            progress: args.progress,
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
        command: v.string(), // The text causing this update
        logs: v.optional(v.any()) // Structured logs
    },
    handler: async (ctx, args) => {
        const game = await ctx.db.get(args.gameId);
        if (!game) throw new Error("Game not found");

        // Insert user/agent command into messages table
        if (args.command) {
            await ctx.db.insert("messages", {
                gameId: args.gameId,
                role: args.role, // Use the passed role (user or assistant)
                content: args.command,
                type: "chat",
                timestamp: Date.now() - 1 // ensure slightly before agent
            });
        }

        // Insert system summary into messages table
        await ctx.db.insert("messages", {
            gameId: args.gameId,
            role: "system", // Use 'system' for game logs
            content: args.summary,
            type: "chat",
            timestamp: Date.now(),
            data: {
                logs: args.logs
            }
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

        if (Array.isArray(entities)) {
            const entityIndex = entities.findIndex((e: any) => e.id === args.entityId);

            if (entityIndex === -1) {
                console.error(`Entity ${args.entityId} not found in state`);
                return; // Or throw
            }

            // Update the specific entity
            entities[entityIndex].pixel_box = args.newPixelBox;
        } else {
            // Assume object keyed by ID
            if (!entities[args.entityId]) {
                console.error(`Entity ${args.entityId} not found in state`);
                return;
            }
            entities[args.entityId].pixel_box = args.newPixelBox;
        }

        // Save back
        await ctx.db.patch(args.gameId, {
            state: {
                ...currentState,
                entities: entities
            }
        });
    }
});

export const updateStatus = mutation({
    args: {
        gameId: v.id("games"),
        status: v.string(),
        progress: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.gameId, {
            status: args.status,
            progress: args.progress
        });
    }
});

export const debugUpdateState = mutation({
    args: {
        gameId: v.id("games"),
        newState: v.any(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.gameId, {
            state: args.newState,
        });
    }
});

export const applyModification = mutation({
    args: {
        gameId: v.id("games"),
        newState: v.any(),        // The complete new JSON state
        logMessage: v.string(),   // The message to show in chat (e.g. "Spawned 3 Orcs")
        command: v.string(),      // The original user prompt
    },
    handler: async (ctx, args) => {
        const { gameId, newState, logMessage, command } = args;

        // 1. Overwrite the Game State
        await ctx.db.patch(gameId, {
            state: newState,
        });

        // 2. Insert the System Log for the Chat UI
        await ctx.db.insert("messages", {
            gameId,
            role: "system", // 'system' renders differently in UI (usually centered/gray)
            content: `[GOD MODE] ${logMessage}`,
            data: {
                command: command,
                subType: "modification_log"
            },
            timestamp: Date.now()
        });
    },
});
