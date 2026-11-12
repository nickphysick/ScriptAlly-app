/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Plan rules v1 — no second list of what is Pro. Every gate reads lib/entitlements (founding flag, plan, trial); the
 * stored plan is compared to Pro only in the resolver itself and in the few places named here, each for a stated reason.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("../../", import.meta.url).pathname;
const walk = (dir: string): string[] => readdirSync(join(ROOT, dir)).flatMap((n) => {
  const p = `${dir}/${n}`;
  return statSync(join(ROOT, p)).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(n) && !/\.test\.tsx?$/.test(n) && !p.startsWith("src/test/") ? [p] : [];
});
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/** Each file allowed to read the stored plan directly, and why. */
const ALLOWED: Record<string, string> = {
  "src/lib/entitlements.ts": "the resolver",
  "src/lib/suggestComps.ts": "isProUser — 'on the paid Pro plan', a fact, not a gate",
  "src/components/AllManuscripts.tsx": "locked file, rendered by no route",
  "src/components/todo/HousekeepingSweep.tsx": "assist-fill: its callable (assistAgentData) checks the plan itself and is out of this pass",
  "src/components/onboarding/SetupFrame.tsx": "dev lab fixture",
  "src/components/onboarding/OnbLab.tsx": "dev lab fixture",
  "src/lib/smartImportEntitlement.ts": "Smart Import's own rule — once per account on every plan",
};

describe("one source for what is Pro", () => {
  it("no file outside the allowed set compares the stored plan to Pro", () => {
    const hits = walk("src").filter((p) => /UserPlan\.PRO|isProUser\(|plan === ["']Pro["']/.test(strip(readFileSync(join(ROOT, p), "utf8"))));
    expect(hits.filter((p) => !(p in ALLOWED))).toEqual([]);
  });

  it("no callable states its own Pro condition — they read functions/src/entitlement.ts", () => {
    for (const f of ["functions/src/emailImport.ts", "functions/src/suggestComps.ts"]) {
      const s = strip(readFileSync(join(ROOT, f), "utf8"));
      expect(s, f).toContain("hasPro(await resolveBasis(uid, userSnap, entSnap))");
      expect(s, f).not.toMatch(/get\("plan"\)|PRO_PLAN|REQUIRES_PRO/);
    }
  });
});
