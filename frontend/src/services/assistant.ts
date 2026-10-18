/** Client for the Vercel functions that run the AI assistant (/api/*). */
import env from '@/config/env';

export interface AssistantStatus {
  llmConfigured: boolean;
  model?: string;
  /** False when the /api functions have no CONVEX_URL / VITE_CONVEX_URL at runtime. */
  convexConfigured?: boolean;
  /** True when /api could not be reached at all (e.g. local dev without `npm run dev:api`). */
  unreachable?: boolean;
}

export type AssistantEvent =
  | { type: 'meta'; model: string; retrieved: number }
  | { type: 'text'; text: string }
  | { type: 'tool'; id: string; name: string; summary: string }
  | { type: 'tool_result'; id: string; ok: boolean; summary: string }
  | { type: 'error'; message: string }
  | { type: 'done'; stopReason: string | null; model: string };

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

let statusPromise: Promise<AssistantStatus> | null = null;

export function getAssistantStatus(refresh = false): Promise<AssistantStatus> {
  if (!statusPromise || refresh) {
    statusPromise = fetch(`${env.API_BASE_URL}/status`)
      .then(async (res) => {
        if (!res.ok || !res.headers.get('content-type')?.includes('json')) return { llmConfigured: false, unreachable: true };
        return (await res.json()) as AssistantStatus;
      })
      .catch(() => ({ llmConfigured: false, unreachable: true }));
  }
  return statusPromise;
}

export class AssistantError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}

/** Sends the conversation and calls onEvent for every streamed event. */
export async function streamChat(args: {
  token: string;
  messages: ChatTurn[];
  attachments?: string[];
  patientId?: string;
  signal?: AbortSignal;
  onEvent: (event: AssistantEvent) => void;
}): Promise<void> {
  const res = await fetch(`${env.API_BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${args.token}` },
    body: JSON.stringify({
      messages: args.messages,
      attachments: args.attachments ?? [],
      patientId: args.patientId,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
    signal: args.signal,
  });
  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => null);
    throw new AssistantError(
      body?.error ?? (res.status === 404 ? 'The assistant API is not running. Locally, start it with `npm run dev:api`.' : `The assistant failed (HTTP ${res.status}).`),
      body?.code,
    );
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += value;
    let newline: number;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) args.onEvent(JSON.parse(line) as AssistantEvent);
    }
  }
  if (buffer.trim()) args.onEvent(JSON.parse(buffer) as AssistantEvent);
}

/** Collects a whole streamed answer as text (for briefs and reviews rendered outside the chat). */
export async function askAssistant(args: Omit<Parameters<typeof streamChat>[0], 'onEvent'> & { onText?: (text: string) => void }): Promise<string> {
  let text = '';
  let error = '';
  await streamChat({
    ...args,
    onEvent: (e) => {
      if (e.type === 'text') {
        text += e.text;
        args.onText?.(text);
      } else if (e.type === 'error') {
        error = e.message;
      }
    },
  });
  if (!text && error) throw new AssistantError(error);
  return text;
}

/** Asks the server to transcribe an image / scanned PDF so it becomes searchable. */
export async function transcribeDocument(token: string, documentId: string): Promise<void> {
  const res = await fetch(`${env.API_BASE_URL}/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ documentId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new AssistantError(body?.error ?? `Transcription failed (HTTP ${res.status})`, body?.code);
  }
}
