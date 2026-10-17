/* eslint-disable */
  /**
   * Generated `api` utility.
   *
   * THIS CODE IS AUTOMATICALLY GENERATED.
   *
   * To regenerate, run `npx convex dev`.
   * @module
   */
  
  import type { ApiFromModules, FilterApi, FunctionReference } from "convex/server";
  import type * as data_diseases from "../data/diseases.js";
import type * as data_mappings from "../data/mappings.js";
import type * as data_medicines from "../data/medicines.js";
import type * as data_symptoms from "../data/symptoms.js";
import type * as functions_auth from "../functions/auth.js";
import type * as functions_consultations from "../functions/consultations.js";
import type * as functions_diseases from "../functions/diseases.js";
import type * as functions_patients from "../functions/patients.js";
import type * as functions_predict from "../functions/predict.js";
import type * as functions_seed from "../functions/seed.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_scoring from "../lib/scoring.js";

  /**
   * A utility for referencing Convex functions in your app's API.
   *
   * Usage:
   * ```js
   * const myFunctionReference = api.myModule.myFunction;
   * ```
   */
  declare const fullApi: ApiFromModules<{
    "data/diseases": typeof data_diseases,
"data/mappings": typeof data_mappings,
"data/medicines": typeof data_medicines,
"data/symptoms": typeof data_symptoms,
"functions/auth": typeof functions_auth,
"functions/consultations": typeof functions_consultations,
"functions/diseases": typeof functions_diseases,
"functions/patients": typeof functions_patients,
"functions/predict": typeof functions_predict,
"functions/seed": typeof functions_seed,
"lib/auth": typeof lib_auth,
"lib/scoring": typeof lib_scoring,
  }>;
  export declare const api: FilterApi<typeof fullApi, FunctionReference<any, "public">>;
  export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, "internal">>;
  