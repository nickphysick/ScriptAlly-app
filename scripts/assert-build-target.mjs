#!/usr/bin/env node
/**
 * Build-target guard. Proves the freshly-built `dist/` bundle targets the Firebase project we
 * intend to deploy to — and ONLY that one. Wired into `build:dev` / `build:prod` so a
 * mis-targeted bundle (e.g. a prod-configured build about to ship to the dev site) aborts before
 * any `firebase deploy` runs.
 *
 * The Firebase project is baked into the bundle at build time from Vite env files. This is the
 * single check that would have caught the morning a prod-configured bundle went to the dev site.
 *
 *   node scripts/assert-build-target.mjs <dev|prod>
 *
 * Expected project IDs are read from the SAME env files Vite uses (.env.development /
 * .env.production), so this never drifts from the real config.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const target = process.argv[2];
if (target !== "dev" && target !== "prod") {
  console.error("assert-build-target: usage: node scripts/assert-build-target.mjs <dev|prod>");
  process.exit(2);
}

/** Pull VITE_FIREBASE_PROJECT_ID out of an env file (quotes/comment-tolerant). */
function projectIdFrom(envFile) {
  let text;
  try {
    text = readFileSync(envFile, "utf8");
  } catch (e) {
    console.error(`assert-build-target: cannot read ${envFile} (${e.message})`);
    process.exit(2);
  }
  const m = text.match(/^\s*VITE_FIREBASE_PROJECT_ID\s*=\s*["']?([^"'\s#]+)/m);
  if (!m) {
    console.error(`assert-build-target: no VITE_FIREBASE_PROJECT_ID in ${envFile}`);
    process.exit(2);
  }
  return m[1];
}

const DEV_ID = projectIdFrom(".env.development");
const PROD_ID = projectIdFrom(".env.production");
if (DEV_ID === PROD_ID) {
  console.error(`assert-build-target: dev and prod project IDs are identical (${DEV_ID}) — env files misconfigured.`);
  process.exit(2);
}

const intended = target === "dev" ? DEV_ID : PROD_ID;
const forbidden = target === "dev" ? PROD_ID : DEV_ID;

// Concatenate every built JS bundle and scan for both project IDs.
const assetsDir = "dist/assets";
let bundle = "";
try {
  for (const f of readdirSync(assetsDir)) {
    if (f.endsWith(".js")) bundle += readFileSync(join(assetsDir, f), "utf8");
  }
} catch (e) {
  console.error(`assert-build-target: cannot read ${assetsDir} — did the build run first? (${e.message})`);
  process.exit(2);
}

const hasIntended = bundle.includes(intended);
const hasForbidden = bundle.includes(forbidden);

if (!hasIntended || hasForbidden) {
  console.error(`\n✖ BUILD TARGET MISMATCH for "${target}"`);
  console.error(`  intended projectId : ${intended}   ${hasIntended ? "(present ✓)" : "(MISSING ✗)"}`);
  console.error(`  forbidden projectId: ${forbidden}   ${hasForbidden ? "(PRESENT ✗ — wrong-project bundle!)" : "(absent ✓)"}`);
  console.error(`  The built bundle does not cleanly target the ${target} project. Aborting before deploy.\n`);
  process.exit(1);
}

console.log(`✓ build target OK: bundle targets ${intended} (${target}); ${forbidden} absent.`);
