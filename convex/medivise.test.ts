/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { diseaseMedicineMappings, diseaseSymptomMappings } from "./data/mappings";
import { medicines } from "./data/medicines";
import { samplePatients } from "./data/samplePatients";
import { symptoms } from "./data/symptoms";
import { checkAllergies, checkInteractions, patientSafetyContext, screenMedications } from "./lib/clinical";
import { predict, resolveSymptom } from "./lib/predictor";
import schema from "./schema";

// Same glob as the Convex docs: every module except *.test.ts (more than one dot).
const modules = import.meta.glob("./**/!(*.*.*)*.*s");

const DAY = 24 * 60 * 60 * 1000;
const todayStart = (() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
})();

type Backend = ReturnType<typeof convexTest>;

/** A signed-in clinician without going through the sign-in flow (Convex Auth subject = "userId|sessionId"). */
async function clinician(t: Backend, email: string, name = email.split("@")[0]) {
  const { userId, sessionId } = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { email, name, role: "physician" });
    const sessionId = await ctx.db.insert("authSessions", { userId, expirationTime: Date.now() + DAY });
    return { userId, sessionId };
  });
  return { as: t.withIdentity({ subject: `${userId}|${sessionId}` }), userId };
}

const patientInput = (name: string, extra: Record<string, unknown> = {}) => ({
  name,
  age: 40,
  gender: "Female",
  condition: "Cough",
  lastVisit: "2026-10-01",
  status: "active" as const,
  consultationDuration: 120,
  symptoms: [{ name: "Cough", days: "3" }],
  prescriptions: [],
  ...extra,
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("knowledge base data", () => {
  test("every mapping names a defined symptom / medicine", () => {
    const symptomNames = new Set(symptoms.map((s) => s.name));
    const medicineNames = new Set(medicines.map((m) => m.name));
    expect(diseaseSymptomMappings.filter((m) => !symptomNames.has(m.symptom))).toEqual([]);
    expect(
      (diseaseMedicineMappings as { medicine?: string }[]).filter((m) => m.medicine && !medicineNames.has(m.medicine)),
    ).toEqual([]);
  });

  test("seeding loads every link and is idempotent", async () => {
    const t = convexTest(schema, modules);
    const first = await t.mutation(internal.functions.seed.seedDatabase, {});
    expect(first.seeded).toBe(true);
    expect(first.skippedLinks).toEqual([]);
    expect(first.inserted).toMatchObject({ diseases: 84 });
    expect(first.inserted!.diseaseSymptoms).toBe(diseaseSymptomMappings.length);
    expect((await t.mutation(internal.functions.seed.seedDatabase, {})).seeded).toBe(false);
  });

  test("seeding is internal-only (checked by tsc)", () => {
    // @ts-expect-error seedDatabase is an internalMutation, so clients cannot call it
    void api.functions.seed.seedDatabase;
  });
});

describe("Convex Auth password sign-up / sign-in", () => {
  beforeAll(async () => {
    const { privateKey, publicKey } = await generateKeyPair("RS256", { extractable: true });
    process.env.JWT_PRIVATE_KEY = (await exportPKCS8(privateKey)).trimEnd().replace(/\n/g, " ");
    process.env.JWKS = JSON.stringify({ keys: [{ use: "sig", ...(await exportJWK(publicKey)) }] });
    process.env.CONVEX_SITE_URL = "https://medivise-test.convex.site";
    process.env.SITE_URL = "http://localhost:5173";
  });

  const signUpParams = {
    flow: "signUp",
    email: "Dr.House@Example.com",
    password: "Str0ng!pass",
    name: "Greg House",
    role: "admin",
    specialty: "Internal Medicine",
    licenseNumber: "MD-1234",
  };

  test("creates the clinician profile, normalises email and never self-assigns admin", async () => {
    const t = convexTest(schema, modules);
    const res = await t.action(api.auth.signIn, { provider: "password", params: signUpParams });
    expect(res.tokens?.token).toBeTruthy();
    const users = await t.run((ctx) => ctx.db.query("users").collect());
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({
      email: "dr.house@example.com",
      name: "Greg House",
      role: "physician",
      specialty: "Internal Medicine",
      licenseNumber: "MD-1234",
    });

    const signIn = await t.action(api.auth.signIn, {
      provider: "password",
      params: { flow: "signIn", email: "dr.house@example.com", password: "Str0ng!pass" },
    });
    expect(signIn.tokens?.token).toBeTruthy();
    await expect(
      t.action(api.auth.signIn, { provider: "password", params: { flow: "signIn", email: "dr.house@example.com", password: "wrong" } }),
    ).rejects.toThrow();
    // still exactly one user (sign-in does not create rows)
    expect(await t.run((ctx) => ctx.db.query("users").collect())).toHaveLength(1);
  });

  test("rejects weak passwords and invalid emails with a readable message", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.action(api.auth.signIn, { provider: "password", params: { ...signUpParams, password: "password" } }),
    ).rejects.toThrow(/uppercase letter, a number and a symbol/);
    await expect(
      t.action(api.auth.signIn, { provider: "password", params: { ...signUpParams, email: "not-an-email" } }),
    ).rejects.toThrow(/valid email/);
  });

  test("password reset reports that email is not configured when AUTH_RESEND_KEY is unset", async () => {
    const t = convexTest(schema, modules);
    await t.action(api.auth.signIn, { provider: "password", params: signUpParams });
    await expect(
      t.action(api.auth.signIn, { provider: "password", params: { flow: "reset", email: "dr.house@example.com" } }),
    ).rejects.toThrow(/not configured/);
  });

  test("sends a 6-digit reset code through Resend when configured", async () => {
    vi.stubEnv("AUTH_RESEND_KEY", "re_test");
    const sent: { to: string[]; text: string }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        sent.push(JSON.parse(String(init.body)));
        return new Response("{}", { status: 200 });
      }),
    );
    const t = convexTest(schema, modules);
    await t.action(api.auth.signIn, { provider: "password", params: signUpParams });
    await t.action(api.auth.signIn, { provider: "password", params: { flow: "reset", email: "dr.house@example.com" } });
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toEqual(["dr.house@example.com"]);
    const code = sent[0].text.match(/code is (\d{6})/)?.[1];
    expect(code).toMatch(/^\d{6}$/);
    const reset = await t.action(api.auth.signIn, {
      provider: "password",
      params: { flow: "reset-verification", email: "dr.house@example.com", code: code!, newPassword: "N3w!password" },
    });
    expect(reset.tokens?.token).toBeTruthy();
    const relogin = await t.action(api.auth.signIn, {
      provider: "password",
      params: { flow: "signIn", email: "dr.house@example.com", password: "N3w!password" },
    });
    expect(relogin.tokens?.token).toBeTruthy();
  });
});

