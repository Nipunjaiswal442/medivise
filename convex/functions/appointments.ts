import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { mutation, query } from "../_generated/server";
import { requireOwnPatient, requireUser } from "../lib/auth";
import { appointmentStatusValidator, appointmentTypeValidator } from "../schema";

const MAX_RANGE_MS = 62 * 24 * 60 * 60 * 1000;
const INACTIVE = new Set(["cancelled", "no-show"]);

async function withPatient(ctx: QueryCtx, a: Doc<"appointments">) {
  const p = await ctx.db.get(a.patientId);
  return {
    ...a,
    patient: p
      ? {
          _id: p._id,
          customId: p.customId,
          name: p.name,
          age: p.age,
          gender: p.gender,
          condition: p.condition,
          allergies: (p.allergies ?? []).map((x) => x.substance),
          chronicConditions: p.chronicConditions ?? [],
        }
      : null,
  };
}

async function requireOwnAppointment(ctx: QueryCtx, userId: Id<"users">, id: Id<"appointments">) {
  const a = await ctx.db.get(id);
  if (!a || a.userId !== userId) throw new ConvexError("Appointment not found");
  return a;
}

/** Appointments overlapping [startsAt, startsAt + duration) that are still active. */
async function overlapping(
  ctx: MutationCtx,
  userId: Id<"users">,
  startsAt: number,
  durationMinutes: number,
  exclude?: Id<"appointments">,
) {
  const end = startsAt + durationMinutes * 60_000;
  const nearby = await ctx.db
    .query("appointments")
    .withIndex("by_user_start", (q) => q.eq("userId", userId).gte("startsAt", startsAt - 12 * 3_600_000).lt("startsAt", end))
    .collect();
  return nearby.filter(
    (a) => a._id !== exclude && !INACTIVE.has(a.status) && a.startsAt + a.durationMinutes * 60_000 > startsAt,
  );
}

function validateTiming(startsAt: number, durationMinutes: number) {
  if (!Number.isFinite(startsAt) || startsAt <= 0) throw new ConvexError("Choose a valid date and time");
  if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 480) {
    throw new ConvexError("Duration must be between 5 and 480 minutes");
  }
}

/** Appointments starting in [from, to), earliest first, with a patient summary. */
export const listRange = query({
  args: { from: v.number(), to: v.number() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (args.to <= args.from || args.to - args.from > MAX_RANGE_MS) throw new ConvexError("Invalid date range");
    const rows = await ctx.db
      .query("appointments")
      .withIndex("by_user_start", (q) => q.eq("userId", user._id).gte("startsAt", args.from).lt("startsAt", args.to))
      .collect();
    return await Promise.all(rows.map((a) => withPatient(ctx, a)));
  },
});

export const listForPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requireOwnPatient(ctx, user, args.patientId);
    return await ctx.db
      .query("appointments")
      .withIndex("by_patient_start", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { id: v.id("appointments") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    return await withPatient(ctx, await requireOwnAppointment(ctx, user._id, args.id));
  },
});

export const create = mutation({
  args: {
    patientId: v.id("patients"),
    startsAt: v.number(),
    durationMinutes: v.number(),
    type: appointmentTypeValidator,
    reason: v.string(),
    notes: v.optional(v.string()),
    location: v.optional(v.string()),
    allowOverlap: v.optional(v.boolean()),
  },
  handler: async (ctx, { allowOverlap, ...args }) => {
    const user = await requireUser(ctx);
    await requireOwnPatient(ctx, user, args.patientId);
    validateTiming(args.startsAt, args.durationMinutes);
    if (!args.reason.trim()) throw new ConvexError("Add a reason for the visit");
    if (!allowOverlap) {
      const clash = await overlapping(ctx, user._id, args.startsAt, args.durationMinutes);
      if (clash.length > 0) {
        const p = await ctx.db.get(clash[0].patientId);
        throw new ConvexError(
          `Overlaps with ${p?.name ?? "another patient"}'s appointment. Choose another time or allow double-booking.`,
        );
      }
    }
    const now = Date.now();
    return await ctx.db.insert("appointments", {
      ...args,
      reason: args.reason.trim(),
      userId: user._id,
      status: "scheduled",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("appointments"),
    startsAt: v.optional(v.number()),
    durationMinutes: v.optional(v.number()),
    type: v.optional(appointmentTypeValidator),
    reason: v.optional(v.string()),
    notes: v.optional(v.string()),
    location: v.optional(v.string()),
    allowOverlap: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, allowOverlap, ...fields }) => {
    const user = await requireUser(ctx);
    const current = await requireOwnAppointment(ctx, user._id, id);
    const startsAt = fields.startsAt ?? current.startsAt;
    const durationMinutes = fields.durationMinutes ?? current.durationMinutes;
    validateTiming(startsAt, durationMinutes);
    if (!allowOverlap && (fields.startsAt !== undefined || fields.durationMinutes !== undefined)) {
      const clash = await overlapping(ctx, user._id, startsAt, durationMinutes, id);
      if (clash.length > 0) throw new ConvexError("That time overlaps another appointment. Choose another time or allow double-booking.");
    }
    const patch = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));
    await ctx.db.patch(id, { ...patch, updatedAt: Date.now() });
    return { success: true };
  },
});

export const setStatus = mutation({
  args: { id: v.id("appointments"), status: appointmentStatusValidator },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requireOwnAppointment(ctx, user._id, args.id);
    await ctx.db.patch(args.id, { status: args.status, updatedAt: Date.now() });
    return { success: true };
  },
});

export const remove = mutation({
  args: { id: v.id("appointments") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requireOwnAppointment(ctx, user._id, args.id);
    await ctx.db.delete(args.id);
    return { success: true };
  },
});
