/**
 * Regenerates convex/_generated/api.d.ts from the files in convex/, in the same format as
 * `npx convex codegen`. Only needed when you cannot run the Convex CLI against a deployment
 * (`npx convex dev` regenerates this file itself).
 *
 *   node scripts/gen-convex-api.mjs
 */
import { readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../convex");
const skip = new Set(["schema.ts", "auth.config.ts", "convex.config.ts", "crons.ts"]);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "_generated" || name.startsWith(".") ? [] : walk(path);
    // Convex ignores files with more than one dot (e.g. *.test.ts) and non-TS/JS files.
    if (!/^[^.]+\.(ts|tsx|js|jsx)$/.test(name) || name.endsWith(".d.ts")) return [];
    const rel = relative(root, path).split("\\").join("/");
    return skip.has(rel) ? [] : [rel.replace(/\.(ts|tsx|js|jsx)$/, "")];
  });
}

const modules = walk(root).sort();
const ident = (m) => m.replace(/[^A-Za-z0-9]/g, "_");
const out = `/* eslint-disable */
/**
 * Generated \`api\` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run \`npx convex dev\` (or \`node scripts/gen-convex-api.mjs\` offline).
 * @module
 */

import type { ApiFromModules, FilterApi, FunctionReference } from "convex/server";
${modules.map((m) => `import type * as ${ident(m)} from "../${m}.js";`).join("\n")}

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * \`\`\`js
 * const myFunctionReference = api.myModule.myFunction;
 * \`\`\`
 */
declare const fullApi: ApiFromModules<{
${modules.map((m) => `  "${m}": typeof ${ident(m)};`).join("\n")}
}>;
export declare const api: FilterApi<typeof fullApi, FunctionReference<any, "public">>;
export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, "internal">>;
`;
writeFileSync(join(root, "_generated/api.d.ts"), out);
console.log(`wrote convex/_generated/api.d.ts with ${modules.length} modules`);
