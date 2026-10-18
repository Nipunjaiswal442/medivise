/**
 * Server-side configuration for the /api functions, read from environment variables.
 * On Vercel: Project -> Settings -> Environment Variables.
 */
export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

const EFFORTS: Effort[] = ["low", "medium", "high", "xhigh", "max"];
export const DEFAULT_MODEL = "claude-opus-5-5";

export function serverConfig() {
  const effort = process.env.ANTHROPIC_EFFORT?.trim() as Effort | undefined;
  return {
    /** Enables the AI assistant. Never sent to the browser. */
    anthropicApiKey: process.env.ANTHROPIC_API_KEY?.trim() || undefined,
    model: process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL,
    effort: effort && EFFORTS.includes(effort) ? effort : ("medium" as Effort),
    /** Same deployment URL the frontend uses. */
    convexUrl: (process.env.CONVEX_URL || process.env.VITE_CONVEX_URL)?.trim() || undefined,
  };
}
