import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new share link for a case
export const create = mutation({
  args: {
    caseId: v.string(),
    userId: v.id("users"),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Generate a unique share token
    const shareToken = crypto.randomUUID();

    const id = await ctx.db.insert("caseShares", {
      shareToken,
      caseId: args.caseId,
      userId: args.userId,
      createdAt: Date.now(),
      expiresAt: args.expiresAt,
      isRevoked: false,
      viewCount: 0,
    });

    const share = await ctx.db.get(id);
    return share;
  },
});

// Get share by token (for public access)
export const getByToken = query({
  args: {
    shareToken: v.string(),
  },
  handler: async (ctx, args) => {
    const share = await ctx.db
      .query("caseShares")
      .withIndex("by_token", (q) => q.eq("shareToken", args.shareToken))
      .first();

    if (!share) {
      return null;
    }

    // Check if revoked
    if (share.isRevoked) {
      return { error: "revoked" as const };
    }

    // Check if expired
    if (share.expiresAt && share.expiresAt < Date.now()) {
      return { error: "expired" as const };
    }

    return {
      _id: share._id,
      shareToken: share.shareToken,
      caseId: share.caseId,
      userId: share.userId,
      createdAt: share.createdAt,
      expiresAt: share.expiresAt,
      viewCount: share.viewCount,
    };
  },
});

// Record a view for analytics
export const recordView = mutation({
  args: {
    shareToken: v.string(),
  },
  handler: async (ctx, args) => {
    const share = await ctx.db
      .query("caseShares")
      .withIndex("by_token", (q) => q.eq("shareToken", args.shareToken))
      .first();

    if (!share) {
      return false;
    }

    await ctx.db.patch(share._id, {
      viewCount: share.viewCount + 1,
    });

    return true;
  },
});

// Get all shares for a case (for the case owner)
export const getForCase = query({
  args: {
    caseId: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const shares = await ctx.db
      .query("caseShares")
      .withIndex("by_case_user", (q) =>
        q.eq("caseId", args.caseId).eq("userId", args.userId)
      )
      .collect();

    // Filter out revoked shares and return sorted by creation date
    return shares
      .filter((s) => !s.isRevoked)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Revoke a share
export const revoke = mutation({
  args: {
    shareId: v.id("caseShares"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const share = await ctx.db.get(args.shareId);

    if (!share) {
      return { success: false, error: "Share not found" };
    }

    // Verify ownership
    if (share.userId !== args.userId) {
      return { success: false, error: "Not authorized" };
    }

    await ctx.db.patch(args.shareId, {
      isRevoked: true,
    });

    return { success: true };
  },
});

// Get share by ID (for deletion/management)
export const getById = query({
  args: {
    shareId: v.id("caseShares"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.shareId);
  },
});
