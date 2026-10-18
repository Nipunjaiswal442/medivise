import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { mutation, query } from "../_generated/server";
import { requireOwnPatient, requireUser } from "../lib/auth";
import { reindexPatient } from "../lib/indexing";
import { patientSummaryLine } from "../lib/records";
import { patientProfileFields, patientStatusValidator, prescriptionEntry, symptomEntry } from "../schema";

const baseFields = {
  name: v.string(),
  age: v.number(),
  gender: v.string(),
  condition: v.string(),
  lastVisit: v.string(),
  status: patientStatusValidator,
  consultationDuration: v.number(),
  symptoms: v.array(symptomEntry),
  prescriptions: v.array(prescriptionEntry),
  aiReview: v.optional(v.string()),
};

function validateBasics(args: { name?: string; age?: number }) {
  if (args.name !== undefined && !args.name.trim()) throw new ConvexError("Patient name is required");
  if (args.age !== undefined && (!Number.isFinite(args.age) || args.age < 0 || args.age > 130)) {
    throw new ConvexError("Patient age must be between 0 and 130");
  }
}

/** Next per-clinician sequential id: P-001, P-002, ... (mutations are transactional, so no race). */
export async function nextCustomId(ctx: MutationCtx, userId: Id<"users">): Promise<string> {
  const rows = await ctx.db
    .query("patients")
    .withIndex("userId", (q) => q.eq("userId", userId))
    .collect();
  const max = rows.reduce((m, p) => {
    const match = p.customId.match(/^P-(\d+)$/);
    return match ? Math.max(m, parseInt(match[1], 10)) : m;
  }, 0);
  return `P-${String(max + 1).padStart(3, "0")}`;
}

/** All patients of the signed-in clinician, newest first. */
export const getPatients = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return await ctx.db
      .query("patients")
      .withIndex("userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

/** Finds one of the user's patients by Convex id, custom id ("P-007") or (unique) name. */
export async function resolvePatient(ctx: QueryCtx, user: Doc<"users">, ref: string): Promise<Doc<"patients"> | null> {
  const key = ref.trim();
  if (!key) return null;
  const all = await ctx.db
    .query("patients")
    .withIndex("userId", (q) => q.eq("userId", user._id))
    .collect();
  const byId = all.find((p) => p._id === key || p.customId.toLowerCase() === key.toLowerCase());
  if (byId) return byId;
  const lower = key.toLowerCase();
  const exact = all.filter((p) => p.name.toLowerCase() === lower);
  if (exact.length === 1) return exact[0];
  const partial = all.filter((p) => p.name.toLowerCase().includes(lower));
  return partial.length === 1 ? partial[0] : null;
}

/** A patient with their consultations, appointments, documents and recent predictions. */
export const getPatientRecord = query({
  args: { patient: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const patient = await resolvePatient(ctx, user, args.patient);
    if (!patient) return null;
    const [consultations, appointments, documents, predictions] = await Promise.all([
      ctx.db.query("consultations").withIndex("patientId", (q) => q.eq("patientId", patient._id)).order("desc").take(20),
      ctx.db.query("appointments").withIndex("by_patient_start", (q) => q.eq("patientId", patient._id)).order("desc").take(20),
      ctx.db.query("documents").withIndex("by_patient", (q) => q.eq("patientId", patient._id)).collect(),
      ctx.db.query("predictions").withIndex("patientId", (q) => q.eq("patientId", patient._id)).order("desc").take(10),
    ]);
    return {
      patient,
      consultations,
      appointments,
      documents: documents.map((d) => ({
        _id: d._id,
        name: d.name,
        mimeType: d.mimeType,
        status: d.status,
        createdAt: d.createdAt,
      })),
      predictions: predictions.map((p) => ({
        _id: p._id,
        diseaseName: p.diseaseName ?? "Unknown",
        confidence: p.confidence,
        symptoms: p.symptoms,
        createdAt: p.createdAt,
      })),
    };
  },
});

/** Compact one-line-per-patient roster (used in the assistant's context). */
export const roster = query({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const patients = await ctx.db
      .query("patients")
      .withIndex("userId", (q) => q.eq("userId", user._id))
      .collect();
    const upcoming = await ctx.db
      .query("appointments")
      .withIndex("by_user_start", (q) => q.eq("userId", user._id).gte("startsAt", args.now))
      .take(500);
    const next = new Map<string, number>();
    for (const a of upcoming) {
      if (a.status === "cancelled" || a.status === "no-show") continue;
      if (!next.has(a.patientId)) next.set(a.patientId, a.startsAt);
    }
    return patients
      .sort((a, b) => a.customId.localeCompare(b.customId))
      .map((p) => ({
        id: p._id,
        customId: p.customId,
        line: patientSummaryLine(p, {
          nextAppointment: next.has(p._id) ? new Date(next.get(p._id)!).toISOString() : undefined,
        }),
      }));
  },
});

