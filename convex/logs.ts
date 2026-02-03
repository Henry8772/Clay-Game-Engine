import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// --- SYSTEM EVENTS ---

export const listSystem = query({
    args: { gameId: v.optional(v.id("games")) },
    handler: async (ctx, args) => {
        if (!args.gameId) return [];
        return await ctx.db
            .query("messages")
            .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId!))
            .filter(q => q.eq(q.field("type"), "system"))
            .order("desc") // Newest first for logs usually
            .take(100);
    },
});

export const logSystem = mutation({
    args: {
        gameId: v.id("games"),
        content: v.string(),
        type: v.optional(v.string()), // "info", "warning", "error" kept as subtype or just part of content? 
        // Schema update: "data" field could store the subtype.
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("messages", {
            gameId: args.gameId,
            role: "system",
            type: "system",
            content: args.content,
            data: { subType: args.type },
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
            .query("messages")
            .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId!))
            .filter(q => q.eq(q.field("type"), "battle"))
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
        await ctx.db.insert("messages", {
            gameId: args.gameId,
            role: "system",
            type: "battle",
            content: args.content,
            data: { relatedEntityId: args.relatedEntityId },
            timestamp: Date.now(),
        });
    },
});

export const clearAll = mutation({
    args: { gameId: v.id("games") },
    handler: async (ctx, args) => {
        const msgs = await ctx.db.query("messages").withIndex("by_gameId", q => q.eq("gameId", args.gameId)).collect();
        for (const m of msgs) await ctx.db.delete(m._id);
    }
});
