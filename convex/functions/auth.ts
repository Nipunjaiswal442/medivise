import { query, mutation } from "convex/server";
import { v } from "convex/values";

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("firebaseUid"), identity.subject))
      .unique();
    return user;
  },
});

export const createOrUpdateUser = mutation({
  args: {
    firebaseUid: v.string(),
    email: v.string(),
    name: v.string(),
    role: v.union(
      v.literal("physician"),
      v.literal("nurse"),
      v.literal("admin"),
      v.literal("pharmacist")
    ),
    specialty: v.optional(v.string()),
    licenseNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("firebaseUid"), args.firebaseUid))
      .unique();
    const now = Date.now();
    if (existing) {
      return await ctx.db.patch(existing._id, {
        email: args.email,
        name: args.name,
        role: args.role,
        specialty: args.specialty,
        licenseNumber: args.licenseNumber,
        updatedAt: now,
      });
    }
    return await ctx.db.insert("users", {
      firebaseUid: args.firebaseUid,
      email: args.email,
      name: args.name,
      role: args.role,
      specialty: args.specialty,
      licenseNumber: args.licenseNumber,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const signOut = mutation({
  args: {},
  handler: async () => {
    return { success: true };
  },
});
