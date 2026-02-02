import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table
  users: defineTable({
    username: v.string(),
    email: v.optional(v.string()),
    passwordHash: v.string(),
    name: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("user")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_username", ["username"])
    .index("by_email", ["email"]),

  // Sessions table
  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"]),

  // App Settings (key-value for OIDC, Dynamics global config)
  settings: defineTable({
    key: v.string(),
    value: v.string(), // JSON stringified (optionally encrypted)
    updatedBy: v.optional(v.id("users")),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  // Dynamics Tokens (per-user)
  dynamicsTokens: defineTable({
    userId: v.id("users"),
    accessToken: v.string(), // encrypted
    refreshToken: v.string(), // encrypted
    expiresAt: v.number(),
    email: v.optional(v.string()),
    organizationId: v.optional(v.string()),
    dynamicsUserId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // Case Shares (public shareable links)
  caseShares: defineTable({
    shareToken: v.string(),
    caseId: v.string(),
    userId: v.id("users"),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
    isRevoked: v.boolean(),
    viewCount: v.number(),
  })
    .index("by_token", ["shareToken"])
    .index("by_case_user", ["caseId", "userId"]),
});
