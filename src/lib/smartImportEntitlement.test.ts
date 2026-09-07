/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from "vitest";
import { UserPlan, SmartImportUsage } from "../types";
import {
  getSmartImportEntitlement, utcMonth, firstOfNextMonth, smartImportLine, SmartImportReason,
} from "./smartImportEntitlement";

const NOW = new Date(Date.UTC(2026, 5, 15)); // 2026-06-15 (UTC) → month "2026-06"

describe("month helpers", () => {
  it("utcMonth formats YYYY-MM in UTC", () => {
    expect(utcMonth(NOW)).toBe("2026-06");
    expect(utcMonth(new Date(Date.UTC(2026, 11, 1)))).toBe("2026-12");
  });
  it("firstOfNextMonth rolls to the first of the next month (incl. year boundary)", () => {
    expect(firstOfNextMonth("2026-06")).toBe("2026-07-01");
    expect(firstOfNextMonth("2026-12")).toBe("2027-01-01");
  });
});

const usage = (over: SmartImportUsage = {}): SmartImportUsage => ({ ...over });

describe("getSmartImportEntitlement — Free tier", () => {
  it("free + unused → free_available", () => {
    expect(getSmartImportEntitlement(UserPlan.FREE, usage(), NOW)).toEqual({
      allowed: true, tier: "free", reason: "free_available",
    });
  });
  it("free + used → free_used (blocked, no nextAvailable)", () => {
    expect(getSmartImportEntitlement(UserPlan.FREE, usage({ smartImportFreeUsed: true }), NOW)).toEqual({
      allowed: false, tier: "free", reason: "free_used",
    });
  });
  it("undefined plan + null usage defaults to free + available", () => {
    expect(getSmartImportEntitlement(undefined, null, NOW).reason).toBe("free_available");
  });
});

describe("getSmartImportEntitlement — Pro tier", () => {
  it("pro + no import this month → pro_available", () => {
    expect(getSmartImportEntitlement(UserPlan.PRO, null, NOW)).toEqual({
      allowed: true, tier: "pro", reason: "pro_available",
    });
  });
  it("pro + used a PREVIOUS month → pro_available (month reset)", () => {
    expect(getSmartImportEntitlement(UserPlan.PRO, usage({ smartImportLastUsedMonth: "2026-05" }), NOW).reason)
      .toBe("pro_available");
  });
  it("pro + used THIS month → pro_month_used with next-available date", () => {
    expect(getSmartImportEntitlement(UserPlan.PRO, usage({ smartImportLastUsedMonth: "2026-06" }), NOW)).toEqual({
      allowed: false, tier: "pro", reason: "pro_month_used", nextAvailable: "2026-07-01",
    });
  });
  it("pro allowance ignores the free-once flag (upgrade unlocks immediately)", () => {
    // A free user who spent their free import then upgraded: free flag set, but Pro this-month unused.
    expect(getSmartImportEntitlement(UserPlan.PRO, usage({ smartImportFreeUsed: true }), NOW).allowed).toBe(true);
  });
});

describe("smartImportLine — the plan card's allowance row", () => {
  /* A fixed formatter, so the assertions are about the SENTENCE and not about the machine's locale. */
  const fmt = (iso: string) => `[${iso}]`;
  const line = (plan: UserPlan | undefined, usage: SmartImportUsage | null, now = new Date("2026-09-07T10:00:00Z")) =>
    smartImportLine(getSmartImportEntitlement(plan, usage, now), fmt);

  it("free, unused: available, and it does not mention a next one", () => {
    const l = line(UserPlan.FREE, null);
    expect(l.tag).toBe("1 available");
    expect(l.note).not.toMatch(/next/i);
  });

  /**
   * ⚠️ IT DOES NOT SELL. "You've used yours — upgrade for one a month" is a true sentence and an
   * advertisement in a settings row, on a card that already carries one honest CTA.
   */
  it("⚠️ free, used: states the fact and does not upsell", () => {
    const l = line(UserPlan.FREE, { smartImportFreeUsed: true } as SmartImportUsage);
    expect(l.tag).toBe("Used");
    expect(l.note.toLowerCase()).not.toMatch(/upgrade|pro plan|only £|unlock/);
  });

  it("pro, unused this month: available, and no date — there is nothing to wait for", () => {
    const l = line(UserPlan.PRO, null);
    expect(l.tag).toBe("1 available");
    expect(l.note).not.toContain("[");
  });

  /**
   * ⚠️ THE DATE IS THE WHOLE POINT OF THIS BRANCH. "Used" on its own tells a Pro subscriber they
   * have lost something; with the reset date it tells them when it comes back.
   */
  it("pro, used this month: names the reset date, formatted by the caller", () => {
    const l = line(UserPlan.PRO, { smartImportLastUsedMonth: "2026-09" } as SmartImportUsage);
    expect(l.tag).toBe("Used");
    expect(l.note).toContain("[2026-10-01]");
  });

  /* ⚠️ AND IT SURVIVES A MISSING DATE RATHER THAN PRINTING ONE. `nextAvailable` is optional on the
     type, so the branch that needs it must not assume it — "arrives on undefined" is the shape this
     forecloses. */
  it("⚠️ says something true when the reset date is missing", () => {
    const l = smartImportLine({ allowed: false, tier: "pro", reason: "pro_month_used" }, fmt);
    expect(l.note).not.toMatch(/undefined|NaN|\[/);
    expect(l.note).toMatch(/next month/i);
  });

  /* Every reason the policy can return has words — asserted over the union, not a hand-typed list. */
  it("⚠️ every reason the policy produces has a tag and a sentence", () => {
    const REASONS: SmartImportReason[] = ["free_available", "free_used", "pro_available", "pro_month_used"];
    for (const reason of REASONS) {
      const l = smartImportLine({ allowed: true, tier: "free", reason }, fmt);
      expect(l.tag, reason).not.toBe("");
      expect(l.note, reason).not.toBe("");
    }
  });
});
