/**
 * The load guard (scripts/load-guard.mjs) for the Log a query and Record a response measure specs: the runner prints the
 * 1-minute load at the start of each run and, above 6, waits up to five minutes for it to drop. It waits; it never
 * retries and never raises a timeout. These locks fail when the runner stops calling it, or when it starts doing either.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { coversLoadSensitive, LOAD_LIMIT, LOAD_WAIT_MS, waitForCalmLoad } from "../../scripts/load-guard.mjs";

const ROOT = join(__dirname, "..", "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/** a fake clock: each sleep advances time by its argument; `loads` are read in order, the last one repeating */
function fake(loads: number[]) {
  let t = 0; let i = 0; const lines: string[] = []; const sleeps: number[] = [];
  return {
    lines, sleeps,
    opts: {
      read: () => loads[Math.min(i++, loads.length - 1)],
      sleep: async (ms: number) => { sleeps.push(ms); t += ms; },
      now: () => t,
      log: (s: string) => lines.push(s),
    },
  };
}

describe("the load guard", () => {
  it("is 6 and five minutes", () => {
    expect(LOAD_LIMIT).toBe(6);
    expect(LOAD_WAIT_MS).toBe(300_000);
  });

  it("covers Log a query and Record a response specs, and a run that names no spec (the whole suite)", () => {
    for (const f of ["tests/e2e/laqV2.measure.ts", "tests/e2e/laqV21.measure.ts", "tests/e2e/laqUnknown.measure.ts",
      "tests/e2e/recordResponse21.measure.ts", "tests/e2e/recordResponse2.shots.measure.ts", "tests/e2e/recordCleanup.measure.ts"]) {
      expect(coversLoadSensitive([f, "--project=measure"]), f).toBe(true);
    }
    expect(coversLoadSensitive(["--project=measure"])).toBe(true);
    expect(coversLoadSensitive(["tests/e2e/addAgentV2.measure.ts", "--project=measure"])).toBe(false);
    expect(coversLoadSensitive(["tests/e2e/addAgentV2.measure.ts", "tests/e2e/laqV22.measure.ts"])).toBe(true);
  });

  it("prints the load and runs at once when it is at or under the limit", async () => {
    const f = fake([6]);
    const r = await waitForCalmLoad(f.opts);
    expect(r).toMatchObject({ start: 6, final: 6, calm: true, waitedMs: 0 });
    expect(f.sleeps).toEqual([]);
    expect(f.lines[0]).toContain("1-minute load 6.00 at the start of the run");
  });

  it("waits while the load is above the limit and runs once it drops", async () => {
    const f = fake([9.5, 8, 5.2]);
    const r = await waitForCalmLoad({ ...f.opts, pollMs: 10_000 });
    expect(r).toMatchObject({ start: 9.5, final: 5.2, calm: true, waitedMs: 20_000 });
    expect(f.sleeps).toEqual([10_000, 10_000]);
  });

  it("gives up after five minutes, runs anyway, and says a red is unproven", async () => {
    const f = fake([11]);
    const r = await waitForCalmLoad({ ...f.opts, pollMs: 10_000 });
    expect(r.calm).toBe(false);
    expect(r.waitedMs).toBe(300_000);
    expect(f.lines.at(-1)).toContain("UNPROVEN");
  });

  it("the runner calls it before Playwright, prints the load at the end, and the guard neither retries nor times out", () => {
    const inner = stripComments(read("scripts/emu-e2e-inner.mjs"));
    const guard = inner.indexOf("await waitForCalmLoad(");
    const pw = inner.indexOf('["playwright", "test"');
    expect(guard).toBeGreaterThan(-1);
    expect(pw).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(pw);
    expect(inner).toContain("coversLoadSensitive(");
    expect(inner.indexOf("at the end of the run")).toBeGreaterThan(pw);
    const src = stripComments(read("scripts/load-guard.mjs"));
    expect(src).not.toMatch(/retries/i);
    expect(src).not.toMatch(/timeout\s*:/i);
    expect(inner).not.toMatch(/--retries|--timeout/);
  });
});
