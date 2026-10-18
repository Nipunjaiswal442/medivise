/**
 * Tools the assistant can call. All are read-only and run as the signed-in clinician (their
 * Convex token), so the model can only ever see that clinician's own data.
 */
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { Doc, Id } from "../convex/_generated/dataModel";
import { patientSafetyContext, screenMedications } from "../convex/lib/clinical";
import { diseaseInfo, predict } from "../convex/lib/predictor";
import { patientLabel, patientSections } from "../convex/lib/records";
import { api, type ConvexAs } from "./convex";
import { addDays, formatDateTime, localDate, zonedMidnight } from "./time";

const MAX_RESULT_CHARS = 30_000;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface ToolContext {
  convex: ConvexAs["client"];
  timeZone: string;
  now: number;
}

interface ToolDef<S extends z.ZodTypeAny> {
  name: string;
  description: string;
  schema: S;
  run: (input: z.infer<S>, ctx: ToolContext) => Promise<string>;
  /** Short human-readable description of a call, shown in the chat UI. */
  summarize: (input: z.infer<S>) => string;
}

/** Erased form for the registry: run/summarize only ever receive data parsed by their own schema. */
interface AnyTool {
  name: string;
  description: string;
  schema: z.ZodTypeAny;
  run: (input: unknown, ctx: ToolContext) => Promise<string>;
  summarize: (input: unknown) => string;
}

const define = <S extends z.ZodTypeAny>(def: ToolDef<S>): AnyTool => def as unknown as AnyTool;

const patientRef = z
  .string()
  .min(1)
  .describe('Patient ID such as "P-007", or the patient\'s full name');

async function loadPatient(ctx: ToolContext, ref: string) {
  const record = await ctx.convex.query(api.functions.patients.getPatientRecord, { patient: ref });
  if (!record) throw new ToolError(`No patient matches "${ref}". Use find_patients or the roster to get the ID.`);
  return record;
}

class ToolError extends Error {}

function formatRecord(record: NonNullable<Awaited<ReturnType<typeof loadPatient>>>, timeZone: string): string {
  const p = record.patient as Doc<"patients">;
  const lines = patientSections(p).map((s) => s.text);
  if (record.consultations.length > 0) {
    lines.push(
      "Consultations recorded in Medivise:\n" +
        record.consultations
          .map(
            (c) =>
              `- ${formatDateTime(c.createdAt, timeZone)}: ${c.diagnosis ?? "no diagnosis recorded"}; symptoms ${c.symptoms.map((s) => s.name).join(", ") || "none"}; prescriptions ${c.prescriptions.map((r) => `${r.name} ${r.dosage}`).join(", ") || "none"}${c.notes ? `; notes: ${c.notes}` : ""}`,
          )
          .join("\n"),
    );
  }
  if (record.appointments.length > 0) {
    lines.push(
      "Appointments:\n" +
        record.appointments
          .map((a) => `- ${formatDateTime(a.startsAt, timeZone)} (${a.durationMinutes} min, ${a.type}, ${a.status}): ${a.reason}`)
          .join("\n"),
    );
  }
  if (record.documents.length > 0) {
    lines.push("Uploaded documents:\n" + record.documents.map((d) => `- ${d.name} (document_id ${d._id}, ${d.status})`).join("\n"));
  }
  if (record.predictions.length > 0) {
    lines.push(
      "Recent symptom-model predictions:\n" +
        record.predictions.map((x) => `- ${formatDateTime(x.createdAt, timeZone)}: ${x.diseaseName} (${x.confidence}%) from ${x.symptoms.join(", ")}`).join("\n"),
    );
  }
  return lines.join("\n\n");
}

