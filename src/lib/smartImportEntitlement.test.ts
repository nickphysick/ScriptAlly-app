/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Plan rules v1 — Smart Import is ONCE PER ACCOUNT, on every plan. The client's rule (this module) and the server's
 * (functions/src/entitlementCore `smartImportUsed`, read by smartImportMap) are run over the same cases.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import type { SmartImportUsage } from "../types";
import {
  getSmartImportEntitlement, smartImportLine, smartImportUsed, isUsedRefusal, type SmartImportReason,
} from "./smartImportEntitlement";
import { smartImportUsed as serverUsed } from "../../functions/src/entitlementCore";

const CASES: { name: string; usage: SmartImportUsage | null; used: boolean }[] = [
  { name: "never imported (no doc)", usage: null, used: false },
  { name: "never imported (a doc with only the founding flag)", usage: { founding: true }, used: false },
  { name: "used the old free-once", usage: { smartImportFreeUsed: true }, used: true },
  { name: "used a Pro month under the old rule", usage: { smartImportLastUsedMonth: "2026-06" }, used: true },
  { name: "used both — more than one under the old rule; none left, nothing deleted", usage: { smartImportFreeUsed: true, smartImportLastUsedMonth: "2026-09" }, used: true },
];

describe("once per account, any plan — client and server agree", () => {
  for (const c of CASES) {
    it(c.name, () => {
      expect(smartImportUsed(c.usage)).toBe(c.used);
      expect(serverUsed(c.usage)).toBe(c.used);
      expect(getSmartImportEntitlement(c.usage)).toEqual(c.used ? { allowed: false, reason: "used" } : { allowed: true, reason: "available" });
    });
  }

  it("the plan does not enter into it: the entitlement takes usage alone", () => {
    expect(getSmartImportEntitlement.length).toBe(1);
  });

  it("every refusal word the callable has sent means used", () => {
    for (const r of ["used", "free_used", "pro_month_used"]) expect(isUsedRefusal(r), r).toBe(true);
    for (const r of ["in_progress", undefined, "rate_limited"]) expect(isUsedRefusal(r), String(r)).toBe(false);
  });
});

describe("the server refuses the second call, on every plan", () => {
  const src = readFileSync(new URL("../../functions/src/smartImport.ts", import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  it("the claim reads the one rule, never the plan or the month", () => {
    expect(src).toContain('if (smartImportUsed(usage)) return "used" as const;');
    expect(src).not.toMatch(/get\("plan"\)|PRO_PLAN|utcMonth|smartImportLastUsedMonth: month|pro_month_used/);
  });
  it("a usable result spends the one import, and the refusal says used", () => {
    expect(src).toContain("smartImportFreeUsed: true,");
    expect(src).toContain('reason: "used"');
  });
});

describe("smartImportLine — the plan card's allowance row", () => {
  it("available, and it does not mention a next one", () => {
    const l = smartImportLine({ allowed: true, reason: "available" });
    expect(l.tag).toBe("1 available");
    expect(l.note).not.toMatch(/next|month/i);
  });

  /** ⚠️ IT DOES NOT SELL. */
  it("⚠️ used: states the fact and does not upsell", () => {
    const l = smartImportLine({ allowed: false, reason: "used" });
    expect(l.tag).toBe("Used");
    expect(l.note.toLowerCase()).not.toMatch(/upgrade|pro plan|only £|unlock|month/);
  });

  it("⚠️ every reason the policy produces has a tag and a sentence", () => {
    const REASONS: SmartImportReason[] = ["available", "used"];
    for (const reason of REASONS) {
      const l = smartImportLine({ allowed: reason === "available", reason });
      expect(l.tag, reason).not.toBe("");
      expect(l.note, reason).not.toBe("");
    }
  });
});
