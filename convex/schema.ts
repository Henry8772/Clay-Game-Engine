import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    games: defineTable({
        state: v.any(), // The JSON game state object
        rules: v.string(), // Natural language rules
        history: v.optional(v.array(v.object({ role: v.string(), content: v.string() }))), // Deprecated
        isActive: v.boolean(),
        runId: v.optional(v.string()), // <--- NEW: Link to backend/data/runs/{runId}
    }),
    messages: defineTable({
        gameId: v.id("games"),
        role: v.string(), // "user", "agent", "system"
        content: v.string(),
        timestamp: v.number(),
    }).index("by_gameId", ["gameId"]),
    system_events: defineTable({
        gameId: v.id("games"),
        content: v.string(), // The log message
        type: v.optional(v.string()), // e.g. "info", "warning", "error"
        timestamp: v.number(),
    }).index("by_gameId", ["gameId"]),
    battle_events: defineTable({
        gameId: v.id("games"),
        content: v.string(),
        relatedEntityId: v.optional(v.string()), // Optional: link to specific entity log
        timestamp: v.number(),
    }).index("by_gameId", ["gameId"]),
});
