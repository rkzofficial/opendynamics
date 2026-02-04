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

  // API Keys (for MCP server access)
  apiKeys: defineTable({
    userId: v.id("users"),
    name: v.string(),
    keyHash: v.string(),
    keyPrefix: v.string(),
    lastUsedAt: v.optional(v.number()),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
    isRevoked: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_prefix", ["keyPrefix"]),

  // OAuth Clients (supports Dynamic Client Registration with UUID client IDs)
  oauthClients: defineTable({
    clientId: v.string(), // UUID format for ChatGPT DCR
    clientSecret: v.optional(v.string()), // Optional - public clients use PKCE
    clientName: v.string(),
    redirectUris: v.array(v.string()),
    grantTypes: v.array(v.string()), // authorization_code, refresh_token
    responseTypes: v.array(v.string()), // code
    tokenEndpointAuthMethod: v.string(), // none, client_secret_post
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_client_id", ["clientId"]),

  // OAuth Authorization Codes (10 minute expiry, stores PKCE challenge)
  oauthCodes: defineTable({
    code: v.string(), // 32-byte random, base64url encoded
    clientId: v.string(),
    userId: v.id("users"),
    redirectUri: v.string(),
    scope: v.string(),
    codeChallenge: v.string(), // PKCE challenge
    codeChallengeMethod: v.string(), // S256
    state: v.optional(v.string()),
    expiresAt: v.number(), // 10 minute expiry
    createdAt: v.number(),
    used: v.boolean(),
  })
    .index("by_code", ["code"]),

  // OAuth Access/Refresh Tokens (1hr access / 30 day refresh expiry)
  oauthTokens: defineTable({
    accessToken: v.string(), // oat_ + 40 random chars
    refreshToken: v.string(), // ort_ + 40 random chars
    clientId: v.string(),
    userId: v.id("users"),
    scope: v.string(),
    accessTokenExpiresAt: v.number(), // 1 hour
    refreshTokenExpiresAt: v.number(), // 30 days
    createdAt: v.number(),
    isRevoked: v.boolean(),
  })
    .index("by_access_token", ["accessToken"])
    .index("by_refresh_token", ["refreshToken"])
    .index("by_user", ["userId"]),
});
