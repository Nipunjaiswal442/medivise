import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { findUserByFirebaseUid, requireIdentity } from "../lib/auth";

/** The signed-in user's profile, or null when signed out / not yet created. */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await findUserByFirebaseUid(ctx, identity.subject);
  },
});

/**
 * Creates or updates the profile of the signed-in user. The Firebase uid and email always come
 * from the verified token, never from the client. The role is chosen once, at creation, and
 * "admin" cannot be self-assigned: promote users from the Convex dashboard instead.
 */
export const upsertCurrentUser = mutation({
  args: {
    name: v.string(),
    role: v.union(
      v.literal("physician"),
      v.literal("nurse"),
      v.literal("admin"),
      v.literal("pharmacist"),
    ),
    specialty: v.optional(v.string()),
    licenseNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const existing = await findUserByFirebaseUid(ctx, identity.subject);
    const now = Date.now();
    const email = identity.email ?? existing?.email ?? "";
    const name = args.name.trim() || existing?.name || "Doctor";

    if (existing) {
      await ctx.db.patch(existing._id, {
        email,
        name,
        specialty: args.specialty,
        licenseNumber: args.licenseNumber,
        updatedAt: now,
      });
      return existing._id;
    }
    return await ctx.db.insert("users", {
      firebaseUid: identity.subject,
      email,
      name,
      role: args.role === "admin" ? "physician" : args.role,
      specialty: args.specialty,
      licenseNumber: args.licenseNumber,
      createdAt: now,
      updatedAt: now,
    });
  },
});
