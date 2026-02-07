import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    games: defineTable({
        state: v.any(), // The JSON game state object
        rules: v.string(), // Natural language rules
        engine_tools: v.optional(v.any()), // Dynamic tool definitions
        engine_logic: v.optional(v.string()), // Dynamic logic guide
        history: v.optional(v.array(v.object({ role: v.string(), content: v.string() }))), // Deprecated
        isActive: v.boolean(),
        runId: v.optional(v.string()), // <--- NEW: Link to backend/data/runs/{runId}
        status: v.string(), // "idle" | "generating" | "playing" | "failed"
        progress: v.optional(v.string()), // e.g., "Generating Sprites..."
        username: v.optional(v.string()), // Username of the user who created this game
    }).index("by_username_active", ["username", "isActive"]),
    messages: defineTable({
        gameId: v.id("games"),
        role: v.string(), // "user", "agent", "system"
        type: v.optional(v.string()), // "chat", "system", "battle" - defaults to "chat" if undefined
        content: v.string(),
        timestamp: v.number(),
        data: v.optional(v.any()), // Extra data for specialized logs (e.g. relatedEntityId)
    }).index("by_gameId", ["gameId"]),
    users: defineTable({
        username: v.string(),
        apiKey: v.string(), // The actual API key (stored server-side)
        authId: v.string(), // Link to authenticated user identity (from convex-auth)
        createdAt: v.number(),
        lastUsedAt: v.optional(v.number()),
        isActive: v.boolean(),
    }).index("by_username", ["username"])
        .index("by_authId", ["authId"]),
});
