/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Plan rules v1.1 (13 Nov) — the copy and the code say the same about limits. The plan table, /pricing and the landing
 * tiers say agents are unlimited on both plans; v1 said so while `addAgent` still refused a sixth agent on a stored Free
 * plan, and both limits read the stored plan, so a founding writer stored as Free was held to them. These tests read
 * the code: no agent count is compared anywhere, and the one manuscript limit is read off the resolver.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { manuscriptLimitError, FREE_MANUSCRIPT_LIMIT } from "./manuscripts";
import { PLAN_ROWS } from "./planComparison";

const ROOT = new URL("../../", import.meta.url).pathname;
const strip = (s: string) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const walk = (dir: string): string[] => readdirSync(join(ROOT, dir)).flatMap((n) => {
  const p = `${dir}/${n}`;
  return statSync(join(ROOT, p)).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(n) && !/\.test\.tsx?$/.test(n) ? [p] : [];
});
const SOURCES = [...walk("src"), ...walk("functions/src")].map((p) => [p, strip(readFileSync(join(ROOT, p), "utf8"))] as const);

describe("plan limits — copy and code agree", () => {
  it("the plan table says agents are unlimited on both plans", () => {
    const row = PLAN_ROWS.find((r) => r.label === "Agents");
    expect(row, "the Agents row").toBeTruthy();
    expect(JSON.stringify(row!.free)).toMatch(/Unlimited/);
    expect(JSON.stringify(row!.pro)).toMatch(/Unlimited/);
  });

  it("so no source compares a count of agents against a limit", () => {
    const hits = SOURCES.filter(([, s]) => /\bagents\.length\s*(>=\s*([2-9]|\d{2,})|>\s*([1-9]|\d{2,}))/.test(s) || /capped at \d+ agents/i.test(s)).map(([p]) => p);
    expect(hits).toEqual([]);
  });

  it("no source gates a count on the STORED plan — limits read the resolver", () => {
    const hits = SOURCES.filter(([, s]) => /plan\s*===\s*UserPlan\.FREE\s*&&[^;\n]*\.length\s*>=/.test(s)).map(([p]) => p);
    expect(hits).toEqual([]);
  });

  it("the manuscript limit holds Free only, and never a Pro-entitled account (founding, Pro, trial, pending)", () => {
    expect(FREE_MANUSCRIPT_LIMIT).toBe(1);
    expect(manuscriptLimitError(false, 0)).toBeNull();
    expect(manuscriptLimitError(false, 1)).toBeTruthy();
    expect(manuscriptLimitError(true, 1)).toBeNull();
    expect(manuscriptLimitError(true, 40)).toBeNull();
  });

  it("every caller passes the resolver's `pro`, and the add form and db go through the one check", () => {
    const callers = SOURCES.filter(([p, s]) => p !== "src/lib/manuscripts.ts" && /manuscriptLimitError\(/.test(s));
    expect(callers.map(([p]) => p).sort()).toEqual([
      "src/components/AddManuscriptFocusForm.tsx", "src/components/Onboarding.tsx",
      "src/components/import/ImportPage.tsx", "src/lib/db.tsx",
    ]);
    for (const [p, s] of callers) {
      for (const m of s.matchAll(/manuscriptLimitError\(([^,]+),/g)) expect(m[1].trim(), p).toMatch(/[eE]ntitlement\.pro$/);
    }
  });
});
