import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import type { api as GeneratedApi } from "../convex/_generated/api";
import { HttpError } from "./http";

/** Typed references to the Convex functions (types from the generated api, no runtime import). */
export const api = anyApi as unknown as typeof GeneratedApi;

/**
 * A Convex client acting as the signed-in clinician. Every query runs with their token, so the
 * same per-clinician access checks apply as in the browser; this server never sees other users' data.
 */
export async function convexAs(token: string, convexUrl: string | undefined) {
  if (!convexUrl) throw new HttpError(503, "The server is missing CONVEX_URL / VITE_CONVEX_URL");
  const client = new ConvexHttpClient(convexUrl);
  client.setAuth(token);
  const me = await client.query(api.functions.users.me, {}).catch(() => null);
  if (!me) throw new HttpError(401, "Your session has expired. Sign in again.");
  return { client, me };
}

export type ConvexAs = Awaited<ReturnType<typeof convexAs>>;
