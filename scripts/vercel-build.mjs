/**
 * Vercel build step.
 * - With CONVEX_DEPLOY_KEY set: deploys the Convex functions first and builds the frontend
 *   against that deployment (the Convex-recommended setup).
 * - Without it: only builds the frontend; VITE_CONVEX_URL must then be set in Vercel.
 * The /api functions read CONVEX_URL (or VITE_CONVEX_URL) at runtime, so one of them must be a
 * Vercel environment variable in both cases.
 */
import { execSync } from "node:child_process";

const run = (cmd) => execSync(cmd, { stdio: "inherit" });

if (process.env.CONVEX_DEPLOY_KEY) {
  if (!process.env.CONVEX_URL && !process.env.VITE_CONVEX_URL) {
    console.warn("WARNING: set CONVEX_URL in Vercel too - the /api functions (AI assistant) read it at runtime.");
  }
  run(`npx convex deploy --cmd-url-env-var-name VITE_CONVEX_URL --cmd "npm --prefix frontend run build"`);
} else {
  if (!process.env.VITE_CONVEX_URL) {
    console.warn("WARNING: neither CONVEX_DEPLOY_KEY nor VITE_CONVEX_URL is set - the app will show a setup screen.");
  }
  run("npm --prefix frontend run build");
}