export const toolDefs = [
  define({
    name: "search_records",
    description:
      "Full-text search across the clinician's patient records, consultation notes and uploaded documents. Returns the most relevant excerpts with their source. Use specific clinical terms (drug names, tests, diagnoses). Optionally restrict to one patient or one source type.",
    schema: z.object({
      query: z.string().min(1).describe("Keywords to search for, e.g. 'warfarin INR' or 'HbA1c'"),
      patient: patientRef.optional(),
      source: z.enum(["patient", "document", "consultation"]).optional().describe("Only search this kind of source"),
      limit: z.number().int().min(1).max(15).optional().describe("Maximum excerpts (default 8)"),
    }),
    summarize: (i) => `Searched records for "${i.query}"${i.patient ? ` (${i.patient})` : ""}`,
    async run(input, ctx) {
      const patientId = input.patient ? (await loadPatient(ctx, input.patient)).patient._id : undefined;
      const hits = await ctx.convex.query(api.functions.rag.search, {
        query: input.query,
        patientId,
        sourceType: input.source,
        limit: input.limit ?? 8,
      });
      if (hits.length === 0) return `No matches for "${input.query}".`;
      return hits
        .map((h, i) => `[${i + 1}] ${h.title}${h.documentId ? ` (document_id ${h.documentId})` : ""}\n${h.text}`)
        .join("\n\n");
    },
  }),
  define({
    name: "get_patient_record",
    description:
      "The complete record of one patient: demographics, allergies, medications, vitals, labs, visit history, consultations, appointments, uploaded documents and recent predictions.",
    schema: z.object({ patient: patientRef }),
    summarize: (i) => `Opened record for ${i.patient}`,
    async run(input, ctx) {
      return formatRecord(await loadPatient(ctx, input.patient), ctx.timeZone);
    },
  }),
  define({
    name: "find_patients",
    description:
      "Filter the clinician's patients by structured criteria (all optional, combined with AND). Use for cohort questions such as 'patients on metformin over 60' or 'who has a high HbA1c'.",
    schema: z.object({
      text: z.string().optional().describe("Free text matched against name, ID, condition, notes, medications and visits"),
      condition: z.string().optional().describe("Diagnosis or chronic condition contains this text"),
      medication: z.string().optional().describe("Current medication or prescription contains this text"),
      allergy: z.string().optional().describe("Recorded allergy contains this text"),
      lab_test: z.string().optional().describe("Has a lab result whose test name contains this text"),
      lab_flag: z.string().optional().describe("With lab_test: the result's flag contains this text, e.g. 'high'"),
      min_age: z.number().optional(),
      max_age: z.number().optional(),
      gender: z.string().optional().describe("'male' or 'female'"),
      status: z.enum(["active", "discharged", "scheduled"]).optional(),
    }),
    summarize: (i) =>
      `Filtered patients (${Object.entries(i)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ") || "all"})`,
    async run(input, ctx) {
      const rows = await ctx.convex.query(api.functions.patients.findPatients, {
        text: input.text,
        condition: input.condition,
        medication: input.medication,
        allergy: input.allergy,
        labTest: input.lab_test,
        labFlag: input.lab_flag,
        minAge: input.min_age,
        maxAge: input.max_age,
        gender: input.gender,
        status: input.status,
      });
      if (rows.length === 0) return "No patients match these criteria.";
      return `${rows.length} patient(s):\n` + rows.map((r) => JSON.stringify(r)).join("\n");
    },
  }),
  define({
    name: "list_appointments",
    description:
      "The clinician's appointments between two dates (inclusive, clinician's local time zone), optionally for one patient. Defaults to today plus the next 6 days.",
    schema: z.object({
      from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("YYYY-MM-DD, default today"),
      to_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("YYYY-MM-DD inclusive, default from_date + 6 days"),
      patient: patientRef.optional(),
      include_cancelled: z.boolean().optional(),
    }),
    summarize: (i) => `Checked appointments ${i.from_date ?? "today"}${i.to_date ? ` to ${i.to_date}` : ""}${i.patient ? ` for ${i.patient}` : ""}`,
    async run(input, ctx) {
      const from = input.from_date ?? localDate(ctx.now, ctx.timeZone);
      const to = input.to_date ?? addDays(from, 6);
      const start = zonedMidnight(from, ctx.timeZone);
      const end = zonedMidnight(addDays(to, 1), ctx.timeZone);
      if (end <= start || end - start > 62 * DAY_MS) throw new ToolError("Choose a range of at most 62 days, with to_date after from_date.");
      let rows = await ctx.convex.query(api.functions.appointments.listRange, { from: start, to: end });
      if (input.patient) {
        const { patient } = await loadPatient(ctx, input.patient);
        rows = rows.filter((a) => a.patientId === patient._id);
      }
      if (!input.include_cancelled) rows = rows.filter((a) => a.status !== "cancelled");
      if (rows.length === 0) return `No appointments between ${from} and ${to}.`;
      return rows
        .map(
          (a) =>
            `- ${formatDateTime(a.startsAt, ctx.timeZone)} | ${a.durationMinutes} min | ${a.type} | ${a.status} | ${a.patient ? patientLabel(a.patient) : "unknown patient"} | ${a.reason}${a.location ? ` | ${a.location}` : ""}${a.patient?.allergies.length ? ` | allergies: ${a.patient.allergies.join(", ")}` : ""}`,
        )
        .join("\n");
    },
  }),
  define({
    name: "predict_conditions",
    description:
      "Run Medivise's symptom-based prediction model (a naive-Bayes model over a demonstration knowledge base). Returns a ranked differential with probabilities within the knowledge base, red flags, symptoms worth asking about, and treatment options for the top condition screened against the patient's allergies and medications when a patient is given. Decision support only.",
    schema: z.object({
      symptoms: z.array(z.string().min(1)).min(1).max(30).describe("Reported symptoms in plain words"),
      age: z.number().min(0).max(130).optional(),
      sex: z.string().optional().describe("'male' or 'female'"),
      duration_days: z.number().min(0).optional().describe("How long the main symptoms have lasted"),
      patient: patientRef.optional().describe("Use this patient's age, sex, allergies and medications"),
    }),
    summarize: (i) => `Ran the prediction model on ${i.symptoms.join(", ")}`,
    async run(input, ctx) {
      const record = input.patient ? await loadPatient(ctx, input.patient) : null;
      const p = record?.patient;
      const out = predict({
        symptoms: input.symptoms,
        age: input.age ?? p?.age,
        sex: input.sex ?? p?.gender,
        durationDays: input.duration_days,
      });
      const warnings = p
        ? screenMedications({
            current: (p.medications ?? []).map((m) => m.name),
            proposed: out.medicines.map((m) => m.name),
            allergies: p.allergies ?? [],
            context: patientSafetyContext(p),
          })
        : [];
      return JSON.stringify(
        {
          model: out.model,
          note: "Probabilities are relative to Medivise's demonstration knowledge base, not calibrated clinical probabilities.",
          demographicsUsed: out.demographicsUsed,
          recognised: out.matchedSymptoms.map((m) => m.name),
          notRecognised: out.unmatchedSymptoms,
          negated: out.negated,
          redFlags: out.redFlags,
          differential: out.ranking.map((r) => ({
            condition: r.name,
            probability: r.probability,
            explains: r.matchedSymptoms,
            doesNotExplain: r.unexplainedSymptoms,
            askAbout: r.askAbout,
            urgent: r.urgent,
          })),
          treatmentOptionsForTop: out.medicines.slice(0, 6).map((m) => ({
            name: m.name,
            dosage: m.dosage,
            frequency: m.frequency,
            contraindications: m.contraindications,
            usage: m.confidence,
          })),
          treatmentNotes: out.treatmentNotes,
          safetyWarnings: warnings.map((w) => w.message),
        },
        null,
        1,
      );
    },
  }),
  define({
    name: "get_condition_info",
    description: "Knowledge-base entry for one condition: description, weighted symptom profile, typical demographics and treatment options.",
    schema: z.object({ condition: z.string().min(2) }),
    summarize: (i) => `Looked up ${i.condition}`,
    async run(input) {
      const info = diseaseInfo(input.condition);
      if (!info) throw new ToolError(`"${input.condition}" is not in the knowledge base.`);
      return JSON.stringify(info, null, 1);
    },
  }),
  define({
    name: "check_medications",
    description:
      "Screen medications for allergy conflicts, known interactions, pregnancy and kidney-function (eGFR) contraindications. With a patient, checks the proposed drugs against that patient's allergies, current medications, pregnancy status and latest eGFR; without proposed drugs, reviews the current regimen. A limited screening table, not a complete interaction database.",
    schema: z.object({
      patient: patientRef.optional(),
      proposed: z.array(z.string().min(1)).max(20).optional().describe("Drugs being considered"),
      current: z.array(z.string().min(1)).max(40).optional().describe("Current drugs, if no patient is given"),
    }),
    summarize: (i) => `Checked medications${i.proposed?.length ? ` (${i.proposed.join(", ")})` : ""}${i.patient ? ` for ${i.patient}` : ""}`,
    async run(input, ctx) {
      const p = input.patient ? (await loadPatient(ctx, input.patient)).patient : null;
      const current = p ? (p.medications ?? []).map((m) => m.name) : input.current ?? [];
      const context = p ? patientSafetyContext(p) : {};
      const warnings = screenMedications({ current, proposed: input.proposed, allergies: p?.allergies ?? [], context });
      return JSON.stringify(
        {
          checked: { current, proposed: input.proposed ?? [], allergies: (p?.allergies ?? []).map((a) => a.substance), ...context },
          warnings,
          note: "No warning does not mean the combination is safe; this screen covers a limited rule set. Also consider pregnancy, renal and hepatic function and age.",
        },
        null,
        1,
      );
    },
  }),
  define({
    name: "read_document",
    description: "Read the extracted text of an uploaded document, in pages of up to 20,000 characters. Use the document_id from search results, the record or the context.",
    schema: z.object({
      document_id: z.string().min(1),
      offset: z.number().int().min(0).optional().describe("Character offset to continue from"),
    }),
    summarize: () => "Read an uploaded document",
    async run(input, ctx) {
      const doc = await ctx.convex
        .query(api.functions.documents.get, { id: input.document_id as Id<"documents">, offset: input.offset ?? 0, length: 20_000 })
        .catch(() => {
          throw new ToolError("Document not found.");
        });
      if (!doc.text) return `"${doc.name}" has no extracted text yet (status: ${doc.status}).`;
      return `Document "${doc.name}" (characters ${doc.offset}-${doc.offset + doc.text.length} of ${doc.textLength}${doc.truncated ? ", stored text was truncated at upload" : ""}):\n${doc.text}${doc.hasMore ? `\n\n[More text: call read_document with offset ${doc.offset + doc.text.length}]` : ""}`;
    },
  }),
];

