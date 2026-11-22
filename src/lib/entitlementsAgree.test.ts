/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Plan rules v1 — the client's resolver (lib/entitlements) and the server's (functions/src/entitlementCore) must give
 * the same answer for every case the plan rules name. functions/ cannot import from src/, so the rule is written twice;
 * this is what keeps the two copies one rule.
 */
import { describe, it, expect } from "vitest";
import { entitlementBasis as client, resolveEntitlement, DAY_MS as CLIENT_DAY } from "./entitlements";
import { entitlementBasis as server, hasPro, TRIAL_DAYS as SERVER_TRIAL, DAY_MS as SERVER_DAY, PRO_PLAN } from "../../functions/src/entitlementCore";
import { TRIAL_DAYS } from "./planRules";
import { UserPlan } from "../types";

const CREATED = Date.parse("2026-11-01T09:00:00Z");
/** The instant `n` days into day `day` (day 1 is the creation day). */
const onDay = (day: number, hourInto = 12) => CREATED + (day - 1) * DAY_MS + hourInto * 3_600_000;
const DAY_MS = CLIENT_DAY;

const CASES: { name: string; founding: boolean; plan: string; nowMs: number; createdMs: number | null; want: string }[] = [
  { name: "founding, long after the trial", founding: true, plan: UserPlan.FREE, createdMs: CREATED, nowMs: onDay(400), want: "founding" },
  { name: "founding on day 1 (no trial clock)", founding: true, plan: UserPlan.FREE, createdMs: CREATED, nowMs: onDay(1), want: "founding" },
  { name: "day 1, Free", founding: false, plan: UserPlan.FREE, createdMs: CREATED, nowMs: onDay(1, 0), want: "trial" },
  { name: "day 14, last hour, Free", founding: false, plan: UserPlan.FREE, createdMs: CREATED, nowMs: onDay(14, 23.99), want: "trial" },
  { name: "day 15, first instant, Free", founding: false, plan: UserPlan.FREE, createdMs: CREATED, nowMs: CREATED + 14 * DAY_MS, want: "free" },
  { name: "day 15, Free", founding: false, plan: UserPlan.FREE, createdMs: CREATED, nowMs: onDay(15), want: "free" },
  { name: "Pro, long after the trial", founding: false, plan: UserPlan.PRO, createdMs: CREATED, nowMs: onDay(400), want: "pro" },
  { name: "unknown creation time grants no trial", founding: false, plan: UserPlan.FREE, createdMs: null, nowMs: onDay(1), want: "free" },
];

describe("client and server resolve every plan-rules case the same way", () => {
  it("the two copies share their constants", () => {
    expect(SERVER_TRIAL).toBe(TRIAL_DAYS);
    expect(TRIAL_DAYS).toBe(14);
    expect(SERVER_DAY).toBe(CLIENT_DAY);
    expect(PRO_PLAN).toBe(UserPlan.PRO);
  });

  for (const c of CASES) {
    it(c.name, () => {
      const facts = { founding: c.founding, plan: c.plan, createdMs: c.createdMs, nowMs: c.nowMs };
      expect(client(facts)).toBe(c.want);
      expect(server(facts)).toBe(c.want);
      expect(resolveEntitlement(facts).pro, "client: Pro features open").toBe(hasPro(server(facts)));
    });
  }
});

describe("what the app reads", () => {
  it("founding writers never see an upgrade prompt, and have no trial end", () => {
    const e = resolveEntitlement({ founding: true, plan: UserPlan.FREE, createdMs: CREATED, nowMs: onDay(3) });
    expect(e).toEqual({ basis: "founding", pro: true, prompts: false, trialEndsMs: null });
  });

  it("a trial account has everything, may see prompts, and knows when the trial ends", () => {
    const e = resolveEntitlement({ founding: false, plan: UserPlan.FREE, createdMs: CREATED, nowMs: onDay(3) });
    expect(e).toEqual({ basis: "trial", pro: true, prompts: true, trialEndsMs: CREATED + 14 * DAY_MS });
  });

  it("day 15 on Free: Pro features closed", () => {
    const e = resolveEntitlement({ founding: false, plan: UserPlan.FREE, createdMs: CREATED, nowMs: onDay(15) });
    expect(e.pro).toBe(false);
    expect(e.prompts).toBe(true);
  });

  it("before the private doc loads, nothing is locked and nothing is sold", () => {
    expect(resolveEntitlement({ founding: null, plan: UserPlan.FREE, createdMs: CREATED, nowMs: onDay(400) }))
      .toEqual({ basis: "pending", pro: true, prompts: false, trialEndsMs: null });
  });
});
