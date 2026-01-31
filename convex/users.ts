import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// List all users (admin only - authorization done on server)
export const list = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.map((user) => ({
      _id: user._id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));
  },
});

// Get user by ID
export const getById = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return null;
    }
    return {
      _id: user._id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  },
});

// Create user
export const create = mutation({
  args: {
    username: v.string(),
    passwordHash: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("user")),
  },
  handler: async (ctx, args) => {
    // Check if username already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    if (existing) {
      throw new Error("Username already exists");
    }

    // Check if email already exists (if provided)
    if (args.email) {
      const existingEmail = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", args.email))
        .first();

      if (existingEmail) {
        throw new Error("Email already exists");
      }
    }

    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      username: args.username,
      passwordHash: args.passwordHash,
      email: args.email,
      name: args.name,
      role: args.role,
      createdAt: now,
      updatedAt: now,
    });

    return userId;
  },
});

// Update user
export const update = mutation({
  args: {
    userId: v.id("users"),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    role: v.optional(v.union(v.literal("admin"), v.literal("user"))),
    passwordHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if email already exists (if being changed)
    if (args.email && args.email !== user.email) {
      const existingEmail = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", args.email))
        .first();

      if (existingEmail) {
        throw new Error("Email already exists");
      }
    }

    const updates: Partial<typeof user> = {
      updatedAt: Date.now(),
    };

    if (args.email !== undefined) updates.email = args.email;
    if (args.name !== undefined) updates.name = args.name;
    if (args.role !== undefined) updates.role = args.role;
    if (args.passwordHash !== undefined) updates.passwordHash = args.passwordHash;

    await ctx.db.patch(args.userId, updates);

    return args.userId;
  },
});

// Delete user
export const remove = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Delete all sessions for this user
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }

    // Delete Dynamics tokens for this user
    const tokens = await ctx.db
      .query("dynamicsTokens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const token of tokens) {
      await ctx.db.delete(token._id);
    }

    // Delete the user
    await ctx.db.delete(args.userId);

    return true;
  },
});

// Count users
export const count = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.length;
  },
});
