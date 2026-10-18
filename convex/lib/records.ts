/**
 * Turns patient records into plain-text sections for retrieval (knowledgeChunks) and for the
 * assistant's tools. Pure functions, shared by Convex functions and the /api serverless code.
 */
import type { Doc } from "../_generated/dataModel";

type Patient = Doc<"patients">;

export interface RecordSection {
  title: string;
  text: string;
}

const has = <T>(xs: T[] | undefined): xs is T[] => Array.isArray(xs) && xs.length > 0;

export function patientLabel(p: Pick<Patient, "customId" | "name" | "age" | "gender">): string {
  return `${p.customId} ${p.name} (${p.age}${p.gender ? ` ${p.gender.charAt(0).toUpperCase()}` : ""})`;
}

export function bmi(weightKg: number, heightCm: number): number | null {
  if (!weightKg || !heightCm) return null;
  return Math.round((weightKg / (heightCm / 100) ** 2) * 10) / 10;
}

/** The record split into sections; each section's text starts with the patient label. */
export function patientSections(p: Patient): RecordSection[] {
  const label = patientLabel(p);
  const sections: RecordSection[] = [];
  const add = (title: string, lines: (string | false | undefined | null)[]) => {
    const body = lines.filter(Boolean).join("\n");
    if (body.trim()) sections.push({ title: `${label} - ${title}`, text: `Patient ${label} - ${title}\n${body}` });
  };

  add("Profile", [
    `Status: ${p.status}. Main condition / reason: ${p.condition}. Last visit: ${p.lastVisit}.`,
    p.dateOfBirth && `Date of birth: ${p.dateOfBirth}.`,
    p.bloodType && `Blood type: ${p.bloodType}.`,
    has(p.chronicConditions) && `Chronic conditions: ${p.chronicConditions.join("; ")}.`,
    p.insurance && `Insurance: ${p.insurance}.`,
    (p.phone || p.email) && `Contact: ${[p.phone, p.email].filter(Boolean).join(", ")}.`,
    p.address && `Address: ${p.address}.`,
    p.emergencyContact &&
      `Emergency contact: ${p.emergencyContact.name} (${p.emergencyContact.relation}) ${p.emergencyContact.phone}.`,
    p.socialHistory && `Social history: ${p.socialHistory}`,
    p.familyHistory && `Family history: ${p.familyHistory}`,
    has(p.immunizations) && `Immunizations: ${p.immunizations.join("; ")}.`,
  ]);

  add("Medications and allergies", [
    has(p.allergies)
      ? `Allergies: ${p.allergies.map((a) => `${a.substance} (${a.reaction}, ${a.severity})`).join("; ")}.`
      : "Allergies: none recorded (NKDA not confirmed).",
    has(p.medications) &&
      `Current medications: ${p.medications
        .map((m) => `${m.name} ${m.dose} ${m.frequency}${m.indication ? ` for ${m.indication}` : ""}${m.startedOn ? ` (since ${m.startedOn})` : ""}`)
        .join("; ")}.`,
    has(p.prescriptions) &&
      `Prescribed at last consultation: ${p.prescriptions
        .map((r) => `${r.name}${r.dosage ? ` ${r.dosage}` : ""}${r.timesPerDay ? ` ${r.timesPerDay}x/day` : ""}`)
        .join("; ")}.`,
  ]);

  const v = p.vitals;
  add("Vitals and lab results", [
    v &&
      `Vitals (${v.recordedOn}): BP ${v.bloodPressure} mmHg, HR ${v.heartRate}/min, temp ${v.temperatureC} C, RR ${v.respiratoryRate}/min, SpO2 ${v.spo2}%, weight ${v.weightKg} kg, height ${v.heightCm} cm${bmi(v.weightKg, v.heightCm) ? `, BMI ${bmi(v.weightKg, v.heightCm)}` : ""}.`,
    has(p.labResults) &&
      `Labs: ${p.labResults
        .map((l) => `${l.test} ${l.value} ${l.unit} (ref ${l.referenceRange}, ${l.date})${l.flag ? ` [${l.flag}]` : ""}`)
        .join("; ")}.`,
  ]);

  add("Current presentation and notes", [
    has(p.symptoms) && `Current symptoms: ${p.symptoms.map((s) => `${s.name}${s.days ? ` for ${s.days} days` : ""}`).join("; ")}.`,
    p.notes && `Clinical notes: ${p.notes}`,
    p.aiReview && `Last AI review: ${p.aiReview}`,
  ]);

  for (const visit of p.visits ?? []) {
    add(`Visit ${visit.date}`, [`Reason: ${visit.reason}. Diagnosis: ${visit.diagnosis}.`, visit.notes && `Notes: ${visit.notes}`]);
  }
  return sections;
}

/** One-line roster entry for the assistant's system prompt. */
export function patientSummaryLine(
  p: Patient,
  extra: { nextAppointment?: string } = {},
): string {
  const parts = [
    patientLabel(p),
    p.status,
    has(p.chronicConditions) ? p.chronicConditions.join(", ") : p.condition,
    has(p.allergies) ? `allergies: ${p.allergies.map((a) => a.substance).join(", ")}` : undefined,
    has(p.medications) ? `meds: ${p.medications.map((m) => m.name).join(", ")}` : undefined,
    `last visit ${p.lastVisit}`,
    extra.nextAppointment ? `next appt ${extra.nextAppointment}` : undefined,
  ];
  return parts.filter(Boolean).join(" | ");
}

/** Splits long text into overlapping chunks on paragraph / sentence boundaries. */
export function chunkText(text: string, size = 1200, overlap = 150): string[] {
  const clean = text.replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];
  if (clean.length <= size) return [clean];
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + size, clean.length);
    if (end < clean.length) {
      const window = clean.slice(start, end);
      const breakAt = Math.max(window.lastIndexOf("\n\n"), window.lastIndexOf(". "), window.lastIndexOf("\n"));
      if (breakAt > size * 0.5) end = start + breakAt + 1;
    }
    chunks.push(clean.slice(start, end).trim());
    if (end >= clean.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks.filter(Boolean);
}
