/**
 * Fast, in-memory condition predictor over the bundled knowledge base (convex/data/*).
 *
 * The index is built once per JS isolate (lazily, ~1 ms) and every prediction is a pure,
 * synchronous computation - no database reads - so it runs in microseconds inside a query,
 * a mutation, or the Vercel API functions.
 *
 * Model (naive-Bayes style, positive findings only):
 *   log score(d) = log prior(d | age, sex, duration)
 *                + sum over reported symptoms s of log P(s | d)        (weight, or EPSILON if d does not list s)
 *                + sum over d's symptoms not reported of log(1 - MISSING_PENALTY * weight)
 * Scores are normalised with a softmax over every disease, giving a probability *within this
 * knowledge base*. The data are demonstration values, so the output is decision support only,
 * not a calibrated clinical probability.
 */
import { symptomSynonyms, redFlagRules } from "../data/clinicalRules";
import { diseases } from "../data/diseases";
import { diseaseMedicineMappings, diseaseSymptomMappings } from "../data/mappings";
import { medicines } from "../data/medicines";
import { diseaseProfiles, type DiseaseProfile } from "../data/profiles";
import { symptoms } from "../data/symptoms";

export const PREDICTOR_VERSION = "kb-bayes-v2";

const EPSILON = 0.03; // P(symptom | disease) for a symptom the disease does not list
const MISSING_PENALTY = 0.4; // how much an unreported key symptom counts against a disease
const PREVALENCE_PRIOR: Record<DiseaseProfile["prevalence"], number> = { 1: 0.25, 2: 0.5, 3: 1, 4: 2, 5: 3 };
const OUT_OF_AGE_RANGE = 0.001; // e.g. Alzheimer's at 8 - must lose to any plausible alternative
const SILENT_PRIOR = 0.2; // conditions usually found by measurement, not by symptoms
const MAX_INPUTS = 40;

export type Sex = "female" | "male";

export interface PredictInput {
  symptoms: string[];
  age?: number;
  sex?: string;
  /** Longest reported symptom duration in days, used to separate acute from chronic conditions. */
  durationDays?: number;
  limit?: number;
}

export interface RankedCondition {
  name: string;
  category: string;
  description: string;
  /** Probability within the knowledge base, 0-100 (1 decimal). */
  probability: number;
  /** Share of the condition's weighted symptom profile that was reported, 0-100. */
  coverage: number;
  matchedSymptoms: string[];
  /** Reported symptoms this condition does not explain. */
  unexplainedSymptoms: string[];
  /** Strong symptoms of this condition that were not reported - worth asking about. */
  askAbout: string[];
  urgent: boolean;
}

export interface MedicineSuggestion {
  name: string;
  description?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  contraindications?: string;
  /** How commonly the medicine is used for the condition in the seed data, 0-100. */
  confidence: number;
}

export interface RedFlag {
  id: string;
  title: string;
  advice: string;
}

export interface PredictOutput {
  model: string;
  ranking: RankedCondition[];
  matchedSymptoms: { input: string; name: string }[];
  unmatchedSymptoms: string[];
  /** "Did you mean" suggestions for unmatched inputs. */
  suggestions: Record<string, string[]>;
  /** Inputs phrased as negatives ("no fever"); they are ignored, not treated as present. */
  negated: string[];
  redFlags: RedFlag[];
  /** Treatment options for the top-ranked condition. */
  medicines: MedicineSuggestion[];
  treatmentNotes: string[];
  demographicsUsed: { age?: number; sex?: Sex; durationDays?: number };
}

interface IndexedDisease {
  name: string;
  category: string;
  description: string;
  profile: DiseaseProfile;
  weights: Map<string, number>;
  bySymptomWeight: [string, number][];
  totalWeight: number;
  logMissingAll: number;
}

interface Index {
  symptomNames: string[];
  byKey: Map<string, string>;
  keys: string[];
  diseases: IndexedDisease[];
  diseaseByKey: Map<string, IndexedDisease>;
  medicinesByDisease: Map<string, MedicineSuggestion[]>;
  notesByDisease: Map<string, string[]>;
}

export const normalizeTerm = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();

let cached: Index | null = null;