describe("users", () => {
  test("me / updateProfile; signed-out callers are rejected", async () => {
    const t = convexTest(schema, modules);
    expect(await t.query(api.functions.users.me, {})).toBeNull();
    await expect(t.query(api.functions.patients.getPatients, {})).rejects.toThrow(/Unauthenticated/);
    const { as } = await clinician(t, "alice@example.com", "Alice");
    expect(await as.query(api.functions.users.me, {})).toMatchObject({ name: "Alice", role: "physician" });
    await as.mutation(api.functions.users.updateProfile, { name: "Alice B", specialty: "Cardiology" });
    expect(await as.query(api.functions.users.me, {})).toMatchObject({ name: "Alice B", specialty: "Cardiology", role: "physician" });
    await expect(as.mutation(api.functions.users.updateProfile, { name: "  " })).rejects.toThrow(/required/);
  });
});

describe("patients", () => {
  test("numbers patients P-001, P-002, P-003 and lists newest first", async () => {
    const t = convexTest(schema, modules);
    const { as } = await clinician(t, "alice@example.com");
    const ids = [];
    for (const n of ["A", "B", "C"]) ids.push((await as.mutation(api.functions.patients.createPatient, patientInput(n))).customId);
    expect(ids).toEqual(["P-001", "P-002", "P-003"]);
    expect((await as.query(api.functions.patients.getPatients, {})).map((p) => p.customId)).toEqual(["P-003", "P-002", "P-001"]);
  });

  test("clinicians only see their own patients; delete cascades and keeps documents", async () => {
    const t = convexTest(schema, modules);
    const a = (await clinician(t, "alice@example.com")).as;
    const b = (await clinician(t, "bob@example.com")).as;
    const { id } = await a.mutation(api.functions.patients.createPatient, patientInput("Alice's patient"));
    expect(await b.query(api.functions.patients.getPatients, {})).toEqual([]);
    await expect(b.mutation(api.functions.patients.deletePatient, { id })).rejects.toThrow(/not found/);
    expect(await b.query(api.functions.patients.getPatientRecord, { patient: "P-001" })).toBeNull();

    await a.mutation(api.functions.consultations.createConsultation, { patientId: id, symptoms: [], prescriptions: [] });
    await expect(
      b.mutation(api.functions.consultations.createConsultation, { patientId: id, symptoms: [], prescriptions: [] }),
    ).rejects.toThrow(/not found/);
    const { id: docId } = await a.mutation(api.functions.documents.create, {
      name: "letter.txt",
      mimeType: "text/plain",
      size: 40,
      text: "Referral letter about the cough",
      patientId: id,
    });
    await a.mutation(api.functions.appointments.create, {
      patientId: id,
      startsAt: todayStart + 10 * 3_600_000,
      durationMinutes: 15,
      type: "follow-up",
      reason: "Cough review",
    });

    await a.mutation(api.functions.patients.deletePatient, { id });
    expect(await a.query(api.functions.patients.getPatients, {})).toEqual([]);
    const left = await t.run(async (ctx) => ({
      consultations: await ctx.db.query("consultations").collect(),
      appointments: await ctx.db.query("appointments").collect(),
      chunks: await ctx.db.query("knowledgeChunks").collect(),
      documents: await ctx.db.query("documents").collect(),
    }));
    expect(left.consultations).toEqual([]);
    expect(left.appointments).toEqual([]);
    expect(left.documents.map((d) => [d._id, d.patientId])).toEqual([[docId, undefined]]);
    expect(left.chunks.every((c) => c.sourceType === "document" && c.patientId === undefined)).toBe(true);
    expect(left.chunks.length).toBeGreaterThan(0);
  });

  test("updatePatient re-indexes the record for retrieval", async () => {
    const t = convexTest(schema, modules);
    const { as } = await clinician(t, "alice@example.com");
    const { id } = await as.mutation(api.functions.patients.createPatient, patientInput("Jane Roe"));
    expect(await as.query(api.functions.rag.search, { query: "lisinopril" })).toEqual([]);
    await as.mutation(api.functions.patients.updatePatient, {
      id,
      medications: [{ name: "Lisinopril", dose: "10 mg", frequency: "once daily" }],
    });
    const hits = await as.query(api.functions.rag.search, { query: "lisinopril" });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].text).toMatch(/Jane Roe/);
  });
});

