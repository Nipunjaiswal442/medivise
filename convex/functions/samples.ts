import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internalMutation, mutation } from "../_generated/server";
import { requireUser } from "../lib/auth";
import { reindexPatient } from "../lib/indexing";
import { sampleAppointments, samplePatients, type SamplePatient } from "../data/samplePatients";
import { nextCustomId } from "./patients";

const DAY = 24 * 60 * 60 * 1000;

/** YYYY-MM-DD for `daysAgo` days before the clinician's local day starting at `todayStart`. */
const isoDay = (todayStart: number, daysAgo: number) =>
  new Date(todayStart - daysAgo * DAY + 12 * 3_600_000).toISOString().slice(0, 10);

function dateOfBirth(todayStart: number, age: number, birthday: string): string {
  const today = isoDay(todayStart, 0);
  const year = parseInt(today.slice(0, 4), 10);
  const hadBirthday = today.slice(5) >= birthday;
  return `${year - age - (hadBirthday ? 0 : 1)}-${birthday}`;
}

function toPatientFields(s: SamplePatient, todayStart: number) {
  const { daysAgo: vitalsDaysAgo, ...vitals } = s.vitals;
  return {
    name: s.name,
    age: s.age,
    gender: s.gender,
    condition: s.condition,
    lastVisit: isoDay(todayStart, s.lastVisitDaysAgo),
    status: s.status,
    consultationDuration: 0,
    symptoms: s.symptoms,
    prescriptions: s.prescriptions,
    sampleKey: s.key,
    dateOfBirth: dateOfBirth(todayStart, s.age, s.birthday),
    bloodType: s.bloodType,
    phone: s.phone,
    email: s.email,
    address: s.address,
    emergencyContact: s.emergencyContact,
    insurance: s.insurance,
    allergies: s.allergies,
    chronicConditions: s.chronicConditions,
    medications: s.medications.map(({ sinceDaysAgo, ...m }) => ({
      ...m,
      startedOn: sinceDaysAgo !== undefined ? isoDay(todayStart, sinceDaysAgo).slice(0, 7) : undefined,
    })),
    vitals: { ...vitals, recordedOn: isoDay(todayStart, vitalsDaysAgo) },
    labResults: s.labs.map(({ daysAgo, ...l }) => ({ ...l, date: isoDay(todayStart, daysAgo) })),
    visits: [...s.visits]
      .sort((a, b) => b.daysAgo - a.daysAgo)
      .map(({ daysAgo, ...visit }) => ({ ...visit, date: isoDay(todayStart, daysAgo) })),
    immunizations: s.immunizations,
    socialHistory: s.socialHistory,
    familyHistory: s.familyHistory,
    notes: s.notes,
  };
}

/**
 * Creates the 20 sample patients for a clinician, or brings existing ones up to date: a patient is
 * matched by its sample key, else by identical name (e.g. one typed in earlier), and its record is
 * replaced with the full sample record. Sample appointments are re-created around `todayStart`.
 */
async function loadSamples(ctx: MutationCtx, user: Doc<"users">, todayStart: number) {
  const existing = await ctx.db
    .query("patients")
    .withIndex("userId", (q) => q.eq("userId", user._id))
    .collect();
  const now = Date.now();
  const idByKey = new Map<string, Id<"patients">>();
  let created = 0;
  let updated = 0;

  for (const sample of samplePatients) {
    const fields = toPatientFields(sample, todayStart);
    const match =
      existing.find((p) => p.sampleKey === sample.key) ??
      existing.find((p) => !p.sampleKey && p.name.trim().toLowerCase() === sample.name.toLowerCase());
    let id: Id<"patients">;
    if (match) {
      await ctx.db.patch(match._id, { ...fields, updatedAt: now });
      id = match._id;
      updated++;
    } else {
      id = await ctx.db.insert("patients", {
        ...fields,
        customId: await nextCustomId(ctx, user._id),
        userId: user._id,
        createdAt: now,
        updatedAt: now,
      });
      created++;
    }
    idByKey.set(sample.key, id);
    await reindexPatient(ctx, (await ctx.db.get(id))!);
  }

  // Replace previously generated sample appointments
  const oldAppointments = await ctx.db
    .query("appointments")
    .withIndex("by_user_start", (q) => q.eq("userId", user._id))
    .collect();
  for (const a of oldAppointments) if (a.sampleKey) await ctx.db.delete(a._id);

  for (const a of sampleAppointments) {
    const patientId = idByKey.get(a.patientKey);
    if (!patientId) continue;
    const [hh, mm] = a.time.split(":").map(Number);
    await ctx.db.insert("appointments", {
      userId: user._id,
      patientId,
      startsAt: todayStart + a.dayOffset * DAY + hh * 3_600_000 + mm * 60_000,
      durationMinutes: a.durationMinutes,
      type: a.type,
      status: a.status ?? "scheduled",
      reason: a.reason,
      location: a.location,
      sampleKey: a.key,
      createdAt: now,
      updatedAt: now,
    });
  }
  return { created, updated, appointments: sampleAppointments.length };
}

/** Loads (or refreshes) the sample patients for the signed-in clinician. */
export const loadSamplePatients = mutation({
  args: { todayStart: v.number() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!Number.isFinite(args.todayStart) || Math.abs(args.todayStart - Date.now()) > 2 * DAY) {
      throw new ConvexError("Pass the start of your local day (todayStart)");
    }
    return await loadSamples(ctx, user, args.todayStart);
  },
});

/**
 * CLI variant for an existing account:
 *   npx convex run functions/samples:loadSamplePatientsForEmail '{"email":"you@clinic.com"}'
 * Without todayStart, "today" is the current UTC day.
 */
export const loadSamplePatientsForEmail = internalMutation({
  args: { email: v.string(), todayStart: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email.trim().toLowerCase()))
      .first();
    if (!user) throw new ConvexError(`No user with email ${args.email}`);
    const todayStart = args.todayStart ?? Math.floor(Date.now() / DAY) * DAY;
    return await loadSamples(ctx, user, todayStart);
  },
});
