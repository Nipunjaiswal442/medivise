import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type Ctx = QueryCtx | MutationCtx;

/** The signed-in clinician's user row. Throws when signed out (Convex Auth session). */
export async function requireUser(ctx: Ctx): Promise<Doc<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Unauthenticated");
  const user = await ctx.db.get(userId);
  if (!user) throw new ConvexError("Unauthenticated");
  return user;
}

/** Loads a patient and checks it belongs to the user. */
export async function requireOwnPatient(ctx: Ctx, user: Doc<"users">, patientId: Doc<"patients">["_id"]) {
  const patient = await ctx.db.get(patientId);
  if (!patient || patient.userId !== user._id) throw new ConvexError("Patient not found");
  return patient;
}
