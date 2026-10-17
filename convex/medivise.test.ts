/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { matchSymptoms, scoreDiseases } from "./lib/scoring";

// Same glob as the Convex docs: every module except *.test.ts (more than one dot).
const modules = import.meta.glob("./**/!(*.*.*)*.*s");

const alice = { subject: "uid-alice", email: "alice@example.com", name: "Alice" };
const bob = { subject: "uid-bob", email: "bob@example.com", name: "Bob" };

async function seededBackend() {
  const t = convexTest(schema, modules);
  await t.mutation(internal.functions.seed.seedDatabase, {});
  return t;
}

async function signUp(t: ReturnType<typeof convexTest>, identity: typeof alice, role: "physician" | "admin" = "physician") {
  const as = t.withIdentity(identity);
  await as.mutation(api.functions.auth.upsertCurrentUser, { name: identity.name, role });
  return as;
}

const patientInput = (name: string) => ({
  name,
  age: 40,
  gender: "Female",
  condition: "Cough",
  lastVisit: "2026-10-01",
  status: "active" as const,
  consultationDuration: 120,
  symptoms: [{ name: "Cough", days: "3" }],
  prescriptions: [],
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("seed", () => {
  test("loads the knowledge base with no dropped links and is idempotent", async () => {
    const t = convexTest(schema, modules);
    const first = await t.mutation(internal.functions.seed.seedDatabase, {});
    expect(first.seeded).toBe(true);
    expect(first.skippedLinks).toEqual([]);
    expect(first.inserted).toMatchObject({ diseases: 84 });
    expect(first.inserted!.symptoms).toBeGreaterThan(150);
    expect(first.inserted!.diseaseSymptoms).toBe(357);

    const again = await t.mutation(internal.functions.seed.seedDatabase, {});
    expect(again.seeded).toBe(false);
    const rows = await t.run((ctx) => ctx.db.query("diseases").collect());
    expect(rows).toHaveLength(84);

    const reset = await t.mutation(internal.functions.seed.seedDatabase, { reset: true });
    expect(reset.seeded).toBe(true);
    expect(await t.run((ctx) => ctx.db.query("diseases").collect())).toHaveLength(84);
  });

  test("is internal-only: absent from the public api (checked by tsc)", () => {
    // @ts-expect-error seedDatabase is an internalMutation, so clients cannot call it
    void api.functions.seed.seedDatabase;
  });
});

describe("auth + patients", () => {
  test("rejects signed-out access", async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.functions.patients.getPatients, {})).rejects.toThrow(/Unauthenticated/);
    await expect(
      t.mutation(api.functions.auth.upsertCurrentUser, { name: "X", role: "physician" }),
    ).rejects.toThrow(/Unauthenticated/);
  });

  test("a signed-in user without a profile is told to create one", async () => {
    const t = convexTest(schema, modules);
    await expect(t.withIdentity(alice).query(api.functions.patients.getPatients, {})).rejects.toThrow(
      /profile not found/,
    );
  });

  test("profile uses the token's uid/email and never self-assigns admin", async () => {
    const t = convexTest(schema, modules);
    const as = await signUp(t, alice, "admin");
    const me = await as.query(api.functions.auth.getCurrentUser, {});
    expect(me).toMatchObject({ firebaseUid: "uid-alice", email: "alice@example.com", role: "physician" });
    // calling again updates the profile but does not change the role or duplicate the row
    await as.mutation(api.functions.auth.upsertCurrentUser, { name: "Alice B", role: "admin", specialty: "Cardiology" });
    expect(await as.query(api.functions.auth.getCurrentUser, {})).toMatchObject({ name: "Alice B", role: "physician", specialty: "Cardiology" });
    expect(await t.run((ctx) => ctx.db.query("users").collect())).toHaveLength(1);
  });

  test("numbers patients P-001, P-002, P-003 (regression: .unique() threw on the 2nd patient)", async () => {
    const t = convexTest(schema, modules);
    const as = await signUp(t, alice);
    const ids = [];
    for (const n of ["A", "B", "C"]) ids.push((await as.mutation(api.functions.patients.createPatient, patientInput(n))).customId);
    expect(ids).toEqual(["P-001", "P-002", "P-003"]);
    const list = await as.query(api.functions.patients.getPatients, {});
    expect(list.map((p) => p.customId)).toEqual(["P-003", "P-002", "P-001"]);
  });

  test("clinicians only see and delete their own patients; delete cascades", async () => {
    const t = convexTest(schema, modules);
    const a = await signUp(t, alice);
    const b = await signUp(t, bob);
    const { id } = await a.mutation(api.functions.patients.createPatient, patientInput("Alice's patient"));
    expect(await b.query(api.functions.patients.getPatients, {})).toEqual([]);
    await expect(b.mutation(api.functions.patients.deletePatient, { id })).rejects.toThrow(/not found/);

    await a.mutation(api.functions.consultations.createConsultation, { patientId: id, symptoms: [], prescriptions: [] });
    await expect(
      b.mutation(api.functions.consultations.createConsultation, { patientId: id, symptoms: [], prescriptions: [] }),
    ).rejects.toThrow(/not found/);

    await a.mutation(api.functions.patients.deletePatient, { id });
    expect(await a.query(api.functions.patients.getPatients, {})).toEqual([]);
    expect(await t.run((ctx) => ctx.db.query("consultations").collect())).toEqual([]);
  });

  test("knowledge-base edits are admin-only", async () => {
    const t = await seededBackend();
    const doc = await signUp(t, alice);
    await expect(
      doc.mutation(api.functions.diseases.createDisease, { name: "X", description: "x", category: "x" }),
    ).rejects.toThrow(/administrators/);
    await expect(
      t.mutation(api.functions.diseases.createDisease, { name: "X", description: "x", category: "x" }),
    ).rejects.toThrow(/Unauthenticated/);
    // reads need a login too
    await expect(t.query(api.functions.diseases.getDiseases, {})).rejects.toThrow(/Unauthenticated/);
    expect((await doc.query(api.functions.diseases.getDiseases, {})).length).toBe(84);
  });
});

