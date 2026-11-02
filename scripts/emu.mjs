#!/usr/bin/env node
/**
 * Local work against the Firebase emulators — reads and writes here cost nothing.
 *
 *   npm run emu:seed            seed the harness account from tests/emulator-seed/harness.json and
 *                               export the result to tests/emulator-data/ (gitignored)
 *   npm run dev:emu             vite dev server (mode `emulator`) over the seeded emulators
 *   npm run e2e:emu [-- args]   build in mode `emulator` into dist-emu/ (never dist/, so it cannot be
 *                               deployed by accident), serve it on 127.0.0.1:4321, run Playwright
 *                               (args go straight to `playwright test`)
 *
 * ⚠️ EVERY RUN STARTS FROM THE SAME SNAPSHOT. `--import` loads tests/emulator-data/ and nothing is
 * exported on exit, so a measurement that writes cannot leave residue for the next one — the shared
 * live account could never promise that.
 *
 * The project is `demo-scriptally`: a demo- project id makes the emulators refuse to reach anything
 * real. The Firestore emulator needs Java 21; the keg-only Homebrew openjdk@21 is put on PATH here.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(new URL("..", import.meta.url).pathname);
const PROJECT = "demo-scriptally";
const DATA = "tests/emulator-data";
const ONLY = "auth,firestore,storage";
const JDK = "/opt/homebrew/opt/openjdk@21/bin";

const env = { ...process.env };
delete env.ALLOW_LIVE_FIRESTORE; // nothing run from here may opt into live Firestore
if (existsSync(JDK)) env.PATH = `${JDK}:${env.PATH}`;

const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { cwd: ROOT, env, stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
const quote = (a) => `'${String(a).replace(/'/g, `'\\''`)}'`;
const exec = (inner, extra = []) =>
  run("npx", ["firebase", "emulators:exec", "--only", ONLY, "--project", PROJECT, ...extra, inner]);

function seed() {
  exec("node tests/emulator-seed/seed.mjs", ["--export-on-exit", DATA]);
}
function ensureSeeded() {
  if (!existsSync(resolve(ROOT, DATA))) seed();
}

const [cmd, ...rest] = process.argv.slice(2);
if (cmd === "seed") {
  seed();
} else if (cmd === "dev") {
  ensureSeeded();
  exec("npx vite --mode emulator --port 3000 --host 127.0.0.1", ["--import", DATA]);
} else if (cmd === "e2e") {
  ensureSeeded();
  run("npx", ["vite", "build", "--mode", "emulator", "--outDir", "dist-emu", "--emptyOutDir"]);
  exec(["node", "scripts/emu-e2e-inner.mjs", ...rest].map(quote).join(" "), ["--import", DATA]);
} else {
  console.error("usage: node scripts/emu.mjs <seed|dev|e2e> [playwright args]");
  process.exit(2);
}
