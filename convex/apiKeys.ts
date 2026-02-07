import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "./auth";

// Store user with API key
export const storeKey = mutation({
    args: {
        username: v.string(),
        apiKey: v.string(),
    },
    handler: async (ctx, args) => {
        // Validate inputs
        if (!args.username.trim()) {
            throw new Error("Username is required");
        }
        if (!args.apiKey.startsWith("AIza")) {
            throw new Error("Invalid API key format");
        }

        // Check if username is already taken
        const existingByUsername = await ctx.db
            .query("users")
            .withIndex("by_username", q => q.eq("username", args.username))
            .first();

        if (existingByUsername) {
            throw new Error(`Username '${args.username}' is already taken. Please choose a different username.`);
        }

        // Store new user with API key
        const id = await ctx.db.insert("users", {
            username: args.username,
            apiKey: args.apiKey,
            authId: "", // No auth required for now
            createdAt: Date.now(),
            lastUsedAt: Date.now(),
            isActive: true,
        });

        return { success: true, id, username: args.username };
    },
});

// Get API key for a user by username
export const getKeyForCurrentUser = query({
    args: {
        username: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_username", q => q.eq("username", args.username))
            .first();

        if (!user || !user.isActive) {
            return null;
        }

        return user.apiKey;
    },
});

// Get API key by username (for reference)
export const getKeyByUsername = query({
    args: {
        username: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_username", q => q.eq("username", args.username))
            .first();

        if (!user || !user.isActive) {
            return null;
        }

        return user.apiKey;
    },
});

// Check if username exists
export const checkUsernameExists = query({
    args: {
        username: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_username", q => q.eq("username", args.username))
            .first();

        return !!user;
    },
});

