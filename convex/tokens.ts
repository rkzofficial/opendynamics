import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get Dynamics token for user
export const getForUser = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const token = await ctx.db
      .query("dynamicsTokens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!token) {
      return null;
    }

    return {
      _id: token._id,
      userId: token.userId,
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: token.expiresAt,
      email: token.email,
      organizationId: token.organizationId,
      dynamicsUserId: token.dynamicsUserId,
    };
  },
});

// Save/update Dynamics token for user
export const save = mutation({
  args: {
    userId: v.id("users"),
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresAt: v.number(),
    email: v.optional(v.string()),
    organizationId: v.optional(v.string()),
    dynamicsUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("dynamicsTokens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        expiresAt: args.expiresAt,
        email: args.email,
        organizationId: args.organizationId,
        dynamicsUserId: args.dynamicsUserId,
        updatedAt: now,
      });
      return existing._id;
    } else {
      const id = await ctx.db.insert("dynamicsTokens", {
        userId: args.userId,
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        expiresAt: args.expiresAt,
        email: args.email,
        organizationId: args.organizationId,
        dynamicsUserId: args.dynamicsUserId,
        createdAt: now,
        updatedAt: now,
      });
      return id;
    }
  },
});

// Delete Dynamics token for user
export const remove = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("dynamicsTokens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    return true;
  },
});

// Check if user has valid (non-expired) token
export const hasValidToken = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const token = await ctx.db
      .query("dynamicsTokens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!token) {
      return false;
    }

    // Check if token is expired (with 5 minute buffer)
    return token.expiresAt > Date.now() + 5 * 60 * 1000;
  },
});

// Get connection status for user
export const getConnectionStatus = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const token = await ctx.db
      .query("dynamicsTokens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!token) {
      return {
        connected: false,
      };
    }

    return {
      connected: true,
      email: token.email,
      organizationId: token.organizationId,
      expiresAt: token.expiresAt,
    };
  },
});

// Get all users with Dynamics tokens (for admin)
export const getUsersWithTokens = query({
  args: {},
  handler: async (ctx) => {
    const tokens = await ctx.db.query("dynamicsTokens").collect();
    
    const usersWithTokens = [];
    
    for (const token of tokens) {
      const user = await ctx.db.get(token.userId);
      if (user) {
        usersWithTokens.push({
          _id: user._id,
          username: user.username,
          name: user.name,
          email: token.email || user.email,
          role: user.role,
          connected: true,
          expiresAt: token.expiresAt,
        });
      }
    }
    
    return usersWithTokens;
  },
});
