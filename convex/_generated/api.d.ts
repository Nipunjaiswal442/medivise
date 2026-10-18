/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev` (or `node scripts/gen-convex-api.mjs` offline).
 * @module
 */

import type { ApiFromModules, FilterApi, FunctionReference } from "convex/server";
import type * as auth from "../auth.js";
import type * as data_clinicalRules from "../data/clinicalRules.js";
import type * as data_diseases from "../data/diseases.js";
import type * as data_drugSafety from "../data/drugSafety.js";
import type * as data_mappings from "../data/mappings.js";
import type * as data_medicines from "../data/medicines.js";
import type * as data_profiles from "../data/profiles.js";
import type * as data_samplePatients from "../data/samplePatients.js";
import type * as data_symptoms from "../data/symptoms.js";
import type * as functions_appointments from "../functions/appointments.js";
import type * as functions_assistant from "../functions/assistant.js";
import type * as functions_chat from "../functions/chat.js";
import type * as functions_consultations from "../functions/consultations.js";
import type * as functions_dashboard from "../functions/dashboard.js";
import type * as functions_diseases from "../functions/diseases.js";
import type * as functions_documents from "../functions/documents.js";
import type * as functions_patients from "../functions/patients.js";
import type * as functions_predict from "../functions/predict.js";
import type * as functions_rag from "../functions/rag.js";
import type * as functions_samples from "../functions/samples.js";
import type * as functions_seed from "../functions/seed.js";
import type * as functions_users from "../functions/users.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_clinical from "../lib/clinical.js";
import type * as lib_indexing from "../lib/indexing.js";
import type * as lib_predictor from "../lib/predictor.js";
import type * as lib_records from "../lib/records.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "auth": typeof auth;
  "data/clinicalRules": typeof data_clinicalRules;
  "data/diseases": typeof data_diseases;
  "data/drugSafety": typeof data_drugSafety;
  "data/mappings": typeof data_mappings;
  "data/medicines": typeof data_medicines;
  "data/profiles": typeof data_profiles;
  "data/samplePatients": typeof data_samplePatients;
  "data/symptoms": typeof data_symptoms;
  "functions/appointments": typeof functions_appointments;
  "functions/assistant": typeof functions_assistant;
  "functions/chat": typeof functions_chat;
  "functions/consultations": typeof functions_consultations;
  "functions/dashboard": typeof functions_dashboard;
  "functions/diseases": typeof functions_diseases;
  "functions/documents": typeof functions_documents;
  "functions/patients": typeof functions_patients;
  "functions/predict": typeof functions_predict;
  "functions/rag": typeof functions_rag;
  "functions/samples": typeof functions_samples;
  "functions/seed": typeof functions_seed;
  "functions/users": typeof functions_users;
  "http": typeof http;
  "lib/auth": typeof lib_auth;
  "lib/clinical": typeof lib_clinical;
  "lib/indexing": typeof lib_indexing;
  "lib/predictor": typeof lib_predictor;
  "lib/records": typeof lib_records;
}>;
export declare const api: FilterApi<typeof fullApi, FunctionReference<any, "public">>;
export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, "internal">>;
