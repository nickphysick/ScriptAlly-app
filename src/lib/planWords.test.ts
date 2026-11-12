/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Plan rules v1 — the words. Pro is sold as "plans", never the other word; there is no agent cap; the Smart Import
 * allowance is once, not monthly; and the Scout is "The Scout". Comments are stripped before the sweep, so a note that
 * explains a retired word is not a hit — only what a reader can see, and what code is named, is.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("../../", import.meta.url).pathname;
const strip = (s: string) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const code = (p: string) => strip(readFileSync(join(ROOT, p), "utf8"));

const PLAN_FILES = [
  "src/marketing/pricingCopy.ts", "src/marketing/landingCopy.ts", "src/marketing/PricingPage.tsx",
  "src/components/PlansPage.tsx", "src/components/plans/PlanTable.tsx", "src/lib/planComparison.ts", "src/lib/planRules.ts",
];

const walk = (dir: string): string[] => readdirSync(join(ROOT, dir)).flatMap((n) => {
  const p = `${dir}/${n}`;
  return statSync(join(ROOT, p)).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(n) && !/\.test\.tsx?$/.test(n) ? [p] : [];
});

describe("plan words", () => {
  it("no user-facing string or identifier in the plan files says pass/passes", () => {
    for (const p of PLAN_FILES) expect(code(p).match(/\bpass(es)?\b/gi), p).toBeNull();
  });

  it("no source outside tests says '20 agents', 'One a month' or 'Comp Scout'", () => {
    const hits = walk("src").flatMap((p) => {
      const s = code(p);
      return [/20 agents/i, /twenty agents/i, /\bOne a month\b/, /Comp Scout/i].filter((re) => re.test(s)).map((re) => `${p}: ${re}`);
    });
    expect(hits).toEqual([]);
  });
});
