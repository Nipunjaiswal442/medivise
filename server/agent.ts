/**
 * The assistant's agent loop: stream a Claude turn, run any tool calls against Convex, feed the
 * results back, repeat until Claude answers. Emits UI events as it goes.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { Effort } from "./config";
import { anthropicTools, describeCall, runTool, type ToolContext } from "./tools";

export type AgentEvent =
  | { type: "text"; text: string }
  | { type: "tool"; id: string; name: string; summary: string }
  | { type: "tool_result"; id: string; ok: boolean; summary: string }
  | { type: "error"; message: string }
  | { type: "done"; stopReason: string | null; model: string; usage: UsageTotals };

export interface UsageTotals {
  inputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  outputTokens: number;
  turns: number;
}

export interface AgentOptions {
  client: Anthropic;
  model: string;
  effort: Effort;
  system: Anthropic.Beta.BetaTextBlockParam[];
  messages: Anthropic.Beta.BetaMessageParam[];
  toolContext: ToolContext;
  emit: (event: AgentEvent) => void;
  signal?: AbortSignal;
  maxTurns?: number;
  maxTokens?: number;
}

const FALLBACK_BETA = "server-side-fallback-2026-07-01";

export async function runAgent(opts: AgentOptions): Promise<void> {
  const { client, emit } = opts;
  const messages = [...opts.messages];
  const usage: UsageTotals = { inputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0, turns: 0 };
  const maxTurns = opts.maxTurns ?? 10;
  let servedBy = opts.model;
  let stopReason: string | null = null;
  let wroteText = false;
  let jsonRetries = 0;

  for (let turn = 0; turn < maxTurns; turn++) {
    const stream = client.beta.messages.stream(
      {
        model: opts.model,
        max_tokens: opts.maxTokens ?? 32_000,
        system: opts.system,
        tools: anthropicTools,
        messages,
        output_config: { effort: opts.effort },
        // Caches the conversation so far; the system prompt has its own breakpoint.
        cache_control: { type: "ephemeral" },
        // A classifier false positive on a medical question retries on Anthropic's recommended model.
        betas: [FALLBACK_BETA],
        fallbacks: "default",
      },
      { signal: opts.signal },
    );
    let separated = !wroteText;
    stream.on("text", (delta) => {
      if (!separated) {
        emit({ type: "text", text: "\n\n" });
        separated = true;
      }
      wroteText = true;
      emit({ type: "text", text: delta });
    });

    let message: Anthropic.Beta.BetaMessage;
    try {
      message = await stream.finalMessage();
      jsonRetries = 0;
    } catch (err) {
      // With eager input streaming, a tool input that is not parseable JSON rejects the stream.
      // Re-issue that turn (a couple of times); API errors and aborts are rethrown.
      if (err instanceof Anthropic.APIError || opts.signal?.aborted || jsonRetries++ >= 2) throw err;
      continue;
    }

    usage.turns++;
    usage.inputTokens += message.usage.input_tokens;
    usage.cacheReadTokens += message.usage.cache_read_input_tokens ?? 0;
    usage.cacheWriteTokens += message.usage.cache_creation_input_tokens ?? 0;
    usage.outputTokens += message.usage.output_tokens;
    servedBy = message.model;
    stopReason = message.stop_reason;

    if (message.stop_reason === "refusal") {
      emit({
        type: "error",
        message: "The model declined to answer this request. Rephrase it, or ask about a narrower clinical question.",
      });
      break;
    }
    if (message.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: message.content });
      continue;
    }

    const toolUses = message.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
    if (toolUses.length === 0) break;
    if (message.stop_reason === "max_tokens") {
      emit({ type: "error", message: "The answer was cut off before a tool call completed. Ask a narrower question." });
      break;
    }

    // Append the whole assistant turn (thinking blocks included) unchanged.
    messages.push({ role: "assistant", content: message.content });
    for (const t of toolUses) emit({ type: "tool", id: t.id, name: t.name, summary: describeCall(t.name, t.input) });
    const outcomes = await Promise.all(toolUses.map((t) => runTool(t.name, t.input, opts.toolContext)));
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = toolUses.map((t, i) => {
      emit({ type: "tool_result", id: t.id, ok: !outcomes[i].isError, summary: outcomes[i].summary });
      return { type: "tool_result", tool_use_id: t.id, content: outcomes[i].content, is_error: outcomes[i].isError };
    });
    // All results of one turn go back in a single user message.
    messages.push({ role: "user", content: results });

    if (turn === maxTurns - 1) {
      emit({ type: "error", message: "Stopped after the maximum number of tool rounds. Ask a more specific question." });
    }
  }

  emit({ type: "done", stopReason, model: servedBy, usage });
}
