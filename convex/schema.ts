import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const roleValidator = v.union(
  v.literal("physician"),
  v.literal("nurse"),
  v.literal("admin"),
  v.literal("pharmacist"),
);

export const patientStatusValidator = v.union(
  v.literal("active"),
  v.literal("discharged"),
  v.literal("scheduled"),
);

export const symptomEntry = v.object({ name: v.string(), days: v.string() });
export const prescriptionEntry = v.object({ name: v.string(), timesPerDay: v.string(), dosage: v.string() });

/** Detailed clinical record fields. All optional so older patient rows stay valid. */
export const patientProfileFields = {
  dateOfBirth: v.optional(v.string()),
  bloodType: v.optional(v.string()),
  phone: v.optional(v.string()),
  email: v.optional(v.string()),
  address: v.optional(v.string()),
  emergencyContact: v.optional(v.object({ name: v.string(), relation: v.string(), phone: v.string() })),
  insurance: v.optional(v.string()),
  allergies: v.optional(
    v.array(v.object({ substance: v.string(), reaction: v.string(), severity: v.string() })),
  ),
  chronicConditions: v.optional(v.array(v.string())),
  medications: v.optional(
    v.array(
      v.object({
        name: v.string(),
        dose: v.string(),
        frequency: v.string(),
        indication: v.optional(v.string()),
        startedOn: v.optional(v.string()),
      }),
    ),
  ),
  vitals: v.optional(
    v.object({
      recordedOn: v.string(),
      bloodPressure: v.string(),
      heartRate: v.number(),
      temperatureC: v.number(),
      respiratoryRate: v.number(),
      spo2: v.number(),
      weightKg: v.number(),
      heightCm: v.number(),
    }),
  ),
  labResults: v.optional(
    v.array(
      v.object({
        test: v.string(),
        value: v.string(),
        unit: v.string(),
        referenceRange: v.string(),
        date: v.string(),
        flag: v.optional(v.string()),
      }),
    ),
  ),
  visits: v.optional(
    v.array(v.object({ date: v.string(), reason: v.string(), diagnosis: v.string(), notes: v.string() })),
  ),
  immunizations: v.optional(v.array(v.string())),
  socialHistory: v.optional(v.string()),
  familyHistory: v.optional(v.string()),
  notes: v.optional(v.string()),
};

export const appointmentTypeValidator = v.union(
  v.literal("new-patient"),
  v.literal("follow-up"),
  v.literal("consultation"),
  v.literal("check-up"),
  v.literal("telehealth"),
  v.literal("procedure"),
  v.literal("lab-review"),
);

export const appointmentStatusValidator = v.union(
  v.literal("scheduled"),
  v.literal("checked-in"),
  v.literal("in-progress"),
  v.literal("completed"),
  v.literal("cancelled"),
  v.literal("no-show"),
);

