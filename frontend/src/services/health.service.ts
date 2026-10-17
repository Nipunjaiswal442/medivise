import { convex } from "@/convex/client";
import type { HealthPredictionRequest, PredictionResult } from "@/types/health";

export type { HealthPredictionRequest, PredictionResult };

const callMutation = (path: string, args: any) =>
  convex.mutation(path as any, args);

const callQuery = (path: string, args: any) =>
  convex.query(path as any, args);

export const healthService = {
  predictHealth: async (request: HealthPredictionRequest): Promise<PredictionResult> => {
    const result = await callMutation("functions/predict.predictHealth", {
      patientId: request.patientId,
      symptoms: request.symptoms,
      age: request.age,
      gender: request.gender,
    });
    return result as PredictionResult;
  },

  getPredictions: async (): Promise<PredictionResult[]> => {
    const result = await callQuery("functions/predict.getPredictions", {});
    return result as PredictionResult[];
  },
};
