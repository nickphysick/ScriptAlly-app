/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Plan rules v1 — the founding-flag scripts: what one account may have done to it, and the guards each script carries.
 * The scripts speak to live projects, so these read their SOURCE for the guards and run the pure decision.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { decideFlag } from "../../scripts/lib/foundingFlagDecide.mjs";

const src = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

describe("decideFlag", () => {
  it("marks within the cap, and refuses at it", () => {
    expect(decideFlag({ current: null, mark: true, foundingCount: 49, cap: 50 }).action).toBe("mark");
    expect(decideFlag({ current: null, mark: true, foundingCount: 50, cap: 50 })).toEqual({ action: "none", reason: "cap reached (50 of 50)" });
  });
  it("only the backfill's explicit over-cap permission passes the cap", () => {
    expect(decideFlag({ current: null, mark: true, foundingCount: 80, cap: 50, overCap: true }).action).toBe("mark");
  });
  it("a founding account is left alone; an unmark is explicit", () => {
    expect(decideFlag({ current: true, mark: true, foundingCount: 50, cap: 50 }).action).toBe("none");
    expect(decideFlag({ current: true, mark: false, foundingCount: 50, cap: 50 }).action).toBe("unmark");
    expect(decideFlag({ current: null, mark: false, foundingCount: 0, cap: 50 }).action).toBe("unmark");
    expect(decideFlag({ current: false, mark: false, foundingCount: 0, cap: 50 }).action).toBe("none");
  });
});

describe("scripts/founding-flag.mjs", () => {
  const s = src("scripts/founding-flag.mjs");
  it("writes only after --confirm, and only through decideFlag (so the cap holds)", () => {
    expect(s.indexOf('flag("--confirm")')).toBeGreaterThan(0);
    expect(s.indexOf('flag("--confirm")')).toBeLessThan(s.indexOf("writeFounding("));
    expect(s).toContain("decideFlag({ current: now.founding, mark, foundingCount, cap })");
    expect(s).not.toContain("overCap");
  });
  it("names its project by argument and carries the live opt-in", () => {
    expect(s).toContain("target(USAGE)");
    expect(src("scripts/lib/adminRest.mjs")).toContain("requireLiveOptIn(project)");
  });
});

describe("scripts/backfill-founding-flags.mjs", () => {
  const s = src("scripts/backfill-founding-flags.mjs");
  it("refuses production without --prod, before it reads anything", () => {
    expect(s).toContain('if (t.isProd && !flag("--prod"))');
    expect(s.indexOf('!flag("--prod")')).toBeLessThan(s.indexOf("await client(t)"));
  });
  it("passes the cap only with --over-cap, and writes only after --confirm", () => {
    expect(s).toContain('const overCap = flag("--over-cap")');
    expect(s.indexOf('flag("--confirm")')).toBeLessThan(s.indexOf("writeFounding("));
  });
  it("leaves an explicit unmark alone", () => {
    expect(s).toContain("if (current === false) { unmarked++; return; }");
  });
});
