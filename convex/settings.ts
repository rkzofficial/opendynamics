import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get setting by key
export const get = query({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const setting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (!setting) {
      return null;
    }

    return {
      key: setting.key,
      value: setting.value,
      updatedAt: setting.updatedAt,
    };
  },
});

// Set setting
export const set = mutation({
  args: {
    key: v.string(),
    value: v.string(),
    updatedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        updatedBy: args.updatedBy,
        updatedAt: now,
      });
      return existing._id;
    } else {
      const id = await ctx.db.insert("settings", {
        key: args.key,
        value: args.value,
        updatedBy: args.updatedBy,
        updatedAt: now,
      });
      return id;
    }
  },
});

// Delete setting
export const remove = mutation({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    return true;
  },
});

// Get multiple settings by keys
export const getMultiple = query({
  args: {
    keys: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const results: Record<string, string | null> = {};

    for (const key of args.keys) {
      const setting = await ctx.db
        .query("settings")
        .withIndex("by_key", (q) => q.eq("key", key))
        .first();

      results[key] = setting?.value ?? null;
    }

    return results;
  },
});
