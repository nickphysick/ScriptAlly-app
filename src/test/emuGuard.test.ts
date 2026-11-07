/**
 * Every emulator run goes through scripts/emu-guard.mjs (disk pre-flight, debug logs to /dev/null,
 * a watchdog, cleanup on exit). On 6 Nov one worktree's Firestore debug logs reached 38 GB.
 * This lock fails on any `firebase emulators:exec|start` that does not.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "..", "..");
const GUARD = "emu-guard.mjs";
const EMU = /emulators:(exec|start)/;
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");

/* A hosting-only emulator that MUST run from its own temp folder (see the file's note): no Firestore,
 * no debug-log growth, and the guard works in the repo root. The set's size is asserted. */
const EXEMPT = ["tests/e2e/launchRedirect.public.ts"];

const walk = (dir: string, out: string[] = []): string[] => {
  for (const f of readdirSync(dir)) {
    if (f === "node_modules" || f === "emulator-data" || f.startsWith(".")) continue;
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(m?js|ts|sh)$/.test(f)) out.push(p);
  }
  return out;
};

describe("emulator runs go through the guard", () => {
  it("every package.json script that starts an emulator calls emu-guard", () => {
    const scripts = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).scripts as Record<string, string>;
    const starts = Object.entries(scripts).filter(([, v]) => EMU.test(v));
    expect(starts.map(([k]) => k).sort()).toEqual(["test:functions", "test:rules"]);
    for (const [k, v] of starts) expect(v, k).toMatch(/^node scripts\/emu-guard\.mjs /);
    for (const k of ["e2e:emu", "dev:emu", "emu:seed"]) expect(scripts[k]).toMatch(/^node scripts\/emu\.mjs /);
  });

  it("scripts/ code only starts an emulator through the guard", () => {
    const hits: string[] = [];
    for (const f of walk(join(ROOT, "scripts"))) {
      if (f.endsWith(GUARD)) continue;
      for (const line of stripComments(readFileSync(f, "utf8")).split("\n")) {
        if (EMU.test(line)) {
          hits.push(relative(ROOT, f));
          expect(line, relative(ROOT, f)).toContain(GUARD);
        }
      }
    }
    expect(hits).toContain("scripts/emu.mjs"); // the population is not empty
  });

  it("no recipe under tests/ starts an emulator without the guard", () => {
    const offenders: string[] = [];
    for (const f of walk(join(ROOT, "tests"))) {
      const rel = relative(ROOT, f);
      if (EXEMPT.includes(rel)) continue;
      for (const line of readFileSync(f, "utf8").split("\n")) {
        /* A command line: the invocation opens the line (after a comment star), not prose about it. */
        if (/^\s*\*?\s*(npx\s+)?firebase\s+emulators:(exec|start)/.test(line)) offenders.push(`${rel}: ${line.trim()}`);
      }
    }
    expect(offenders).toEqual([]);
    expect(EXEMPT).toHaveLength(1);
  });

  it("the guard sends debug logs to /dev/null and has its three thresholds", () => {
    const src = readFileSync(join(ROOT, "scripts", GUARD), "utf8");
    for (const t of ['"/dev/null"', "EMU_MIN_FREE_GB", "EMU_KILL_FREE_GB", "EMU_MAX_LOG_MB", "statfsSync", 'detached: true', '"dist-emu"']) {
      expect(src).toContain(t);
    }
  });
});
