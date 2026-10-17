/**
 * Symptom matching and disease scoring for the built-in knowledge base.
 *
 * Score for a disease = (sum of weights of the entered symptoms it lists) / (sum of all its
 * symptom weights). It is a weighted overlap ("how much of this disease's symptom profile is
 * present"), NOT a calibrated probability, and it ignores age and gender.
 */

export interface KnownSymptom<Id extends string = string> {
  id: Id;
  name: string;
}

export interface DiseaseLink<Id extends string = string> {
  diseaseId: Id;
  symptomId: string;
  weight: number;
}

export interface SymptomMatch<Id extends string = string> {
  matched: { input: string; symptomId: Id; name: string }[];
  unmatched: string[];
}

export interface DiseaseScore<Id extends string = string> {
  diseaseId: Id;
  confidence: number;
  matchedCount: number;
}

export const normalizeSymptom = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Maps free-text symptoms onto known symptom names:
 * exact (case/punctuation-insensitive) match, else a known name contained in the text
 * ("high fever" -> "Fever", longest wins), else the text contained in exactly one known name.
 */
export function matchSymptoms<Id extends string>(
  entered: string[],
  known: KnownSymptom<Id>[],
): SymptomMatch<Id> {
  const normalizedKnown = known.map((k) => ({ ...k, key: normalizeSymptom(k.name) }));
  const byKey = new Map(normalizedKnown.map((k) => [k.key, k]));
  const matched: SymptomMatch<Id>["matched"] = [];
  const unmatched: string[] = [];
  const seen = new Set<string>();

  for (const raw of entered) {
    const key = normalizeSymptom(raw);
    if (!key) continue;

    let hit = byKey.get(key);
    if (!hit) {
      const contained = normalizedKnown
        .filter((k) => k.key.length >= 3 && ` ${key} `.includes(` ${k.key} `))
        .sort((a, b) => b.key.length - a.key.length);
      hit = contained[0];
    }
    if (!hit && key.length >= 4) {
      const containing = normalizedKnown.filter((k) => ` ${k.key} `.includes(` ${key} `));
      if (containing.length === 1) hit = containing[0];
    }

    if (!hit) {
      unmatched.push(raw.trim());
    } else if (!seen.has(hit.id)) {
      seen.add(hit.id);
      matched.push({ input: raw.trim(), symptomId: hit.id, name: hit.name });
    }
  }
  return { matched, unmatched };
}

/** Ranks diseases by weighted overlap with the matched symptoms (best first, at most `limit`). */
export function scoreDiseases<Id extends string>(
  matchedSymptomIds: string[],
  links: DiseaseLink<Id>[],
  limit = 5,
): DiseaseScore<Id>[] {
  const wanted = new Set(matchedSymptomIds);
  const totals = new Map<Id, { all: number; hit: number; count: number }>();

  for (const link of links) {
    const t = totals.get(link.diseaseId) ?? { all: 0, hit: 0, count: 0 };
    t.all += link.weight;
    if (wanted.has(link.symptomId)) {
      t.hit += link.weight;
      t.count += 1;
    }
    totals.set(link.diseaseId, t);
  }

  return [...totals.entries()]
    .filter(([, t]) => t.hit > 0 && t.all > 0)
    .map(([diseaseId, t]) => ({
      diseaseId,
      confidence: Math.min(99, Math.round((t.hit / t.all) * 1000) / 10),
      matchedCount: t.count,
    }))
    .sort((a, b) => b.confidence - a.confidence || b.matchedCount - a.matchedCount)
    .slice(0, limit);
}
