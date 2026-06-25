/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from "vitest";
import { UserPlan, SmartImportUsage } from "../types";
import { getSmartImportEntitlement, utcMonth, firstOfNextMonth } from "./smartImportEntitlement";

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
