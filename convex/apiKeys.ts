import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new API key (returns the key ID - full key is generated server-side)
export const create = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    keyHash: v.string(),
    keyPrefix: v.string(),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("apiKeys", {
      userId: args.userId,
      name: args.name,
      keyHash: args.keyHash,
      keyPrefix: args.keyPrefix,
      createdAt: Date.now(),
      expiresAt: args.expiresAt,
      isRevoked: false,
    });

    return id;
  },
});

// List all API keys for a user (returns prefix only, not full key)
export const list = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const keys = await ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Filter out revoked keys and return safe fields (no hash)
    return keys
      .filter((k) => !k.isRevoked)
      .map((k) => ({
        _id: k._id,
        name: k.name,
        keyPrefix: k.keyPrefix,
        createdAt: k.createdAt,
        expiresAt: k.expiresAt,
        lastUsedAt: k.lastUsedAt,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Revoke an API key
export const revoke = mutation({
  args: {
    keyId: v.id("apiKeys"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const key = await ctx.db.get(args.keyId);

    if (!key) {
      return { success: false, error: "API key not found" };
    }

    // Verify ownership
    if (key.userId !== args.userId) {
      return { success: false, error: "Not authorized" };
    }

    await ctx.db.patch(args.keyId, {
      isRevoked: true,
    });

    return { success: true };
  },
});

// Get API key record by prefix (for validation)
export const getByPrefix = query({
  args: {
    prefix: v.string(),
  },
  handler: async (ctx, args) => {
    const key = await ctx.db
      .query("apiKeys")
      .withIndex("by_prefix", (q) => q.eq("keyPrefix", args.prefix))
      .first();

    if (!key) {
      return null;
    }

    return {
      _id: key._id,
      userId: key.userId,
      keyHash: key.keyHash,
      isRevoked: key.isRevoked,
      expiresAt: key.expiresAt,
    };
  },
});

// Record API key usage (update lastUsedAt timestamp)
export const recordUsage = mutation({
  args: {
    keyId: v.id("apiKeys"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.keyId, {
      lastUsedAt: Date.now(),
    });
  },
});

// Get API key by ID (for management)
export const getById = query({
  args: {
    keyId: v.id("apiKeys"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.keyId);
  },
});
