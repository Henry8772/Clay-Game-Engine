import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Store API key
export const storeKey = mutation({
    args: {
        apiKey: v.string(),
    },
    handler: async (ctx, args) => {
        // Check if this key already exists
        const existing = await ctx.db
            .query("apiKeys")
            .filter(q => q.eq(q.field("key"), args.apiKey))
            .first();

        if (existing) {
            // Update last used time
            await ctx.db.patch(existing._id, {
                lastUsedAt: Date.now(),
            });
            return { success: true, id: existing._id };
        }

        // Store new key
        const id = await ctx.db.insert("apiKeys", {
            key: args.apiKey,
            keyHash: "", // deprecated, keeping for schema compatibility
            createdAt: Date.now(),
            lastUsedAt: Date.now(),
            isActive: true,
        });

        return { success: true, id };
    },
});

// Get the most recently used API key
export const getLatestKey = query({
    handler: async (ctx) => {
        const key = await ctx.db
            .query("apiKeys")
            .filter(q => q.eq(q.field("isActive"), true))
            .order("desc") // Most recent first
            .first();

        return key ? key.key : null;
    },
});

// Get key validation status (doesn't expose the actual key)
export const getKeyStatus = query({
    args: {
        key: v.string(),
    },
    handler: async (ctx, args) => {
        const entry = await ctx.db
            .query("apiKeys")
            .filter(q => q.eq(q.field("key"), args.key))
            .first();

        return entry ? { isValid: true, createdAt: entry.createdAt } : { isValid: false };
    },
});

