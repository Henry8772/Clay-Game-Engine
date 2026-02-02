import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// --- SYSTEM EVENTS ---

export const listSystem = query({
    args: { gameId: v.optional(v.id("games")) },
    handler: async (ctx, args) => {
        if (!args.gameId) return [];
        return await ctx.db
            .query("system_events")
            .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId!))
            .order("desc") // Newest first for logs usually
            .take(100);
    },
});

export const logSystem = mutation({
    args: {
        gameId: v.id("games"),
        content: v.string(),
        type: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("system_events", {
            gameId: args.gameId,
            content: args.content,
            type: args.type,
            timestamp: Date.now(),
        });
    },
});

// --- BATTLE EVENTS ---

export const listBattle = query({
    args: { gameId: v.optional(v.id("games")) },
    handler: async (ctx, args) => {
        if (!args.gameId) return [];
        return await ctx.db
            .query("battle_events")
            .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId!))
            .order("desc")
            .take(100);
    },
});

export const logBattle = mutation({
    args: {
        gameId: v.id("games"),
        content: v.string(),
        relatedEntityId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("battle_events", {
            gameId: args.gameId,
            content: args.content,
            relatedEntityId: args.relatedEntityId,
            timestamp: Date.now(),
        });
    },
});

export const clearAll = mutation({
    args: { gameId: v.id("games") },
    handler: async (ctx, args) => {
        const sys = await ctx.db.query("system_events").withIndex("by_gameId", q => q.eq("gameId", args.gameId)).collect();
        for (const s of sys) await ctx.db.delete(s._id);

        const bat = await ctx.db.query("battle_events").withIndex("by_gameId", q => q.eq("gameId", args.gameId)).collect();
        for (const b of bat) await ctx.db.delete(b._id);
    }
});
