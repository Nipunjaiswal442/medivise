/** Small helpers shared by the /api handlers (Web-standard Request/Response). */

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export function errorResponse(err: unknown): Response {
  if (err instanceof HttpError) return json(err.status, { error: err.message });
  console.error(err);
  return json(500, { error: "Unexpected server error" });
}

/** The Convex Auth JWT the browser sends as `Authorization: Bearer <token>`. */
export function bearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new HttpError(401, "Sign in to use the assistant");
  return match[1].trim();
}

export async function readJson<T>(request: Request, maxBytes = 2_000_000): Promise<T> {
  if (request.method !== "POST") throw new HttpError(405, "Use POST");
  const text = await request.text();
  if (text.length > maxBytes) throw new HttpError(413, "Request too large");
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HttpError(400, "Body must be JSON");
  }
}
