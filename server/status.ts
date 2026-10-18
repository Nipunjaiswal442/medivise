/** GET /api/status - whether the assistant is configured (never reveals the key). */
import { serverConfig } from "./config";
import { json } from "./http";

export function handleStatus(): Response {
  const config = serverConfig();
  return json(200, {
    llmConfigured: Boolean(config.anthropicApiKey),
    model: config.model,
    effort: config.effort,
    convexConfigured: Boolean(config.convexUrl),
  });
}