describe("sample patients", () => {
  test("loads 20 complete records and a week of appointments; re-loading updates in place", async () => {
    const t = convexTest(schema, modules);
    const { as } = await clinician(t, "alice@example.com");
    // A patient typed in earlier with the same name is completed, not duplicated
    await as.mutation(api.functions.patients.createPatient, patientInput("John Anderson", { age: 50, gender: "Male" }));

    const first = await as.mutation(api.functions.samples.loadSamplePatients, { todayStart });
    expect(first).toEqual({ created: 19, updated: 1, appointments: 24 });
    const patients = await as.query(api.functions.patients.getPatients, {});
    expect(patients).toHaveLength(20);
    for (const p of patients) {
      expect(p.sampleKey).toBeTruthy();
      expect(p.medications?.length ?? 0).toBeGreaterThan(0);
      expect(p.labResults?.length ?? 0).toBeGreaterThan(0);
      expect(p.visits?.length ?? 0).toBeGreaterThan(0);
      expect(p.vitals?.recordedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(p.dateOfBirth).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    const john = patients.find((p) => p.name === "John Anderson")!;
    expect(john).toMatchObject({ customId: "P-001", age: 54, condition: "Hypertension" });

    const again = await as.mutation(api.functions.samples.loadSamplePatients, { todayStart });
    expect(again).toEqual({ created: 0, updated: 20, appointments: 24 });
    expect(await as.query(api.functions.patients.getPatients, {})).toHaveLength(20);
    expect(await t.run((ctx) => ctx.db.query("appointments").collect())).toHaveLength(24);

    const today = await as.query(api.functions.appointments.listRange, { from: todayStart, to: todayStart + DAY });
    expect(today.length).toBe(8);
    expect(today.every((a) => a.patient !== null)).toBe(true);
    expect(samplePatients).toHaveLength(20);
  });

  test("retrieval finds facts across the panel and stays per-clinician", async () => {
    const t = convexTest(schema, modules);
    const a = (await clinician(t, "alice@example.com")).as;
    const b = (await clinician(t, "bob@example.com")).as;
    await a.mutation(api.functions.samples.loadSamplePatients, { todayStart });

    const warfarin = await a.query(api.functions.rag.search, { query: "warfarin INR" });
    expect(warfarin.some((h) => /Michael Davis/.test(h.text))).toBe(true);
    const shellfish = await a.query(api.functions.rag.search, { query: "shellfish anaphylaxis" });
    expect(shellfish[0].text).toMatch(/Priya Sharma/);
    expect(await b.query(api.functions.rag.search, { query: "warfarin" })).toEqual([]);

    const onMetformin = await a.query(api.functions.patients.findPatients, { medication: "metformin" });
    expect(onMetformin.map((p) => p.name).sort()).toEqual(["Aisha Rahman", "Maria Garcia", "Michael Davis"]);
    const highA1c = await a.query(api.functions.patients.findPatients, { labTest: "HbA1c", labFlag: "high" });
    expect(highA1c.map((p) => p.name)).toContain("Ethan Brooks");

    const record = await a.query(api.functions.patients.getPatientRecord, { patient: "olivia martin" });
    expect(record?.patient.chronicConditions).toContain("Pregnancy, 22 weeks (G2P1)");
    expect(record?.appointments.length).toBe(1);

    const roster = await a.query(api.functions.assistant.context, { now: Date.now(), dayStart: todayStart, dayEnd: todayStart + DAY });
    expect(roster.roster).toHaveLength(20);
    expect(roster.today).toHaveLength(8);
  });
});

describe("appointments and consultations", () => {
  test("detects overlaps, supports status changes and completes on consultation", async () => {
    const t = convexTest(schema, modules);
    const { as } = await clinician(t, "alice@example.com");
    const other = (await clinician(t, "bob@example.com")).as;
    const { id: patientId } = await as.mutation(api.functions.patients.createPatient, patientInput("Ann Lee"));
    const at = todayStart + 9 * 3_600_000;
    const apptId = await as.mutation(api.functions.appointments.create, {
      patientId,
      startsAt: at,
      durationMinutes: 30,
      type: "consultation",
      reason: "Cough",
    });
    await expect(
      as.mutation(api.functions.appointments.create, { patientId, startsAt: at + 15 * 60_000, durationMinutes: 15, type: "follow-up", reason: "x" }),
    ).rejects.toThrow(/Overlaps/);
    await as.mutation(api.functions.appointments.create, {
      patientId,
      startsAt: at + 15 * 60_000,
      durationMinutes: 15,
      type: "follow-up",
      reason: "double-booked",
      allowOverlap: true,
    });
    await expect(other.mutation(api.functions.appointments.setStatus, { id: apptId, status: "cancelled" })).rejects.toThrow(/not found/);
    await as.mutation(api.functions.appointments.setStatus, { id: apptId, status: "checked-in" });

    await as.mutation(api.functions.consultations.createConsultation, {
      patientId,
      appointmentId: apptId,
      symptoms: [{ name: "Cough", days: "5" }],
      prescriptions: [{ name: "Azithromycin", timesPerDay: "1", dosage: "500 mg" }],
      diagnosis: "Acute bronchitis",
      notes: "Chest clear",
    });
    const appt = await as.query(api.functions.appointments.get, { id: apptId });
    expect(appt.status).toBe("completed");
    expect(appt.consultationId).toBeTruthy();
    const record = await as.query(api.functions.patients.getPatientRecord, { patient: "P-001" });
    expect(record?.patient.condition).toBe("Acute bronchitis");
    expect(record?.patient.visits?.at(-1)).toMatchObject({ diagnosis: "Acute bronchitis" });
    expect((await as.query(api.functions.rag.search, { query: "bronchitis azithromycin" })).length).toBeGreaterThan(0);
  });
});

describe("documents", () => {
  test("indexes extracted text, supports transcription and deletion", async () => {
    const t = convexTest(schema, modules);
    const { as } = await clinician(t, "alice@example.com");
    const other = (await clinician(t, "bob@example.com")).as;
    const longText = Array.from({ length: 30 }, (_, i) => `Paragraph ${i}: haemoglobin trend discussion for the anaemia workup.`).join("\n\n");
    const { id, status } = await as.mutation(api.functions.documents.create, {
      name: "labs.pdf",
      mimeType: "application/pdf",
      size: 1000,
      text: longText,
    });
    expect(status).toBe("ready");
    const doc = await as.query(api.functions.documents.get, { id, offset: 0, length: 100 });
    expect(doc.text).toHaveLength(100);
    expect(doc.hasMore).toBe(true);
    expect((await as.query(api.functions.rag.search, { query: "haemoglobin", sourceType: "document" })).length).toBeGreaterThan(0);
    await expect(other.query(api.functions.documents.get, { id })).rejects.toThrow(/not found/);

    const storageId = await t.run((ctx) => ctx.storage.store(new Blob(["fake image"], { type: "image/png" })));
    const scan = await as.mutation(api.functions.documents.create, { name: "scan.png", mimeType: "image/png", size: 10, storageId });
    expect(scan.status).toBe("needs-transcription");
    await as.mutation(api.functions.documents.setTranscription, { id: scan.id, text: "Chest X-ray: no consolidation." });
    expect((await as.query(api.functions.rag.search, { query: "consolidation" }))[0].documentId).toBe(scan.id);

    await as.mutation(api.functions.documents.remove, { id: scan.id });
    expect(await as.query(api.functions.rag.search, { query: "consolidation" })).toEqual([]);
  });
});

describe("prediction functions", () => {
  const flu = { symptoms: ["fever", "Cough", "body aches", "chills"], age: 35, gender: "Male" };

  test("preview needs a login and writes nothing; predictHealth records", async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.functions.predict.preview, flu)).rejects.toThrow(/Unauthenticated/);
    const { as } = await clinician(t, "alice@example.com");
    const preview = await as.query(api.functions.predict.preview, flu);
    expect(preview.ranking[0].name).toBe("Influenza");
    expect(await t.run((ctx) => ctx.db.query("predictions").collect())).toEqual([]);

    const res = await as.mutation(api.functions.predict.predictHealth, flu);
    expect(res.predictionId).toBeTruthy();
    expect(res.source).toBe("knowledge-base");
    expect(res.medicines.length).toBeGreaterThan(0);
    const stored = await as.query(api.functions.predict.getPredictions, {});
    expect(stored[0]).toMatchObject({ diseaseName: "Influenza", source: "knowledge-base" });
  });

  test("reports unrecognised input and validates arguments", async () => {
    const t = convexTest(schema, modules);
    const { as } = await clinician(t, "alice@example.com");
    const res = await as.mutation(api.functions.predict.predictHealth, { ...flu, symptoms: ["fever", "banana craving"] });
    expect(res.unmatchedSymptoms).toEqual(["banana craving"]);
    await expect(as.mutation(api.functions.predict.predictHealth, { ...flu, symptoms: ["banana craving"] })).rejects.toThrow(/None of the entered symptoms/);
    await expect(as.mutation(api.functions.predict.predictHealth, { ...flu, symptoms: ["  "] })).rejects.toThrow(/at least one/);
    await expect(as.mutation(api.functions.predict.predictHealth, { ...flu, age: -1 })).rejects.toThrow(/Age/);
  });

  test("screens suggested medicines against the patient's allergies; patient must be the caller's", async () => {
    const t = convexTest(schema, modules);
    const { as } = await clinician(t, "alice@example.com");
    const other = (await clinician(t, "bob@example.com")).as;
    const { id } = await as.mutation(
      api.functions.patients.createPatient,
      patientInput("NSAID allergic", { allergies: [{ substance: "NSAIDs", reaction: "Bronchospasm", severity: "severe" }] }),
    );
    const res = await as.query(api.functions.predict.preview, { ...flu, patientId: id });
    const ibuprofen = res.medicines.find((m) => m.name === "Ibuprofen");
    expect(ibuprofen?.warnings[0]).toMatch(/allergy to nsaid/i);
    expect(res.safetyWarnings.some((w) => w.kind === "allergy")).toBe(true);
    await expect(other.mutation(api.functions.predict.predictHealth, { ...flu, patientId: id })).rejects.toThrow(/Patient not found/);
  });

  test("uses the optional ML service when it answers and falls back when it fails", async () => {
    const t = convexTest(schema, modules);
    const { as } = await clinician(t, "alice@example.com");
    await expect(t.action(api.functions.predict.predictWithMlService, flu)).rejects.toThrow(/Unauthenticated/);
    expect((await as.action(api.functions.predict.predictWithMlService, flu)).source).toBe("knowledge-base");

    vi.stubEnv("ML_SERVICE_URL", "https://ml.example.test/");
    const fetchMock = vi.fn(async () =>
      Response.json({ allPredictions: [{ diseaseName: "COVID-19", confidence: 61.2 }, { diseaseName: "Not A Disease", confidence: 30 }] }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const res = await as.action(api.functions.predict.predictWithMlService, flu);
    expect(fetchMock).toHaveBeenCalledWith("https://ml.example.test/predict", expect.objectContaining({ method: "POST" }));
    expect(res.source).toBe("ml-service");
    expect(res.ranking.map((r) => r.name)).toEqual(["COVID-19"]);

    vi.stubGlobal("fetch", vi.fn(async () => new Response("boom", { status: 500 })));
    expect((await as.action(api.functions.predict.predictWithMlService, flu)).source).toBe("knowledge-base");
  });

  test("knownSymptoms is public (cached for everyone)", async () => {
    const t = convexTest(schema, modules);
    expect((await t.query(api.functions.predict.knownSymptoms, {})).length).toBeGreaterThan(150);
  });
});

describe("predictor", () => {
  test("ranks the textbook cases first", () => {
    const top = (s: string[], age?: number, sex?: string, durationDays?: number) =>
      predict({ symptoms: s, age, sex, durationDays }).ranking[0]?.name;
    expect(top(["fever", "cough", "body aches", "chills"], 34, "female", 3)).toBe("Influenza");
    expect(top(["SOB", "wheeze", "cough"], 12, "male")).toBe("Asthma");
    expect(top(["increased thirst", "frequent urination", "blurred vision"], 55, "female", 60)).toBe("Type 2 Diabetes");
    expect(top(["runny nose, sneezing and sore throat"], 25, undefined, 2)).toBe("Common Cold");
    // Regression: the old weighted-overlap scorer ranked Hyperlipidemia first here
    expect(top(["chest pain", "shortness of breath"], 62, "male")).toBe("Coronary Artery Disease");
  });

  test("uses sex and age", () => {
    const female = predict({ symptoms: ["pelvic pain", "heavy menstrual bleeding"], age: 31, sex: "Female" });
    const male = predict({ symptoms: ["pelvic pain", "heavy menstrual bleeding"], age: 31, sex: "Male" });
    expect(female.ranking[0].name).toBe("Endometriosis");
    expect(male.ranking.map((r) => r.name)).not.toContain("Endometriosis");
    const child = predict({ symptoms: ["memory loss", "confusion"], age: 8 });
    expect(child.ranking[0]?.name).not.toBe("Alzheimer's Disease");
  });

  test("understands synonyms, typos and negation, and keeps 'Cold hands and feet' whole", () => {
    expect(resolveSymptom("throwing up")).toBe("Vomiting");
    expect(resolveSymptom("diarhea")).toBe("Diarrhea");
    expect(resolveSymptom("severe headache for 3 days")).toBe("Headache");
    const r = predict({ symptoms: ["no fever", "tummy ache", "Cold hands and feet"] });
    expect(r.negated).toEqual(["no fever"]);
    expect(r.matchedSymptoms.map((m) => m.name)).toEqual(["Abdominal pain", "Cold hands and feet"]);
  });

  test("raises red flags and probabilities are a distribution", () => {
    const r = predict({ symptoms: ["chest pain", "sweating"], age: 60, sex: "male" });
    expect(r.redFlags.map((f) => f.id)).toContain("acs");
    const anaphylaxis = predict({ symptoms: ["difficulty breathing", "swelling", "hives"], age: 22 });
    expect(anaphylaxis.ranking[0].name).toBe("Anaphylaxis");
    expect(anaphylaxis.medicines[0].name).toBe("Epinephrine");
    const sum = predict({ symptoms: ["fatigue"], limit: 20 }).ranking.reduce((s, x) => s + x.probability, 0);
    expect(sum).toBeLessThanOrEqual(100.5);
  });

  test("is fast: 1,000 predictions well under a second", () => {
    predict({ symptoms: ["fever"] });
    const start = performance.now();
    for (let i = 0; i < 1000; i++) predict({ symptoms: ["fever", "cough", "headache"], age: 40, sex: "male" });
    expect(performance.now() - start).toBeLessThan(1000);
  });
});

describe("medication safety screening", () => {
  test("allergy classes and interactions", () => {
    expect(checkAllergies(["Amoxicillin"], [{ substance: "Penicillin" }])[0].message).toMatch(/penicillin/);
    expect(checkAllergies(["Cefuroxime"], [{ substance: "cephalosporins" }])).toHaveLength(1);
    expect(checkAllergies(["Paracetamol"], [{ substance: "NSAIDs" }])).toEqual([]);
    const ix = checkInteractions(["Warfarin", "Metoprolol"], ["Ciprofloxacin"]);
    expect(ix.map((w) => w.message)).toEqual(["Warfarin + Ciprofloxacin: Raised INR - monitor closely or choose an alternative"]);
    // only pairs that involve a proposed drug are reported
    expect(checkInteractions(["Warfarin", "Aspirin"], ["Paracetamol"])).toEqual([]);
    expect(checkInteractions(["Clopidogrel", "Omeprazole"]).length).toBe(1);
  });

  test("pregnancy and kidney-function contraindications", () => {
    const pregnant = screenMedications({ current: [], proposed: ["Ciprofloxacin", "Cephalexin"], allergies: [], context: { pregnant: true } });
    expect(pregnant).toHaveLength(1);
    expect(pregnant[0]).toMatchObject({ kind: "pregnancy", severity: "major", drugs: ["Ciprofloxacin"] });
    expect(screenMedications({ current: [], proposed: ["Ciprofloxacin"], allergies: [] })).toEqual([]);

    // the strictest eGFR threshold wins
    const metformin = (egfr: number) => screenMedications({ current: ["Metformin"], allergies: [], context: { egfr } });
    expect(metformin(25)).toMatchObject([{ kind: "renal", severity: "major" }]);
    expect(metformin(40)).toMatchObject([{ kind: "renal", severity: "moderate" }]);
    expect(metformin(80)).toEqual([]);

    expect(
      patientSafetyContext({
        chronicConditions: ["Pregnancy, 22 weeks"],
        labResults: [
          { test: "eGFR", value: "44", date: "2026-01-01" },
          { test: "eGFR", value: "38", date: "2026-06-01" },
        ],
      }),
    ).toEqual({ pregnant: true, egfr: 38 });
    expect(patientSafetyContext({ notes: "Pregnancy test negative." }).pregnant).toBe(false);
    expect(patientSafetyContext({ condition: "Hypertension" })).toEqual({ pregnant: false, egfr: undefined });
  });

  test("medicationSafety applies the patient's own pregnancy status and eGFR", async () => {
    const t = convexTest(schema, modules);
    const { as } = await clinician(t, "alice@example.com");
    await as.mutation(api.functions.samples.loadSamplePatients, { todayStart });
    const patients = await as.query(api.functions.patients.getPatients, {});
    const byName = (name: string) => patients.find((p) => p.name === name)!._id;

    const olivia = await as.query(api.functions.patients.medicationSafety, { id: byName("Olivia Martin"), proposed: ["Ciprofloxacin"] });
    expect(olivia.some((w) => w.kind === "pregnancy" && w.drugs[0] === "Ciprofloxacin")).toBe(true);
    const david = await as.query(api.functions.patients.medicationSafety, { id: byName("David Okafor"), proposed: ["Ibuprofen"] });
    expect(david.some((w) => w.kind === "renal" && /eGFR 38/.test(w.message))).toBe(true);
  });
});

describe("chat threads and dashboard", () => {
  test("threads are private; dashboard summarises the day", async () => {
    const t = convexTest(schema, modules);
    const { as } = await clinician(t, "alice@example.com");
    const other = (await clinician(t, "bob@example.com")).as;
    const threadId = await as.mutation(api.functions.chat.createThread, { title: "Today's clinic" });
    await as.mutation(api.functions.chat.addMessage, { threadId, role: "user", content: "Who is first today?" });
    await as.mutation(api.functions.chat.addMessage, {
      threadId,
      role: "assistant",
      content: "James Williams at 08:30.",
      toolCalls: [{ name: "list_appointments", summary: "today" }],
    });
    expect((await as.query(api.functions.chat.getThread, { id: threadId })).messages).toHaveLength(2);
    await expect(other.query(api.functions.chat.getThread, { id: threadId as Id<"chatThreads"> })).rejects.toThrow(/not found/);
    await as.mutation(api.functions.chat.deleteThread, { id: threadId });
    expect(await as.query(api.functions.chat.listThreads, {})).toEqual([]);

    await as.mutation(api.functions.samples.loadSamplePatients, { todayStart });
    const summary = await as.query(api.functions.dashboard.summary, { dayStart: todayStart, dayEnd: todayStart + DAY, now: todayStart });
    expect(summary.patients.total).toBe(20);
    expect(summary.today.total).toBe(8);
    expect(summary.today.next?.patient?.name).toBe("James Williams");
    expect(summary.flaggedLabs.length).toBeGreaterThan(0);
  });
});
