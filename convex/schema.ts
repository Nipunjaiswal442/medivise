import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    firebaseUid: v.string(),
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("physician"), v.literal("nurse"), v.literal("admin"), v.literal("pharmacist")),
    specialty: v.optional(v.string()),
    licenseNumber: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("firebaseUid", ["firebaseUid"])
    .index("email", ["email"]),

  patients: defineTable({
    customId: v.string(),
    name: v.string(),
    age: v.number(),
    gender: v.string(),
    condition: v.string(),
    lastVisit: v.string(),
    status: v.union(v.literal("active"), v.literal("discharged"), v.literal("scheduled")),
    consultationDuration: v.number(),
    symptoms: v.array(v.object({ name: v.string(), days: v.string() })),
    prescriptions: v.array(v.object({ name: v.string(), timesPerDay: v.string(), dosage: v.string() })),
    aiReview: v.optional(v.string()),
    userId: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("userId", ["userId"])
    .index("customId", ["customId"]),

  consultations: defineTable({
    patientId: v.id("patients"),
    userId: v.id("users"),
    symptoms: v.array(v.object({ name: v.string(), days: v.string() })),
    prescriptions: v.array(v.object({ name: v.string(), timesPerDay: v.string(), dosage: v.string() })),
    aiReview: v.optional(v.string()),
    predictionId: v.optional(v.id("predictions")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("patientId", ["patientId"])
    .index("userId", ["userId"])
    .index("predictionId", ["predictionId"]),

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
  })
    .index("name", ["name"]),

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
  })
    .index("name", ["name"]),

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
    diseaseId: v.id("diseases"),
    confidence: v.number(),
    symptoms: v.array(v.string()),
    unmatchedSymptoms: v.optional(v.array(v.string())),
    // "ml-service" when the Python service answered, "knowledge-base" for the built-in scorer.
    source: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("patientId", ["patientId"])
    .index("userId", ["userId"])
    .index("diseaseId", ["diseaseId"]),
});
