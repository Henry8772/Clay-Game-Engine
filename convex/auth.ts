import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get authenticated user ID - returns the current user's identity
// Returns null if not authenticated
export async function getAuthUserId(ctx: any): Promise<string | null> {
    const identity = await ctx.auth.getUserIdentity();
    return identity?.subject || null;
}