const byName = new Map(toolDefs.map((t) => [t.name, t]));

function jsonSchema(schema: z.ZodTypeAny): Anthropic.Beta.BetaTool["input_schema"] {
  const { $schema: _ignored, ...rest } = z.toJSONSchema(schema) as Record<string, unknown>;
  return rest as Anthropic.Beta.BetaTool["input_schema"];
}

/** Tool definitions for the Messages API (fixed order so the prompt cache prefix is stable). */
export const anthropicTools: Anthropic.Beta.BetaTool[] = toolDefs.map((t) => ({
  name: t.name,
  description: t.description,
  input_schema: jsonSchema(t.schema),
  eager_input_streaming: true,
}));

/** UI summary of a call before it runs ("Searched records for ..."). */
export function describeCall(name: string, input: unknown): string {
  const tool = byName.get(name);
  const parsed = tool?.schema.safeParse(input);
  return tool && parsed?.success ? tool.summarize(parsed.data) : name;
}

export interface ToolOutcome {
  content: string;
  isError: boolean;
  summary: string;
}

/** Validates the (eagerly streamed, therefore unvalidated) input and runs the tool. */
export async function runTool(name: string, input: unknown, ctx: ToolContext): Promise<ToolOutcome> {
  const tool = byName.get(name);
  if (!tool) return { content: `Unknown tool ${name}`, isError: true, summary: `Unknown tool ${name}` };
  const parsed = tool.schema.safeParse(input);
  if (!parsed.success) {
    return {
      content: `Invalid input for ${name}: ${parsed.error.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ")}`,
      isError: true,
      summary: `${name} (invalid input)`,
    };
  }
  const summary = tool.summarize(parsed.data);
  try {
    const content = await tool.run(parsed.data, ctx);
    return {
      content: content.length > MAX_RESULT_CHARS ? `${content.slice(0, MAX_RESULT_CHARS)}\n[truncated]` : content,
      isError: false,
      summary,
    };
  } catch (err) {
    const message = err instanceof ToolError ? err.message : "The tool failed. Try again or answer without it.";
    if (!(err instanceof ToolError)) console.error(`tool ${name} failed`, err);
    return { content: message, isError: true, summary: `${summary} (failed)` };
  }
}