export default defineSchema({
  ...authTables,

  // Convex Auth's users table, extended with the clinician profile.
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    role: v.optional(roleValidator),
    specialty: v.optional(v.string()),
    licenseNumber: v.optional(v.string()),
    // Left over from the Firebase-based profile rows; unused.
    firebaseUid: v.optional(v.string()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),

  patients: defineTable({
    customId: v.string(),
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
    // Set on the bundled sample patients so re-loading them updates instead of duplicating.
    sampleKey: v.optional(v.string()),
    ...patientProfileFields,
    userId: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("userId", ["userId"])
    .index("customId", ["customId"])
    .index("by_user_sample", ["userId", "sampleKey"]),

  appointments: defineTable({
    userId: v.id("users"),
    patientId: v.id("patients"),
    startsAt: v.number(),
    durationMinutes: v.number(),
    type: appointmentTypeValidator,
    status: appointmentStatusValidator,
    reason: v.string(),
    notes: v.optional(v.string()),
    location: v.optional(v.string()),
    consultationId: v.optional(v.id("consultations")),
    // Set on appointments created by the sample-data loader (replaced on re-load).
    sampleKey: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_start", ["userId", "startsAt"])
    .index("by_patient_start", ["patientId", "startsAt"]),

  consultations: defineTable({
    patientId: v.id("patients"),
    userId: v.id("users"),
    appointmentId: v.optional(v.id("appointments")),
    symptoms: v.array(symptomEntry),
    prescriptions: v.array(prescriptionEntry),
    aiReview: v.optional(v.string()),
    diagnosis: v.optional(v.string()),
    notes: v.optional(v.string()),
    durationSeconds: v.optional(v.number()),
    predictionId: v.optional(v.id("predictions")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("patientId", ["patientId"])
    .index("userId", ["userId"])
    .index("predictionId", ["predictionId"]),

  // Uploaded files. The original lives in Convex file storage; extracted text is chunked
  // into knowledgeChunks for retrieval.
  documents: defineTable({
    userId: v.id("users"),
    patientId: v.optional(v.id("patients")),
    name: v.string(),
    mimeType: v.string(),
    size: v.number(),
    storageId: v.optional(v.id("_storage")),
    text: v.optional(v.string()),
    textSource: v.optional(v.union(v.literal("client"), v.literal("llm"))),
    status: v.union(v.literal("ready"), v.literal("needs-transcription"), v.literal("failed")),
    truncated: v.optional(v.boolean()),
    chunkCount: v.number(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId", "createdAt"])
    .index("by_patient", ["patientId"]),

  // Retrieval index over patient records and uploaded documents (RAG).
  knowledgeChunks: defineTable({
    userId: v.id("users"),
    sourceType: v.union(v.literal("patient"), v.literal("document"), v.literal("consultation")),
    patientId: v.optional(v.id("patients")),
    documentId: v.optional(v.id("documents")),
    consultationId: v.optional(v.id("consultations")),
    title: v.string(),
    text: v.string(),
    updatedAt: v.number(),
  })
    .index("by_patient", ["patientId"])
    .index("by_document", ["documentId"])
    .index("by_consultation", ["consultationId"])
    .index("by_user", ["userId"])
    .searchIndex("search_text", {
      searchField: "text",
      filterFields: ["userId", "patientId", "sourceType"],
    }),

  chatThreads: defineTable({
    userId: v.id("users"),
    title: v.string(),
    patientId: v.optional(v.id("patients")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user_updated", ["userId", "updatedAt"]),

  chatMessages: defineTable({
    threadId: v.id("chatThreads"),
    userId: v.id("users"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    attachments: v.optional(v.array(v.object({ documentId: v.id("documents"), name: v.string() }))),
    toolCalls: v.optional(v.array(v.object({ name: v.string(), summary: v.string() }))),
    createdAt: v.number(),
  }).index("by_thread", ["threadId", "createdAt"]),

  diseases: defineTable({
    name: v.string(),
    description: v.string(),
    category: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("name", ["name"])
    .index("category", ["category"]),

  symptoms: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("name", ["name"]),

  diseaseSymptoms: defineTable({
    diseaseId: v.id("diseases"),
    symptomId: v.id("symptoms"),
    weight: v.number(),
  })
    .index("diseaseId", ["diseaseId"])
    .index("symptomId", ["symptomId"]),

  medicines: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    dosage: v.optional(v.string()),
    frequency: v.optional(v.string()),
    duration: v.optional(v.string()),
    contraindications: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("name", ["name"]),

  diseaseMedicines: defineTable({
    diseaseId: v.id("diseases"),
    medicineId: v.id("medicines"),
    confidence: v.number(),
  })
    .index("diseaseId", ["diseaseId"])
    .index("medicineId", ["medicineId"]),

  predictions: defineTable({
    // Optional: a prediction can be run before the patient has been saved.
    patientId: v.optional(v.id("patients")),
    userId: v.id("users"),
    // Optional: older rows referenced the seeded diseases table; new rows store the name.
    diseaseId: v.optional(v.id("diseases")),
    diseaseName: v.optional(v.string()),
    confidence: v.number(),
    symptoms: v.array(v.string()),
    unmatchedSymptoms: v.optional(v.array(v.string())),
    ranking: v.optional(v.array(v.object({ name: v.string(), probability: v.number() }))),
    redFlags: v.optional(v.array(v.string())),
    age: v.optional(v.number()),
    sex: v.optional(v.string()),
    // "knowledge-base" (built-in model) or "ml-service" (the optional Python service).
    source: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("patientId", ["patientId"])
    .index("userId", ["userId"])
    .index("diseaseId", ["diseaseId"]),
});
