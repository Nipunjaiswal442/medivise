// @vitest-environment node
/// <reference types="vite/client" />
/**
 * End-to-end test of POST /api/chat and /api/ingest without real credentials:
 *  - a fake Convex HTTP endpoint forwards every query/mutation to a convex-test backend loaded
 *    with the 20 sample patients (the real Convex functions, auth checks and search index);
 *  - a fake Anthropic endpoint streams scripted SSE responses and records every request.
 * The real handler, ConvexHttpClient, Anthropic SDK, agent loop and tools run in between.
 */
import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { handleChat } from "./chat";
import { handleIngest } from "./ingest";
import { handleStatus } from "./status";

const modules = import.meta.glob("../convex/**/!(*.*.*)*.*s");
const DAY = 24 * 60 * 60 * 1000;

let t: ReturnType<typeof convexTest>;
const identities = new Map<string, ReturnType<ReturnType<typeof convexTest>["withIdentity"]>>();

async function readBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

function listen(server: Server): Promise<string> {
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}`)));
}

// ---- fake Convex deployment -------------------------------------------------------------
const convexServer = createServer(async (req, res) => {
  const body = JSON.parse(await readBody(req));
  const token = (req.headers.authorization ?? "").replace(/^Bearer /, "");
  const as = identities.get(token) ?? t;
  const kind = req.url === "/api/mutation" ? "mutation" : "query";
  try {
    const args = body.args[0];
    const value =
      kind === "mutation"
        ? await as.mutation(makeFunctionReference<"mutation">(body.path), args)
        : await as.query(makeFunctionReference<"query">(body.path), args);
    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ status: "success", value: value ?? null, logLines: [] }));
  } catch (err) {
    res.writeHead(560, { "Content-Type": "application/json" }).end(JSON.stringify({ status: "error", errorMessage: String((err as Error).message), logLines: [] }));
  }
});

// ---- fake Anthropic API ------------------------------------------------------------------
type Script = (request: { body: Record<string, any>; headers: IncomingMessage["headers"] }) => string;
const anthropicRequests: { body: Record<string, any>; headers: IncomingMessage["headers"] }[] = [];
let scripts: Script[] = [];

const sse = (events: Record<string, unknown>[]) =>
  events.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join("");

function messageStream(content: Record<string, unknown>[], stopReason: string) {
  const events: Record<string, unknown>[] = [
    {
      type: "message_start",
      message: { id: "msg_test", type: "message", role: "assistant", model: "claude-opus-5-5", content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 1200, output_tokens: 1, cache_read_input_tokens: 900, cache_creation_input_tokens: 0 } },
    },
  ];
  content.forEach((block, index) => {
    if (block.type === "thinking") {
      events.push({ type: "content_block_start", index, content_block: { type: "thinking", thinking: "", signature: "" } });
      events.push({ type: "content_block_delta", index, delta: { type: "signature_delta", signature: block.signature } });
    } else if (block.type === "tool_use") {
      events.push({ type: "content_block_start", index, content_block: { type: "tool_use", id: block.id, name: block.name, input: {} } });
      events.push({ type: "content_block_delta", index, delta: { type: "input_json_delta", partial_json: JSON.stringify(block.input) } });
    } else {
      events.push({ type: "content_block_start", index, content_block: { type: "text", text: "" } });
      for (const piece of String(block.text).match(/.{1,12}/gs) ?? []) {
        events.push({ type: "content_block_delta", index, delta: { type: "text_delta", text: piece } });
      }
    }
    events.push({ type: "content_block_stop", index });
  });
  events.push({ type: "message_delta", delta: { stop_reason: stopReason, stop_sequence: null }, usage: { output_tokens: 42 } });
  events.push({ type: "message_stop" });
  return sse(events);
}

const anthropicServer = createServer(async (req, res) => {
  const body = JSON.parse(await readBody(req));
  const entry = { body, headers: req.headers };
  anthropicRequests.push(entry);
  const script = scripts.shift();
  if (!script) {
    res.writeHead(500).end(JSON.stringify({ type: "error", error: { type: "api_error", message: "no script" } }));
    return;
  }
  res.writeHead(200, { "Content-Type": "text/event-stream" }).end(script(entry));
});

let convexUrl = "";
let anthropicUrl = "";
let todayStart = 0;

beforeAll(async () => {
  convexUrl = await listen(convexServer);
  anthropicUrl = await listen(anthropicServer);
});
afterAll(() => {
  convexServer.close();
  anthropicServer.close();
});

beforeEach(async () => {
  t = convexTest(schema, modules);
  identities.clear();
  for (const email of ["alice@example.com", "bob@example.com"]) {
    const { userId, sessionId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { email, name: email === "alice@example.com" ? "Dr Alice Grey" : "Dr Bob", role: "physician", specialty: "Family Medicine" });
      const sessionId = await ctx.db.insert("authSessions", { userId, expirationTime: Date.now() + DAY });
      return { userId, sessionId };
    });
    identities.set(`token-${email.split("@")[0]}`, t.withIdentity({ subject: `${userId}|${sessionId}` }));
  }
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  todayStart = d.getTime();
  await identities.get("token-alice")!.mutation(api.functions.samples.loadSamplePatients, { todayStart });

  anthropicRequests.length = 0;
  scripts = [];
  vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");
  vi.stubEnv("ANTHROPIC_BASE_URL", anthropicUrl);
  vi.stubEnv("VITE_CONVEX_URL", convexUrl);
  vi.stubEnv("ANTHROPIC_MODEL", "");
  vi.stubEnv("ANTHROPIC_EFFORT", "");
});

async function chat(body: Record<string, unknown>, token = "token-alice") {
  const res = await handleChat(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
  const text = await res.text();
  const events = res.headers.get("content-type")?.includes("ndjson")
    ? text.trim().split("\n").map((l) => JSON.parse(l))
    : [];
  return { res, text, events };
}

describe("/api/status", () => {
  test("reports configuration without leaking the key", async () => {
    const body = await handleStatus().json();
    expect(body).toEqual({ llmConfigured: true, model: "claude-opus-5-5", effort: "medium", convexConfigured: true });
    expect(JSON.stringify(body)).not.toContain("sk-ant");
  });
});

describe("/api/chat", () => {
  test("is disabled with a clear message when ANTHROPIC_API_KEY is missing", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const { res, text } = await chat({ messages: [{ role: "user", content: "hi" }] });
    expect(res.status).toBe(503);
    expect(JSON.parse(text).code).toBe("llm_not_configured");
  });

  test("rejects missing or invalid sessions", async () => {
    expect((await handleChat(new Request("http://localhost/api/chat", { method: "POST", body: "{}" }))).status).toBe(401);
    const { res } = await chat({ messages: [{ role: "user", content: "hi" }] }, "token-nobody");
    expect(res.status).toBe(401);
  });

  test("runs a tool round trip against the patient database and streams the answer", async () => {
    scripts.push(() =>
      messageStream(
        [
          { type: "thinking", signature: "sig-abc" },
          { type: "tool_use", id: "toolu_1", name: "get_patient_record", input: { patient: "Michael Davis" } },
          { type: "tool_use", id: "toolu_2", name: "check_medications", input: { patient: "P-007", proposed: ["Ibuprofen"] } },
        ],
        "tool_use",
      ),
    );
    scripts.push(() => messageStream([{ type: "text", text: "Michael Davis is on warfarin; avoid ibuprofen. (P-007 - Medications and allergies)" }], "end_turn"));

    const { res, events } = await chat({
      messages: [{ role: "user", content: "Can Michael Davis take ibuprofen for his knee?" }],
      timeZone: "Asia/Kolkata",
    });
    expect(res.status).toBe(200);
    const types = events.map((e) => e.type);
    expect(types[0]).toBe("meta");
    expect(types.at(-1)).toBe("done");
    expect(events.filter((e) => e.type === "tool").map((e) => e.summary)).toEqual([
      "Opened record for Michael Davis",
      "Checked medications (Ibuprofen) for P-007",
    ]);
    expect(events.filter((e) => e.type === "tool_result").every((e) => e.ok)).toBe(true);
    expect(events.filter((e) => e.type === "text").map((e) => e.text).join("")).toBe(
      "Michael Davis is on warfarin; avoid ibuprofen. (P-007 - Medications and allergies)",
    );
    expect(events.at(-1).usage).toMatchObject({ turns: 2, cacheReadTokens: 1800 });

    // First request: model, effort, fallbacks, caching, eager tool streaming, context
    const [first, second] = anthropicRequests;
    expect(first.body.model).toBe("claude-opus-5-5");
    expect(first.body.output_config).toEqual({ effort: "medium" });
    expect(first.body.fallbacks).toBe("default");
    expect(String(first.headers["anthropic-beta"])).toContain("server-side-fallback-2026-07-01");
    expect(first.body.cache_control).toEqual({ type: "ephemeral" });
    expect(first.body.system[0].cache_control).toEqual({ type: "ephemeral" });
    expect(first.body.tools.every((tool: { eager_input_streaming: boolean }) => tool.eager_input_streaming)).toBe(true);
    expect(first.body.system[1].text).toContain("Patient panel (20)");
    expect(first.body.system[1].text).toContain("Asia/Kolkata");
    expect(first.body.system[1].text).toMatch(/Today's appointments\n- \d{2}:\d{2}/);
    const firstUser = first.body.messages.at(-1);
    expect(firstUser.content.at(-1).text).toBe("Can Michael Davis take ibuprofen for his knee?");
    expect(firstUser.content.some((b: { text?: string }) => b.text?.startsWith("Automatically retrieved excerpts"))).toBe(true);

    // Second request: the assistant turn (thinking block intact) + both tool results in ONE user message
    const assistantTurn = second.body.messages.at(-2);
    expect(assistantTurn.role).toBe("assistant");
    expect(assistantTurn.content[0]).toMatchObject({ type: "thinking", signature: "sig-abc" });
    const results = second.body.messages.at(-1).content;
    expect(results.map((r: { tool_use_id: string }) => r.tool_use_id)).toEqual(["toolu_1", "toolu_2"]);
    expect(results[0].content).toContain("Warfarin 5 mg");
    expect(results[0].content).toContain("INR 3.6");
    const screen = JSON.parse(results[1].content);
    expect(screen.warnings.map((w: { message: string }) => w.message)).toContain("Warfarin + Ibuprofen: Increased bleeding risk");
    // Tools and system prefix are byte-identical between rounds (prompt cache)
    expect(JSON.stringify(second.body.tools)).toBe(JSON.stringify(first.body.tools));
    expect(JSON.stringify(second.body.system)).toBe(JSON.stringify(first.body.system));
  });

  test("the prediction tool and appointment tool work from inside the agent", async () => {
    scripts.push(() =>
      messageStream(
        [
          { type: "tool_use", id: "toolu_a", name: "predict_conditions", input: { symptoms: ["burning urination", "frequent urination"], patient: "P-019" } },
          { type: "tool_use", id: "toolu_b", name: "list_appointments", input: { from_date: new Date(todayStart).toISOString().slice(0, 10), to_date: new Date(todayStart).toISOString().slice(0, 10) } },
          { type: "tool_use", id: "toolu_c", name: "list_appointments", input: {} },
        ],
        "tool_use",
      ),
    );
    scripts.push(() => messageStream([{ type: "text", text: "Done." }], "end_turn"));
    await chat({ messages: [{ role: "user", content: "Differential for Olivia, and what's on today?" }], timeZone: "UTC" });
    const results = anthropicRequests[1].body.messages.at(-1).content;
    const prediction = JSON.parse(results[0].content);
    expect(prediction.differential[0].condition).toBe("Urinary Tract Infection");
    expect(prediction.demographicsUsed).toMatchObject({ age: 31, sex: "female" });
    // today only (8), and the default window of today + 6 days (8 + 4 + 3 + 2 + 2 = 19)
    expect(results[1].content.split("\n")).toHaveLength(8);
    expect(results[1].content.split("\n")[0]).toContain("James Williams");
    expect(results[2].content.split("\n")).toHaveLength(19);
  });

  test("returns tool errors to the model instead of failing, and cannot see another clinician's data", async () => {
    scripts.push(() => messageStream([{ type: "tool_use", id: "toolu_x", name: "get_patient_record", input: { patient: "P-001" } }], "tool_use"));
    scripts.push(() => messageStream([{ type: "text", text: "No such patient." }], "end_turn"));
    const { events } = await chat({ messages: [{ role: "user", content: "Show P-001" }] }, "token-bob");
    expect(events.find((e) => e.type === "tool_result")).toMatchObject({ ok: false });
    const result = anthropicRequests[1].body.messages.at(-1).content[0];
    expect(result.is_error).toBe(true);
    expect(result.content).toMatch(/No patient matches/);
    expect(anthropicRequests[0].body.system[1].text).toContain("Patient panel (0)");
  });

  test("includes attached document text in the question", async () => {
    const alice = identities.get("token-alice")!;
    const { id } = await alice.mutation(api.functions.documents.create, {
      name: "discharge-summary.txt",
      mimeType: "text/plain",
      size: 100,
      text: "Discharge summary: COPD exacerbation, prednisolone 40 mg for 5 days.",
    });
    scripts.push(() => messageStream([{ type: "text", text: "Summary ready." }], "end_turn"));
    const { events } = await chat({ messages: [{ role: "user", content: "Summarise the attached file" }], attachments: [id] });
    expect(events.at(-1).type).toBe("done");
    const blocks = anthropicRequests[0].body.messages.at(-1).content;
    expect(blocks[0].text).toContain('Attached file "discharge-summary.txt"');
    expect(blocks[0].text).toContain("prednisolone 40 mg");
  });

  test("normalises history and reports refusals", async () => {
    scripts.push(() => messageStream([], "refusal"));
    const { events } = await chat({
      messages: [
        { role: "assistant", content: "Hello! How can I help?" },
        { role: "user", content: "First" },
        { role: "assistant", content: "Answer one" },
        { role: "assistant", content: "" },
        { role: "user", content: "Second" },
        { role: "user", content: "Again" },
      ],
    });
    const sent = anthropicRequests[0].body.messages;
    expect(sent.map((m: { role: string }) => m.role)).toEqual(["user", "assistant", "user"]);
    expect(sent[0].content).toBe("First");
    expect(sent[1].content).toBe("Answer one");
    expect(sent[2].content.at(-1).text).toBe("Second\n\nAgain");
    expect(events.find((e) => e.type === "error")?.message).toMatch(/declined/);
  });

  test("surfaces API errors as a readable event", async () => {
    // no script queued -> fake API answers 500
    const { events } = await chat({ messages: [{ role: "user", content: "hi" }] });
    expect(events.find((e) => e.type === "error")?.message).toMatch(/unavailable/);
  }, 30_000);
});

describe("/api/ingest", () => {
  test("transcribes an image with the model and indexes the text", async () => {
    const alice = identities.get("token-alice")!;
    const storageId = await t.run((ctx) => ctx.storage.store(new Blob([new Uint8Array([137, 80, 78, 71, 1, 2, 3])], { type: "image/png" })));
    const { id } = await alice.mutation(api.functions.documents.create, { name: "ecg.png", mimeType: "image/png", size: 7, storageId });
    const fileUrl = (await alice.query(api.functions.documents.get, { id })).url;
    // convex-test storage URLs are not fetchable over HTTP; serve the bytes from a stub
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === fileUrl) return new Response(new Uint8Array([137, 80, 78, 71, 1, 2, 3]), { headers: { "Content-Type": "image/png" } });
      return globalThis.__realFetch(input, init);
    });
    scripts.push(() => messageStream([{ type: "text", text: "12-lead ECG: sinus rhythm, rate 72, no ST changes." }], "end_turn"));
    const res = await handleIngest(
      new Request("http://localhost/api/ingest", { method: "POST", headers: { Authorization: "Bearer token-alice" }, body: JSON.stringify({ documentId: id }) }),
    );
    expect(res.status).toBe(200);
    expect(anthropicRequests[0].body.messages[0].content[0]).toMatchObject({ type: "image", source: { media_type: "image/png" } });
    expect(anthropicRequests[0].body.output_config).toEqual({ effort: "low" });
    const hits = await alice.query(api.functions.rag.search, { query: "sinus rhythm" });
    expect(hits[0].documentId).toBe(id);
  });
});

declare global {
  // eslint-disable-next-line no-var
  var __realFetch: typeof fetch;
}
globalThis.__realFetch = globalThis.fetch;