function buildIndex(): Index {
  const symptomNames = [...new Set(symptoms.map((s) => s.name))].sort((a, b) => a.localeCompare(b));
  const byKey = new Map<string, string>();
  for (const name of symptomNames) byKey.set(normalizeTerm(name), name);
  for (const [term, name] of Object.entries(symptomSynonyms)) {
    const key = normalizeTerm(term);
    if (!byKey.has(key) && symptomNames.includes(name)) byKey.set(key, name);
  }

  const links = new Map<string, Map<string, number>>();
  for (const m of diseaseSymptomMappings) {
    const map = links.get(m.disease) ?? new Map<string, number>();
    map.set(m.symptom, Math.max(map.get(m.symptom) ?? 0, m.weight));
    links.set(m.disease, map);
  }

  const indexed: IndexedDisease[] = [];
  const diseaseByKey = new Map<string, IndexedDisease>();
  const seen = new Set<string>();
  for (const d of diseases) {
    if (seen.has(d.name)) continue;
    seen.add(d.name);
    const profile = diseaseProfiles[d.name] ?? { prevalence: 2, course: "either" };
    const weights = links.get(d.name);
    if (profile.aliasOf || !weights || weights.size === 0) continue;
    const bySymptomWeight = [...weights.entries()].sort((a, b) => b[1] - a[1]);
    const entry: IndexedDisease = {
      name: d.name,
      category: d.category,
      description: d.description,
      profile,
      weights,
      bySymptomWeight,
      totalWeight: bySymptomWeight.reduce((sum, [, w]) => sum + w, 0),
      logMissingAll: bySymptomWeight.reduce((sum, [, w]) => sum + Math.log(1 - MISSING_PENALTY * w), 0),
    };
    indexed.push(entry);
    diseaseByKey.set(normalizeTerm(d.name), entry);
  }
  for (const d of diseases) {
    const alias = diseaseProfiles[d.name]?.aliasOf;
    const target = alias ? diseaseByKey.get(normalizeTerm(alias)) : undefined;
    if (target) diseaseByKey.set(normalizeTerm(d.name), target);
  }

  const medicineByName = new Map<string, (typeof medicines)[number]>();
  for (const m of medicines) if (!medicineByName.has(m.name)) medicineByName.set(m.name, m);
  const medicinesByDisease = new Map<string, MedicineSuggestion[]>();
  const notesByDisease = new Map<string, string[]>();
  for (const row of diseaseMedicineMappings as { disease: string; medicine?: string; confidence?: number; note?: string }[]) {
    if (row.note) {
      notesByDisease.set(row.disease, [...(notesByDisease.get(row.disease) ?? []), row.note]);
      continue;
    }
    const med = row.medicine ? medicineByName.get(row.medicine) : undefined;
    if (!med || row.confidence === undefined) continue;
    const list = medicinesByDisease.get(row.disease) ?? [];
    if (!list.some((m) => m.name === med.name)) {
      const info = med as MedicineSuggestion;
      list.push({
        name: med.name,
        description: info.description,
        dosage: info.dosage,
        frequency: info.frequency,
        duration: info.duration,
        contraindications: info.contraindications,
        confidence: row.confidence,
      });
    }
    medicinesByDisease.set(row.disease, list);
  }
  for (const list of medicinesByDisease.values()) list.sort((a, b) => b.confidence - a.confidence);

  return {
    symptomNames,
    byKey,
    keys: [...byKey.keys()].sort((a, b) => b.length - a.length),
    diseases: indexed,
    diseaseByKey,
    medicinesByDisease,
    notesByDisease,
  };
}

function index(): Index {
  cached ??= buildIndex();
  return cached;
}

/** Bounded Levenshtein distance (returns limit + 1 as soon as it is exceeded). */
function editDistance(a: string, b: string, limit: number): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
      best = Math.min(best, row[j]);
    }
    if (best > limit) return limit + 1;
    prev = row;
  }
  return prev[b.length];
}

/** Splits "fever, cough and headache" into separate terms (but keeps "Cold hands and feet"). */
function splitInputs(raw: string[]): string[] {
  const idx = index();
  return raw
    .flatMap((s) => (idx.byKey.has(normalizeTerm(s)) ? [s] : s.split(/[,;\n]|\band\b|&|\+/i)))
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_INPUTS);
}

