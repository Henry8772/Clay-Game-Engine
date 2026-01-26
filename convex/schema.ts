import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    games: defineTable({
        state: v.any(), // The JSON game state object
        rules: v.string(), // Natural language rules
        history: v.optional(v.array(v.object({ role: v.string(), content: v.string() }))), // Deprecated
        isActive: v.boolean(),
    }),
    messages: defineTable({
        gameId: v.id("games"),
        role: v.string(), // "user", "agent", "system"
        content: v.string(),
        timestamp: v.number(),
    }).index("by_gameId", ["gameId"]),
});
