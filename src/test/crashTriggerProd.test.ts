/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Crash reporting v1, Phase 1 — the dev crash trigger cannot reach a production build.
 *
 * It builds `PageBoundary` — the one module that names the trigger — in production mode and greps
 * the output. A development-mode build of the same module is the positive control: the grep has to
 * find the trigger there, or a clean production result would prove nothing. The real production
 * build is checked too, after every `build:prod` (scripts/assert-build-target.mjs).
 *
 * ⚠️ THE CONTROL IS `--mode development`, WHICH IS WHAT DEV IS DEPLOYED FROM. `import.meta.env.PROD`
 * is true for every `vite build`, whatever the mode, so a PROD gate would also strip the trigger from
 * dev; the gate is MODE (components/PageBoundary.tsx).
 *
 * ⚠️ ONE MODULE, NOT THE APP: building the whole app twice inside the suite took two to four minutes
 * and tripped vitest's own reporter timeout ("Timeout calling onTaskUpdate"), which fails the run.
 */
import { describe, expect, it } from "vitest";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";

const MARKERS = ["qh-crash", "dev crash trigger"];
const ROOT = join(__dirname, "..", "..");

/**
 * ⚠️ NOT VITEST'S ENVIRONMENT: a worker carries NODE_ENV=test and its own VITEST* and MODE variables,
 * and a build that inherits them is not the build that ships (it kept the trigger in
 * `--mode production`, 8 Nov). A real build is run from a shell that has none of them.
 */
function buildEnv(outDir: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, SA_TRIGGER_OUT: outDir };
  for (const k of Object.keys(env)) if (k === "NODE_ENV" || k === "MODE" || k === "TEST" || k.startsWith("VITEST")) delete env[k];
  return env;
}

/** ⚠️ THE TEMP FOLDER'S NAME MUST NOT CONTAIN A MARKER: vite can write its own path into the output. */
async function buildBoundary(mode: "production" | "development"): Promise<string> {
  const outDir = mkdtempSync(join(tmpdir(), `sa-triggerbuild-${mode}-`));
  try {
    const args = ["vite", "build", "--config", "src/test/crashTriggerBuild.vite.config.ts", "--mode", mode];
    const { code, stderr } = await new Promise<{ code: number | null; stderr: string }>((done) => {
      let err = "";
      const child = spawn("npx", args, { cwd: ROOT, env: buildEnv(outDir) });
      child.stderr.on("data", (d) => { err += String(d); });
      child.on("close", (c) => done({ code: c, stderr: err }));
    });
    if (code !== 0) throw new Error(`vite build --mode ${mode} failed:\n${stderr}`);
    return readdirSync(outDir).filter((f) => f.endsWith(".js")).map((f) => readFileSync(join(outDir, f), "utf8")).join("\n");
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
}

describe("the dev crash trigger is absent from a production build", () => {
  it("a production build of PageBoundary names it nowhere; a development build does", async () => {
    const dev = await buildBoundary("development");
    for (const m of MARKERS) expect(dev, `control: the dev build should carry "${m}"`).toContain(m);
    const prod = await buildBoundary("production");
    expect(prod).toContain("This page hit a problem"); // the boundary itself really was built
    for (const m of MARKERS) expect(prod, `"${m}" reached a production build`).not.toContain(m);
  }, 120_000);
});