const NEGATION = /^(no|not|denies|denied|without|absent|negative for)\b/i;

/** Resolves one free-text term to a known symptom name, or null. */
export function resolveSymptom(raw: string): string | null {
  const idx = index();
  const key = normalizeTerm(raw);
  if (!key) return null;
  const direct = idx.byKey.get(key) ?? (key.endsWith("s") ? idx.byKey.get(key.slice(0, -1)) : undefined);
  if (direct) return direct;

  // A known term inside a longer phrase ("severe headache for 3 days"), longest first
  const padded = ` ${key} `;
  for (const k of idx.keys) {
    if (k.length >= 3 && padded.includes(` ${k} `)) return idx.byKey.get(k)!;
  }
  // The phrase inside exactly one known term ("swallowing" -> "Difficulty swallowing")
  if (key.length >= 4) {
    const containing = new Set(idx.keys.filter((k) => ` ${k} `.includes(` ${key} `)).map((k) => idx.byKey.get(k)!));
    if (containing.size === 1) return [...containing][0];
  }
  // Typos ("diarhea", "headche")
  if (key.length >= 4) {
    const limit = key.length >= 7 ? 2 : 1;
    let best: string | null = null;
    let bestDistance = limit + 1;
    let tie = false;
    for (const k of idx.keys) {
      const d = editDistance(key, k, limit);
      if (d < bestDistance) {
        bestDistance = d;
        best = idx.byKey.get(k)!;
        tie = false;
      } else if (d === bestDistance && best !== idx.byKey.get(k)) {
        tie = true;
      }
    }
    if (best && !tie) return best;
  }
  return null;
}

function suggest(raw: string): string[] {
  const idx = index();
  const key = normalizeTerm(raw);
  const words = new Set(key.split(" ").filter((w) => w.length >= 3));
  const scored = idx.symptomNames
    .map((name) => {
      const nk = normalizeTerm(name);
      const shared = nk.split(" ").filter((w) => words.has(w)).length;
      return { name, score: shared * 10 - editDistance(key, nk, 6) };
    })
    .filter((s) => s.score > -5)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map((s) => s.name);
}

export function normalizeSex(sex?: string): Sex | undefined {
  const s = sex?.trim().toLowerCase();
  if (!s) return undefined;
  if (["f", "female", "woman", "girl"].includes(s)) return "female";
  if (["m", "male", "man", "boy"].includes(s)) return "male";
  return undefined;
}

function prior(profile: DiseaseProfile, age?: number, sex?: Sex, durationDays?: number): number {
  let p = PREVALENCE_PRIOR[profile.prevalence] * (profile.silent ? SILENT_PRIOR : 1);
  if (profile.sex && sex && profile.sex !== sex) return 0;
  if (age !== undefined) {
    if ((profile.minAge !== undefined && age < profile.minAge) || (profile.maxAge !== undefined && age > profile.maxAge)) {
      p *= OUT_OF_AGE_RANGE;
    } else if (profile.typicalAge && (age < profile.typicalAge[0] || age > profile.typicalAge[1])) {
      p *= 0.5;
    }
  }
  if (durationDays !== undefined) {
    if (profile.course === "acute" && durationDays > 28) p *= 0.35;
    if (profile.course === "chronic" && durationDays < 3) p *= 0.6;
  }
  return p;
}

