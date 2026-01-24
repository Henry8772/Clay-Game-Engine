import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    games: defineTable({
        state: v.any(), // The JSON game state object
        rules: v.string(), // Natural language rules
        history: v.array(v.object({ role: v.string(), content: v.string() })), // Chat history
        isActive: v.boolean(),
    }),
});
