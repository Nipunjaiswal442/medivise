/**
 * Local stand-in for Vercel's /api functions: serves the same handlers on http://localhost:3001.
 * The Vite dev server proxies /api here (frontend/vite.config.ts).
 *
 *   npm run dev:api     (reads ANTHROPIC_API_KEY and CONVEX_URL from the environment, .env.local or .env)
 */
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { Readable } from "node:stream";
import { handleChat } from "../server/chat";
import { handleIngest } from "../server/ingest";
import { handleStatus } from "../server/status";

// .env.local is written by `npx convex dev` (CONVEX_URL); variables already set in the shell win.
for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^(["'])(.*)\1$/, "$2").replace(/\s+#.*$/, "");
  }
}

const routes: Record<string, (request: Request) => Response | Promise<Response>> = {
  "/api/chat": handleChat,
  "/api/ingest": handleIngest,
  "/api/status": handleStatus,
};
const port = Number(process.env.API_PORT ?? 3001);

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${port}`);
  const handler = routes[url.pathname];
  if (!handler) {
    res.writeHead(404).end("Not found");
    return;
  }
  const body = req.method === "GET" || req.method === "HEAD" ? undefined : (Readable.toWeb(req) as ReadableStream);
  const request = new Request(url, {
    method: req.method,
    headers: Object.entries(req.headers).flatMap(([k, v]) => (v === undefined ? [] : [[k, Array.isArray(v) ? v.join(", ") : v]])) as [string, string][],
    body,
    duplex: "half",
  } as RequestInit);
  const response = await handler(request);
  res.writeHead(response.status, Object.fromEntries(response.headers));
  if (!response.body) {
    res.end();
    return;
  }
  const reader = response.body.getReader();
  res.on("close", () => void reader.cancel().catch(() => undefined));
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(value);
  }
  res.end();
}).listen(port, () => console.log(`Medivise API on http://localhost:${port} (assistant ${process.env.ANTHROPIC_API_KEY ? "enabled" : "disabled: set ANTHROPIC_API_KEY"})`));