export function predict(input: PredictInput): PredictOutput {
  const idx = index();
  const limit = Math.min(Math.max(input.limit ?? 5, 1), 20);
  const age = input.age !== undefined && Number.isFinite(input.age) && input.age >= 0 ? input.age : undefined;
  const sex = normalizeSex(input.sex);
  const durationDays =
    input.durationDays !== undefined && Number.isFinite(input.durationDays) && input.durationDays >= 0
      ? input.durationDays
      : undefined;

  const matched: { input: string; name: string }[] = [];
  const unmatched: string[] = [];
  const suggestions: Record<string, string[]> = {};
  const present = new Set<string>();
  const negated: string[] = [];
  for (const term of splitInputs(input.symptoms)) {
    if (NEGATION.test(term)) {
      negated.push(term);
      continue;
    }
    const name = resolveSymptom(term);
    if (!name) {
      unmatched.push(term);
      suggestions[term] = suggest(term);
    } else if (!present.has(name)) {
      present.add(name);
      matched.push({ input: term, name });
    }
  }

  const redFlags = redFlagRules
    .filter((rule) => rule.requires.every((group) => group.some((s) => present.has(s))))
    .filter((rule) => rule.maxAgeYears === undefined || (age !== undefined && age <= rule.maxAgeYears))
    .filter((rule) => rule.minAgeYears === undefined || (age !== undefined && age >= rule.minAgeYears))
    .map(({ id, title, advice }) => ({ id, title, advice }));

  const demographicsUsed = { age, sex, durationDays };
  if (present.size === 0) {
    return {
      model: PREDICTOR_VERSION,
      ranking: [],
      matchedSymptoms: matched,
      unmatchedSymptoms: unmatched,
      suggestions,
      negated,
      redFlags,
      medicines: [],
      treatmentNotes: [],
      demographicsUsed,
    };
  }

  const scored: { d: IndexedDisease; logp: number; hits: string[] }[] = [];
  for (const d of idx.diseases) {
    const p = prior(d.profile, age, sex, durationDays);
    if (p <= 0) continue;
    let logp = Math.log(p) + d.logMissingAll;
    const hits: string[] = [];
    for (const s of present) {
      const w = d.weights.get(s);
      if (w === undefined) {
        logp += Math.log(EPSILON);
      } else {
        hits.push(s);
        // swap the "missing" term for the "present" term
        logp += Math.log(w) - Math.log(1 - MISSING_PENALTY * w);
      }
    }
    scored.push({ d, logp, hits });
  }

  const max = Math.max(...scored.map((s) => s.logp));
  const total = scored.reduce((sum, s) => sum + Math.exp(s.logp - max), 0);
  const ranking: RankedCondition[] = scored
    .filter((s) => s.hits.length > 0)
    .sort((a, b) => b.logp - a.logp)
    .slice(0, limit)
    .map(({ d, logp, hits }) => ({
      name: d.name,
      category: d.category,
      description: d.description,
      probability: Math.round((Math.exp(logp - max) / total) * 1000) / 10,
      coverage: Math.round((hits.reduce((sum, s) => sum + (d.weights.get(s) ?? 0), 0) / d.totalWeight) * 100),
      matchedSymptoms: hits,
      unexplainedSymptoms: [...present].filter((s) => !d.weights.has(s)),
      askAbout: d.bySymptomWeight
        .filter(([s, w]) => !present.has(s) && w >= 0.4)
        .slice(0, 3)
        .map(([s]) => s),
      urgent: Boolean(d.profile.urgent),
    }));

  const top = ranking[0];
  return {
    model: PREDICTOR_VERSION,
    ranking,
    matchedSymptoms: matched,
    unmatchedSymptoms: unmatched,
    suggestions,
    negated,
    redFlags,
    medicines: top ? idx.medicinesByDisease.get(top.name) ?? [] : [],
    treatmentNotes: top ? idx.notesByDisease.get(top.name) ?? [] : [],
    demographicsUsed,
  };
}

/** Every symptom name the predictor understands (for autocomplete). */
export function knownSymptomNames(): string[] {
  return index().symptomNames;
}

export interface DiseaseInfo {
  name: string;
  category: string;
  description: string;
  profile: DiseaseProfile;
  symptoms: { name: string; weight: number }[];
  medicines: MedicineSuggestion[];
  notes: string[];
}

/** Knowledge-base entry for a condition, matched case- and punctuation-insensitively. */
export function diseaseInfo(name: string): DiseaseInfo | null {
  const idx = index();
  const key = normalizeTerm(name);
  let d = idx.diseaseByKey.get(key);
  if (!d && key.length >= 3) {
    const partial = idx.diseases.filter((x) => normalizeTerm(x.name).includes(key));
    if (partial.length === 1) d = partial[0];
  }
  if (!d) return null;
  return {
    name: d.name,
    category: d.category,
    description: d.description,
    profile: d.profile,
    symptoms: d.bySymptomWeight.map(([s, weight]) => ({ name: s, weight })),
    medicines: idx.medicinesByDisease.get(d.name) ?? [],
    notes: idx.notesByDisease.get(d.name) ?? [],
  };
}

export function diseaseNames(): string[] {
  return index().diseases.map((d) => d.name);
}
