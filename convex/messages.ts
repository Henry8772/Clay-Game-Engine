import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
    args: { gameId: v.optional(v.id("games")) },
    handler: async (ctx, args) => {
        if (!args.gameId) return [];

        return await ctx.db
            .query("messages")
            .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId!))
            .order("asc")
            .collect();
    },
});

export const send = mutation({
    args: {
        gameId: v.id("games"),
        role: v.string(),
        content: v.string(),
        type: v.optional(v.string()),
        data: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("messages", {
            gameId: args.gameId,
            role: args.role,
            content: args.content,
            type: args.type || "chat",
            timestamp: Date.now(),
            data: args.data,
        });
    },
});

export const clear = mutation({
    args: { gameId: v.id("games") },
    handler: async (ctx, args) => {
        const messages = await ctx.db
            .query("messages")
            .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
            .collect();

        for (const msg of messages) {
            await ctx.db.delete(msg._id);
        }
    }
});
