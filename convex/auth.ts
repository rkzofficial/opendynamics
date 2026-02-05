import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Seed initial admin user
export const seedAdmin = mutation({
  args: {
    username: v.string(),
    passwordHash: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if any users exist
    const existingUsers = await ctx.db.query("users").first();
    if (existingUsers) {
      throw new Error("Admin user already exists");
    }

    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      username: args.username,
      passwordHash: args.passwordHash,
      name: args.name || "Administrator",
      role: "admin",
      createdAt: now,
      updatedAt: now,
    });

    return userId;
  },
});

// Login - returns user if password matches
export const login = mutation({
  args: {
    username: v.string(),
    passwordHash: v.string(),
    sessionToken: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    if (!user) {
      return null;
    }

    // Password verification should be done on the server side before calling this
    // This function just creates the session after verification
    if (user.passwordHash !== args.passwordHash) {
      return null;
    }

    // Create session
    const now = Date.now();
    await ctx.db.insert("sessions", {
      userId: user._id,
      token: args.sessionToken,
      expiresAt: args.expiresAt,
      createdAt: now,
    });

    return {
      _id: user._id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  },
});

// Validate session
export const validateSession = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session) {
      return null;
    }

    // Check expiration
    if (session.expiresAt < Date.now()) {
      return null;
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      return null;
    }

    return {
      _id: user._id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  },
});

// Logout - delete session
export const logout = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }

    return true;
  },
});

// Get user by username (for password verification on server)
export const getUserByUsername = query({
  args: {
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    if (!user) {
      return null;
    }

    return {
      _id: user._id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
      passwordHash: user.passwordHash,
    };
  },
});

// Get user by email (for signup uniqueness check)
export const getUserByEmail = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      return null;
    }

    return {
      _id: user._id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  },
});

// Create session after OIDC login or password verification
export const createSession = mutation({
  args: {
    userId: v.id("users"),
    sessionToken: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.insert("sessions", {
      userId: args.userId,
      token: args.sessionToken,
      expiresAt: args.expiresAt,
      createdAt: now,
    });

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    return {
      _id: user._id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  },
});

// Clean up expired sessions
export const cleanupExpiredSessions = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expiredSessions = await ctx.db
      .query("sessions")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    for (const session of expiredSessions) {
      await ctx.db.delete(session._id);
    }

    return expiredSessions.length;
  },
});
