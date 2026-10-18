import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireUser } from "../lib/auth";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Everything the dashboard shows, in one query. The client passes its local day boundaries so
 * "today" matches the clinician's timezone.
 */
export const summary = query({
  args: { dayStart: v.number(), dayEnd: v.number(), now: v.number() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const [patients, todays, upcoming, predictions, documents] = await Promise.all([
      ctx.db.query("patients").withIndex("userId", (q) => q.eq("userId", user._id)).collect(),
      ctx.db
        .query("appointments")
        .withIndex("by_user_start", (q) => q.eq("userId", user._id).gte("startsAt", args.dayStart).lt("startsAt", args.dayEnd))
        .collect(),
      ctx.db
        .query("appointments")
        .withIndex("by_user_start", (q) => q.eq("userId", user._id).gte("startsAt", args.dayEnd).lt("startsAt", args.dayEnd + WEEK_MS))
        .take(50),
      ctx.db
        .query("predictions")
        .withIndex("userId", (q) => q.eq("userId", user._id))
        .order("desc")
        .take(200),
      ctx.db.query("documents").withIndex("by_user", (q) => q.eq("userId", user._id)).take(500),
    ]);

    const byId = new Map(patients.map((p) => [p._id, p]));
    const describe = (a: (typeof todays)[number]) => {
      const p = byId.get(a.patientId);
      return {
        _id: a._id,
        startsAt: a.startsAt,
        durationMinutes: a.durationMinutes,
        type: a.type,
        status: a.status,
        reason: a.reason,
        patient: p ? { _id: p._id, customId: p.customId, name: p.name, age: p.age, gender: p.gender } : null,
      };
    };

    const active = todays.filter((a) => a.status !== "cancelled" && a.status !== "no-show");
    const flaggedLabs = patients.flatMap((p) =>
      (p.labResults ?? [])
        .filter((l) => l.flag && /high|low|critical|abnormal/i.test(l.flag))
        .map((l) => ({ patientId: p._id, customId: p.customId, name: p.name, test: l.test, value: `${l.value} ${l.unit}`, flag: l.flag!, date: l.date })),
    );

    return {
      patients: {
        total: patients.length,
        active: patients.filter((p) => p.status === "active").length,
        withAllergies: patients.filter((p) => (p.allergies ?? []).length > 0).length,
      },
      today: {
        total: active.length,
        completed: active.filter((a) => a.status === "completed").length,
        remaining: active.filter((a) => a.status === "scheduled" || a.status === "checked-in" || a.status === "in-progress").length,
        noShows: todays.filter((a) => a.status === "no-show").length,
        appointments: todays.sort((a, b) => a.startsAt - b.startsAt).map(describe),
        next: active.filter((a) => a.startsAt + a.durationMinutes * 60_000 >= args.now && a.status !== "completed").sort((a, b) => a.startsAt - b.startsAt).map(describe)[0] ?? null,
      },
      upcoming: upcoming
        .filter((a) => a.status !== "cancelled")
        .slice(0, 8)
        .map(describe),
      predictionsThisWeek: predictions.filter((p) => p.createdAt >= args.now - WEEK_MS).length,
      documents: documents.length,
      flaggedLabs: flaggedLabs.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8),
      recentPatients: [...patients]
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 5)
        .map((p) => ({ _id: p._id, customId: p.customId, name: p.name, condition: p.condition, lastVisit: p.lastVisit, status: p.status })),
    };
  },
});
