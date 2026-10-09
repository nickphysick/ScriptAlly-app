/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * P1 (unit half) — founding-member packages access, behind ONE constant. The rendered half is
 * tests/e2e/pkgMat.measure.ts P1: a Free account creates a package, and no Pro tag shows.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PACKAGES_OPEN_TO_ALL, packagesUnlocked } from "./entitlements";
import { canAttachPackages } from "./packageAttach";
import { UserPlan } from "../types";

const src = (f: string) => readFileSync(resolve(__dirname, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

describe("packages entitlement", () => {
  it("is open to every plan while PACKAGES_OPEN_TO_ALL", () => {
    expect(PACKAGES_OPEN_TO_ALL).toBe(true);
    expect(packagesUnlocked({ plan: UserPlan.FREE })).toBe(true);
    expect(packagesUnlocked({ plan: UserPlan.PRO })).toBe(true);
    expect(packagesUnlocked(null)).toBe(true);
    expect(canAttachPackages({ plan: UserPlan.FREE })).toBe(true);
  });

  it("every package gate reads the entitlement — none reads the plan directly", () => {
    const add = src("db.tsx");
    const a = add.indexOf("const addPackage = async"); const b = add.indexOf("const updatePackage = async");
    expect(a).toBeGreaterThan(-1); expect(b).toBeGreaterThan(a);
    const body = add.slice(a, b);
    expect(body).toContain("if (!packagesUnlocked(currentUser))");
    expect(body).not.toMatch(/plan === UserPlan\.FREE/);
    /* Manuscripts v21: the page shows no packages list of its own (a door to the packages page instead), so it
       reads no gate at all — neither the entitlement nor the plan */
    expect(src("../components/manuscripts/v12/ManuscriptPage.tsx")).not.toMatch(/UserPlan|isProUser|packagesUnlocked/);
    expect(src("../components/MaterialsField.tsx")).toMatch(/const isPro = packagesUnlocked\(currentUser\)/);
  });
});
