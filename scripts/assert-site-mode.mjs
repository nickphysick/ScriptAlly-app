#!/usr/bin/env node
/**
 * Site-mode guard (App site v1, Phase 3). Proves a freshly built folder is the KIND of site it is about to be
 * deployed as: the public landing only, or the whole app. Wired into build:dev, build:dev-landing and build:prod-app.
 *
 *   node scripts/assert-site-mode.mjs <landing|app> <outDir>
 *
 * The tell is the root chunk. `src/main.tsx` imports `./AppRoot` or `./marketing/PublicRoot` behind the build-time
 * flag, and the minifier drops the other branch, so a landing build has a PublicRoot chunk and no AppRoot chunk,
 * and an app build the reverse. A folder with both, or neither, is refused: something has changed how the root is
 * chosen, and nobody should deploy until it is understood.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";

const [kind, outDir] = process.argv.slice(2);
if ((kind !== "landing" && kind !== "app") || !outDir) {
  console.error("assert-site-mode: usage: node scripts/assert-site-mode.mjs <landing|app> <outDir>");
  process.exit(2);
}

let files;
try {
  files = readdirSync(join(outDir, "assets")).filter((f) => f.endsWith(".js"));
} catch (e) {
  console.error(`assert-site-mode: cannot read ${outDir}/assets — did the build run first? (${e.message})`);
  process.exit(2);
}
const has = (name) => files.some((f) => f.startsWith(`${name}-`));
const app = has("AppRoot");
const landing = has("PublicRoot");
const ok = kind === "app" ? app && !landing : landing && !app;

if (!ok) {
  console.error(`\n✖ SITE MODE MISMATCH for "${kind}" in ${outDir}`);
  console.error(`  AppRoot chunk   : ${app ? "present" : "absent"}`);
  console.error(`  PublicRoot chunk: ${landing ? "present" : "absent"}`);
  console.error(`  A ${kind} build must have ${kind === "app" ? "AppRoot and no PublicRoot" : "PublicRoot and no AppRoot"}. Aborting before deploy.\n`);
  process.exit(1);
}
console.log(`✓ site mode OK: ${outDir} is the ${kind === "app" ? "whole app" : "landing only"}.`);
