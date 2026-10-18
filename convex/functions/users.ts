import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireUser } from "../lib/auth";

/** The signed-in clinician's profile, or null when signed out. */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return {
      _id: user._id,
      email: user.email ?? "",
      name: user.name ?? "Doctor",
      role: user.role ?? "physician",
      specialty: user.specialty ?? null,
      licenseNumber: user.licenseNumber ?? null,
    };
  },
});

/** Updates the editable parts of the profile. Role changes are admin-only (Convex dashboard). */
export const updateProfile = mutation({
  args: {
    name: v.string(),
    specialty: v.optional(v.string()),
    licenseNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const name = args.name.trim();
    if (!name) throw new ConvexError("Name is required");
    if (name.length > 120) throw new ConvexError("Name is too long");
    await ctx.db.patch(user._id, {
      name,
      specialty: args.specialty?.trim().slice(0, 80) || undefined,
      licenseNumber: args.licenseNumber?.trim().slice(0, 60) || undefined,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});
