/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Packages entitlement — plan rules v1: the one resolver, no open-to-all switch.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { packagesUnlocked } from "./entitlements";
import { canAttachPackages } from "./packageAttach";
import type { Entitlement } from "./entitlements";

const FREE: Entitlement = { basis: "free", pro: false, prompts: true, trialEndsMs: null };
const PRO: Entitlement = { basis: "pro", pro: true, prompts: false, trialEndsMs: null };

const src = (f: string) => readFileSync(resolve(__dirname, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

describe("packages entitlement", () => {
  it("plan rules v1: open to founding, trial and Pro; closed on day-15 Free (no open-to-all switch any more)", () => {
    expect(packagesUnlocked(FREE)).toBe(false);
    expect(packagesUnlocked(PRO)).toBe(true);
    expect(packagesUnlocked({ ...PRO, basis: "founding" })).toBe(true);
    expect(packagesUnlocked({ ...PRO, basis: "trial", prompts: true })).toBe(true);
    expect(canAttachPackages(FREE)).toBe(false);
    expect(readFileSync(resolve(__dirname, "entitlements.ts"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "")).not.toMatch(/OPEN_TO_ALL|FOUNDING_ACCESS/);
  });

  it("every package gate reads the entitlement — none reads the plan directly", () => {
    const add = src("db.tsx");
    const a = add.indexOf("const addPackage = async"); const b = add.indexOf("const updatePackage = async");
    expect(a).toBeGreaterThan(-1); expect(b).toBeGreaterThan(a);
    const body = add.slice(a, b);
    expect(body).toContain("if (!packagesUnlocked(entitlement))");
    expect(body).not.toMatch(/plan === UserPlan\.FREE/);
    /* Manuscripts v21: the page shows no packages list of its own (a door to the packages page instead), so it
       reads no gate at all — neither the entitlement nor the plan */
    expect(src("../components/manuscripts/v12/ManuscriptPage.tsx")).not.toMatch(/UserPlan|isProUser|packagesUnlocked/);
    expect(src("../components/MaterialsField.tsx")).toMatch(/const isPro = packagesUnlocked\(entitlement\)/);
  });
});
