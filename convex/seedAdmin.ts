import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Seed admin script - run with: bunx convex run seedAdmin:seed
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if any users exist
    const existingUsers = await ctx.db.query("users").first();
    if (existingUsers) {
      console.log("Admin user already exists");
      return { success: false, message: "Admin user already exists" };
    }

    // Create admin user with default password "admin"
    // Password hash for "admin" (bcrypt)
    const passwordHash = "$2b$10$/u.Pe/jpQEdhSYAZ7FuVMeKk0OSaJ/c81x0qHLKStpmkxOnHZkLtG";

    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      username: "admin",
      passwordHash: passwordHash,
      name: "Administrator",
      role: "admin",
      createdAt: now,
      updatedAt: now,
    });

    console.log("Admin user created with ID:", userId);
    console.log("Username: admin");
    console.log("Password: admin");
    console.log("IMPORTANT: Change the password after first login!");

    return {
      success: true,
      userId,
      message: "Admin user created. Username: admin, Password: admin",
    };
  },
});
