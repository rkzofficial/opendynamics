import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ============================================
// OAuth Client Registration (DCR)
// ============================================

export const registerClient = mutation({
  args: {
    clientId: v.string(),
    clientName: v.string(),
    redirectUris: v.array(v.string()),
    grantTypes: v.optional(v.array(v.string())),
    responseTypes: v.optional(v.array(v.string())),
    tokenEndpointAuthMethod: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if client already exists
    const existing = await ctx.db
      .query("oauthClients")
      .withIndex("by_client_id", (q) => q.eq("clientId", args.clientId))
      .first();

    if (existing) {
      return { clientId: existing.clientId, alreadyExists: true };
    }

    const now = Date.now();
    await ctx.db.insert("oauthClients", {
      clientId: args.clientId,
      clientName: args.clientName,
      redirectUris: args.redirectUris,
      grantTypes: args.grantTypes ?? ["authorization_code", "refresh_token"],
      responseTypes: args.responseTypes ?? ["code"],
      tokenEndpointAuthMethod: args.tokenEndpointAuthMethod ?? "none",
      createdAt: now,
      updatedAt: now,
    });

    return { clientId: args.clientId, alreadyExists: false };
  },
});

export const getClient = query({
  args: {
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("oauthClients")
      .withIndex("by_client_id", (q) => q.eq("clientId", args.clientId))
      .first();
  },
});

// ============================================
// Authorization Codes
// ============================================

export const createAuthCode = mutation({
  args: {
    code: v.string(),
    clientId: v.string(),
    userId: v.id("users"),
    redirectUri: v.string(),
    scope: v.string(),
    codeChallenge: v.string(),
    codeChallengeMethod: v.string(),
    state: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const expiresAt = now + 10 * 60 * 1000; // 10 minutes

    await ctx.db.insert("oauthCodes", {
      code: args.code,
      clientId: args.clientId,
      userId: args.userId,
      redirectUri: args.redirectUri,
      scope: args.scope,
      codeChallenge: args.codeChallenge,
      codeChallengeMethod: args.codeChallengeMethod,
      state: args.state,
      expiresAt,
      createdAt: now,
      used: false,
    });

    return { code: args.code, expiresAt };
  },
});

export const getAuthCode = query({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("oauthCodes")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();
  },
});

export const markCodeUsed = mutation({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const authCode = await ctx.db
      .query("oauthCodes")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (!authCode) {
      return { success: false, error: "Code not found" };
    }

    await ctx.db.patch(authCode._id, { used: true });
    return { success: true };
  },
});

// ============================================
// Access/Refresh Tokens
// ============================================

export const createTokens = mutation({
  args: {
    accessToken: v.string(),
    refreshToken: v.string(),
    clientId: v.string(),
    userId: v.id("users"),
    scope: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const accessTokenExpiresAt = now + 60 * 60 * 1000; // 1 hour
    const refreshTokenExpiresAt = now + 30 * 24 * 60 * 60 * 1000; // 30 days

    await ctx.db.insert("oauthTokens", {
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      clientId: args.clientId,
      userId: args.userId,
      scope: args.scope,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
      createdAt: now,
      isRevoked: false,
    });

    return {
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      expiresIn: 3600, // 1 hour in seconds
      tokenType: "Bearer",
    };
  },
});

export const getTokenByAccessToken = query({
  args: {
    accessToken: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("oauthTokens")
      .withIndex("by_access_token", (q) => q.eq("accessToken", args.accessToken))
      .first();
  },
});

export const getTokenByRefreshToken = query({
  args: {
    refreshToken: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("oauthTokens")
      .withIndex("by_refresh_token", (q) => q.eq("refreshToken", args.refreshToken))
      .first();
  },
});

export const revokeToken = mutation({
  args: {
    accessToken: v.string(),
  },
  handler: async (ctx, args) => {
    const token = await ctx.db
      .query("oauthTokens")
      .withIndex("by_access_token", (q) => q.eq("accessToken", args.accessToken))
      .first();

    if (!token) {
      return { success: false, error: "Token not found" };
    }

    await ctx.db.patch(token._id, { isRevoked: true });
    return { success: true };
  },
});

export const revokeTokensByUser = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const tokens = await ctx.db
      .query("oauthTokens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const token of tokens) {
      await ctx.db.patch(token._id, { isRevoked: true });
    }

    return { success: true, count: tokens.length };
  },
});

export const refreshAccessToken = mutation({
  args: {
    refreshToken: v.string(),
    newAccessToken: v.string(),
    newRefreshToken: v.string(),
  },
  handler: async (ctx, args) => {
    const oldToken = await ctx.db
      .query("oauthTokens")
      .withIndex("by_refresh_token", (q) => q.eq("refreshToken", args.refreshToken))
      .first();

    if (!oldToken) {
      return { success: false, error: "Invalid refresh token" };
    }

    if (oldToken.isRevoked) {
      return { success: false, error: "Token has been revoked" };
    }

    if (oldToken.refreshTokenExpiresAt < Date.now()) {
      return { success: false, error: "Refresh token has expired" };
    }

    // Revoke old token
    await ctx.db.patch(oldToken._id, { isRevoked: true });

    // Create new token pair
    const now = Date.now();
    const accessTokenExpiresAt = now + 60 * 60 * 1000; // 1 hour
    const refreshTokenExpiresAt = now + 30 * 24 * 60 * 60 * 1000; // 30 days

    await ctx.db.insert("oauthTokens", {
      accessToken: args.newAccessToken,
      refreshToken: args.newRefreshToken,
      clientId: oldToken.clientId,
      userId: oldToken.userId,
      scope: oldToken.scope,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
      createdAt: now,
      isRevoked: false,
    });

    return {
      success: true,
      accessToken: args.newAccessToken,
      refreshToken: args.newRefreshToken,
      expiresIn: 3600,
      tokenType: "Bearer",
    };
  },
});

// ============================================
// Cleanup expired codes and tokens
// ============================================

export const cleanupExpired = mutation({
  handler: async (ctx) => {
    const now = Date.now();
    let deletedCodes = 0;
    let deletedTokens = 0;

    // Delete expired/used auth codes
    const codes = await ctx.db.query("oauthCodes").collect();
    for (const code of codes) {
      if (code.expiresAt < now || code.used) {
        await ctx.db.delete(code._id);
        deletedCodes++;
      }
    }

    // Delete expired/revoked tokens
    const tokens = await ctx.db.query("oauthTokens").collect();
    for (const token of tokens) {
      if (token.refreshTokenExpiresAt < now || token.isRevoked) {
        await ctx.db.delete(token._id);
        deletedTokens++;
      }
    }

    return { deletedCodes, deletedTokens };
  },
});

// ============================================
// List clients for admin
// ============================================

export const listClients = query({
  handler: async (ctx) => {
    const clients = await ctx.db.query("oauthClients").collect();
    return clients.map((c) => ({
      _id: c._id,
      clientId: c.clientId,
      clientName: c.clientName,
      redirectUris: c.redirectUris,
      createdAt: c.createdAt,
    }));
  },
});

export const deleteClient = mutation({
  args: {
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    const client = await ctx.db
      .query("oauthClients")
      .withIndex("by_client_id", (q) => q.eq("clientId", args.clientId))
      .first();

    if (!client) {
      return { success: false, error: "Client not found" };
    }

    await ctx.db.delete(client._id);
    return { success: true };
  },
});
