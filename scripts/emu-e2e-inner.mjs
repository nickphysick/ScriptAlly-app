#!/usr/bin/env node
/**
 * Runs INSIDE `firebase emulators:exec` (see scripts/emu.mjs): serves the emulator-mode build on
 * 127.0.0.1:4190, runs Playwright against it, stops the server, exits with Playwright's code.
 *
 * ⚠️ BOUND TO 127.0.0.1 ON PURPOSE. Left to choose, `vite preview` has bound IPv6 only on some days
 * and IPv4 only on others, and a Node fetch to the wrong family turned 22-second runs into 17-minute
 * ones (CLAUDE.md, the bundleGuard notes).
 */
import { spawn, spawnSync } from "node:child_process";
import { resolve } from "node:path";

const ROOT = resolve(new URL("..", import.meta.url).pathname);
const PORT = 4321; // ⚠️ NOT 4190: that port is on the fetch spec's blocklist, so Node and Chromium both refuse it
const BASE = `http://127.0.0.1:${PORT}`;

const preview = spawn("npx", ["vite", "preview", "--mode", "emulator", "--outDir", "dist-emu", "--port", String(PORT), "--strictPort", "--host", "127.0.0.1"], {
  cwd: ROOT, stdio: "inherit",
});
const stop = () => { try { preview.kill("SIGTERM"); } catch { /* gone */ } };
process.on("exit", stop);

for (let i = 0; ; i++) {
  try { if ((await fetch(BASE)).ok) break; } catch { /* not up yet */ }
  if (i > 60) { console.error(`preview did not come up on ${BASE}`); process.exit(1); }
  await new Promise((r) => setTimeout(r, 500));
}

const env = { ...process.env, SA_E2E_BASE_URL: BASE, SA_E2E_DIST: "dist-emu" };
delete env.ALLOW_LIVE_FIRESTORE;
const r = spawnSync("npx", ["playwright", "test", ...process.argv.slice(2)], { cwd: ROOT, env, stdio: "inherit" });
stop();
process.exit(r.status ?? 1);
