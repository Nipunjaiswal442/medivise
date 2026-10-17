import { ConvexError } from "convex/values";
import type { QueryCtx, MutationCtx } from "../_generated/server";

type Ctx = QueryCtx | MutationCtx;

/** Throws unless the request carries a valid Firebase ID token (see convex/auth.config.ts). */
export async function requireIdentity(ctx: Pick<Ctx, "auth">) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Unauthenticated");
  }
  return identity;
}

/** Looks up the Convex user row that belongs to a Firebase uid. */
export async function findUserByFirebaseUid(ctx: Pick<Ctx, "db">, firebaseUid: string) {
  return await ctx.db
    .query("users")
    .withIndex("firebaseUid", (q) => q.eq("firebaseUid", firebaseUid))
    .unique();
}

/** The signed-in user's row. Throws if signed out, or if the profile has not been created yet. */
export async function requireUser(ctx: Ctx) {
  const identity = await requireIdentity(ctx);
  const user = await findUserByFirebaseUid(ctx, identity.subject);
  if (!user) {
    throw new ConvexError("User profile not found. Sign out and back in to create it.");
  }
  return user;
}