/** Structured cohort search for the assistant ("patients on metformin over 60"). */
export const findPatients = query({
  args: {
    text: v.optional(v.string()),
    condition: v.optional(v.string()),
    medication: v.optional(v.string()),
    allergy: v.optional(v.string()),
    labTest: v.optional(v.string()),
    labFlag: v.optional(v.string()),
    minAge: v.optional(v.number()),
    maxAge: v.optional(v.number()),
    gender: v.optional(v.string()),
    status: v.optional(patientStatusValidator),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const patients = await ctx.db
      .query("patients")
      .withIndex("userId", (q) => q.eq("userId", user._id))
      .collect();
    const contains = (hay: string | undefined, needle?: string) =>
      !needle || (hay ?? "").toLowerCase().includes(needle.toLowerCase());
    return patients
      .filter((p) => args.minAge === undefined || p.age >= args.minAge)
      .filter((p) => args.maxAge === undefined || p.age <= args.maxAge)
      .filter((p) => !args.status || p.status === args.status)
      .filter((p) => !args.gender || p.gender.toLowerCase().startsWith(args.gender.toLowerCase().charAt(0)))
      .filter((p) => !args.condition || contains([p.condition, ...(p.chronicConditions ?? []), ...(p.visits ?? []).map((v) => v.diagnosis)].join(" | "), args.condition))
      .filter((p) => !args.medication || contains([...(p.medications ?? []).map((m) => m.name), ...p.prescriptions.map((r) => r.name)].join(" | "), args.medication))
      .filter((p) => !args.allergy || contains((p.allergies ?? []).map((a) => a.substance).join(" | "), args.allergy))
      .filter((p) => !args.labTest || (p.labResults ?? []).some((l) => contains(l.test, args.labTest) && contains(l.flag, args.labFlag)))
      .filter((p) => !args.text || contains(JSON.stringify([p.name, p.customId, p.condition, p.notes, p.chronicConditions, p.medications, p.visits]), args.text))
      .map((p) => ({
        customId: p.customId,
        name: p.name,
        age: p.age,
        gender: p.gender,
        status: p.status,
        condition: p.condition,
        chronicConditions: p.chronicConditions ?? [],
        medications: (p.medications ?? []).map((m) => `${m.name} ${m.dose} ${m.frequency}`),
        allergies: (p.allergies ?? []).map((a) => a.substance),
        matchingLabs: args.labTest
          ? (p.labResults ?? []).filter((l) => contains(l.test, args.labTest)).map((l) => `${l.test} ${l.value} ${l.unit} (${l.date})${l.flag ? ` [${l.flag}]` : ""}`)
          : undefined,
        lastVisit: p.lastVisit,
      }));
  },
});

export const createPatient = mutation({
  args: { ...baseFields, ...patientProfileFields },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    validateBasics(args);
    const customId = await nextCustomId(ctx, user._id);
    const now = Date.now();
    const id = await ctx.db.insert("patients", {
      ...args,
      name: args.name.trim(),
      customId,
      userId: user._id,
      createdAt: now,
      updatedAt: now,
    });
    await reindexPatient(ctx, (await ctx.db.get(id))!);
    return { id, customId };
  },
});

const optionalBase = {
  name: v.optional(v.string()),
  age: v.optional(v.number()),
  gender: v.optional(v.string()),
  condition: v.optional(v.string()),
  lastVisit: v.optional(v.string()),
  status: v.optional(patientStatusValidator),
  consultationDuration: v.optional(v.number()),
  symptoms: v.optional(v.array(symptomEntry)),
  prescriptions: v.optional(v.array(prescriptionEntry)),
  aiReview: v.optional(v.string()),
};

/** Updates any subset of a patient's fields and refreshes the retrieval index. */
export const updatePatient = mutation({
  args: { id: v.id("patients"), ...optionalBase, ...patientProfileFields },
  handler: async (ctx, { id, ...fields }) => {
    const user = await requireUser(ctx);
    await requireOwnPatient(ctx, user, id);
    validateBasics(fields);
    const patch = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));
    await ctx.db.patch(id, { ...patch, updatedAt: Date.now() });
    await reindexPatient(ctx, (await ctx.db.get(id))!);
    return { success: true };
  },
});

/**
 * Deletes a patient with their consultations, predictions, appointments and index entries.
 * Uploaded documents are kept but unlinked from the patient.
 */
export const deletePatient = mutation({
  args: { id: v.id("patients") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requireOwnPatient(ctx, user, args.id);
    const consultations = await ctx.db.query("consultations").withIndex("patientId", (q) => q.eq("patientId", args.id)).collect();
    for (const c of consultations) await ctx.db.delete(c._id);
    const predictions = await ctx.db.query("predictions").withIndex("patientId", (q) => q.eq("patientId", args.id)).collect();
    for (const p of predictions) await ctx.db.delete(p._id);
    const appointments = await ctx.db.query("appointments").withIndex("by_patient_start", (q) => q.eq("patientId", args.id)).collect();
    for (const a of appointments) await ctx.db.delete(a._id);
    const chunks = await ctx.db.query("knowledgeChunks").withIndex("by_patient", (q) => q.eq("patientId", args.id)).collect();
    for (const chunk of chunks) {
      if (chunk.sourceType === "document") await ctx.db.patch(chunk._id, { patientId: undefined });
      else await ctx.db.delete(chunk._id);
    }
    const documents = await ctx.db.query("documents").withIndex("by_patient", (q) => q.eq("patientId", args.id)).collect();
    for (const d of documents) await ctx.db.patch(d._id, { patientId: undefined });
    await ctx.db.delete(args.id);
    return { success: true };
  },
});
