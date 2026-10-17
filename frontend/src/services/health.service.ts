import { getConvex } from '@/convex/client';
import { fn } from '@/convex/functions';
import type { HealthPredictionRequest, PredictionRecord, PredictionResult } from '@/types/health';

export type { HealthPredictionRequest, PredictionRecord, PredictionResult };

export const healthService = {
  predictHealth: (request: HealthPredictionRequest): Promise<PredictionResult> =>
    getConvex().action(fn.predictHealth, {
      symptoms: request.symptoms,
      age: request.age,
      gender: request.gender,
    }),

  getPredictions: (): Promise<PredictionRecord[]> => getConvex().query(fn.getPredictions, {}),
};
