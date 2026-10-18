import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireUser } from "../lib/auth";
import { patientLabel, patientSummaryLine } from "../lib/records";

/**
 * Everything the AI assistant needs up front, in one round trip: who the clinician is, a one-line
 * summary of every patient (so it "knows" the whole panel), today's schedule and recent uploads.
 * Details come later through tool calls (records, search, appointments, prediction).
 */
export const context = query({
  args: { now: v.number(), dayStart: v.number(), dayEnd: v.number() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const [patients, today, upcoming, documents] = await Promise.all([
      ctx.db.query("patients").withIndex("userId", (q) => q.eq("userId", user._id)).collect(),
      ctx.db
        .query("appointments")
        .withIndex("by_user_start", (q) => q.eq("userId", user._id).gte("startsAt", args.dayStart).lt("startsAt", args.dayEnd))
        .collect(),
      ctx.db
        .query("appointments")
        .withIndex("by_user_start", (q) => q.eq("userId", user._id).gte("startsAt", args.now))
        .take(300),
      ctx.db.query("documents").withIndex("by_user", (q) => q.eq("userId", user._id)).order("desc").take(20),
    ]);
    const byId = new Map(patients.map((p) => [p._id, p]));
    const next = new Map<string, number>();
    for (const a of upcoming) {
      if (a.status !== "cancelled" && a.status !== "no-show" && !next.has(a.patientId)) next.set(a.patientId, a.startsAt);
    }
    return {
      clinician: {
        name: user.name ?? "Doctor",
        role: user.role ?? "physician",
        specialty: user.specialty ?? null,
      },
      patientCount: patients.length,
      roster: patients
        .sort((a, b) => a.customId.localeCompare(b.customId))
        .map((p) => ({ customId: p.customId, line: patientSummaryLine(p), nextAppointmentAt: next.get(p._id) ?? null })),
      today: today
        .sort((a, b) => a.startsAt - b.startsAt)
        .map((a) => {
          const p = byId.get(a.patientId);
          return {
            appointmentId: a._id,
            startsAt: a.startsAt,
            durationMinutes: a.durationMinutes,
            type: a.type,
            status: a.status,
            reason: a.reason,
            patient: p ? patientLabel(p) : "Unknown patient",
          };
        }),
      documents: documents.map((d) => ({
        documentId: d._id,
        name: d.name,
        status: d.status,
        patient: d.patientId && byId.get(d.patientId) ? patientLabel(byId.get(d.patientId)!) : null,
        createdAt: d.createdAt,
      })),
    };
  },
});