describe("predictHealth", () => {
  const flu = { symptoms: ["fever", "Cough", "body aches", "chills"], age: 35, gender: "Male" };

  test("rejects signed-out callers", async () => {
    const t = await seededBackend();
    await expect(t.action(api.functions.predict.predictHealth, flu)).rejects.toThrow(/Unauthenticated/);
  });

  test("uses the built-in scorer when no ML service is configured", async () => {
    const t = await seededBackend();
    const as = await signUp(t, alice);
    const res = await as.action(api.functions.predict.predictHealth, flu);
    expect(res.source).toBe("knowledge-base");
    expect(res.disease.name).toBe("Influenza");
    expect(res.disease.confidence).toBeGreaterThan(0);
    expect(res.allPredictions.length).toBeGreaterThan(1);
    expect(res.matchedSymptoms).toEqual(expect.arrayContaining(["Fever", "Cough", "Body aches", "Chills"]));
    expect(res.medicines.length).toBeGreaterThan(0);
    expect(res.medicines.map((m) => m.confidence)).toEqual([...res.medicines.map((m) => m.confidence)].sort((x, y) => y - x));
    const stored = await as.query(api.functions.predict.getPredictions, {});
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ diseaseName: "Influenza", source: "knowledge-base" });
  });

  test("reports unrecognised symptoms instead of ignoring them", async () => {
    const t = await seededBackend();
    const as = await signUp(t, alice);
    const res = await as.action(api.functions.predict.predictHealth, { ...flu, symptoms: ["fever", "banana craving"] });
    expect(res.unmatchedSymptoms).toEqual(["banana craving"]);
    await expect(
      as.action(api.functions.predict.predictHealth, { ...flu, symptoms: ["banana craving"] }),
    ).rejects.toThrow(/None of the entered symptoms/);
    await expect(as.action(api.functions.predict.predictHealth, { ...flu, symptoms: ["  "] })).rejects.toThrow(/at least one/);
    await expect(as.action(api.functions.predict.predictHealth, { ...flu, age: -1 })).rejects.toThrow(/Age/);
  });

  test("attaches to a patient only if it is the caller's", async () => {
    const t = await seededBackend();
    const a = await signUp(t, alice);
    const b = await signUp(t, bob);
    const { id } = await a.mutation(api.functions.patients.createPatient, patientInput("P"));
    expect((await a.action(api.functions.predict.predictHealth, { ...flu, patientId: id })).predictionId).toBeTruthy();
    await expect(b.action(api.functions.predict.predictHealth, { ...flu, patientId: id })).rejects.toThrow(/Patient not found/);
  });

  test("uses the ML service when it answers, mapping disease names to ids", async () => {
    vi.stubEnv("ML_SERVICE_URL", "https://ml.example.test/");
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          allPredictions: [
            { diseaseName: "COVID-19", confidence: 61.2 },
            { diseaseName: "Not A Real Disease", confidence: 30 },
            { diseaseName: "influenza", confidence: 20 },
          ],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const t = await seededBackend();
    const as = await signUp(t, alice);
    const res = await as.action(api.functions.predict.predictHealth, flu);
    expect(fetchMock).toHaveBeenCalledWith("https://ml.example.test/predict", expect.objectContaining({ method: "POST" }));
    expect(res.source).toBe("ml-service");
    expect(res.disease).toMatchObject({ name: "COVID-19", confidence: 61.2 });
    expect(res.allPredictions.map((p) => p.diseaseName)).toEqual(["COVID-19", "influenza"]);
  });

  test("falls back to the built-in scorer when the ML service is down or answers with errors", async () => {
    vi.stubEnv("ML_SERVICE_URL", "http://localhost:8000");
    const t = await seededBackend();
    const as = await signUp(t, alice);
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("fetch failed"); }));
    expect((await as.action(api.functions.predict.predictHealth, flu)).source).toBe("knowledge-base");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("boom", { status: 500 })));
    expect((await as.action(api.functions.predict.predictHealth, flu)).source).toBe("knowledge-base");
  });
});

describe("scoring", () => {
  const known = [
    { id: "s1", name: "Fever" },
    { id: "s2", name: "Sore throat" },
    { id: "s3", name: "Shortness of breath" },
  ];
  test("matches exact, contained and unique-substring phrases", () => {
    const r = matchSymptoms(["FEVER", "high fever", "sore-throat", "breath", "zzz"], known);
    expect(r.matched.map((m) => m.name)).toEqual(["Fever", "Sore throat", "Shortness of breath"]);
    expect(r.unmatched).toEqual(["zzz"]);
  });
  test("weighted overlap is capped at 99 and sorted", () => {
    const links = [
      { diseaseId: "dA", symptomId: "s1", weight: 1 },
      { diseaseId: "dB", symptomId: "s1", weight: 0.5 },
      { diseaseId: "dB", symptomId: "s2", weight: 0.5 },
    ];
    expect(scoreDiseases(["s1"], links)).toEqual([
      { diseaseId: "dA", confidence: 99, matchedCount: 1 },
      { diseaseId: "dB", confidence: 50, matchedCount: 1 },
    ]);
    expect(scoreDiseases(["nope"], links)).toEqual([]);
  });
});
