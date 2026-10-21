/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE EXPECTED VALUES ARE THE REF'S OWN OUTPUT. `campaignEstimate.ref.json` is written by
 * `scripts/pricing-v3-refoutputs.mjs`, which drives design-refs/pricing-page-v1.html's script in a
 * browser with the clock pinned — 480 answer combinations on two dates. Nothing here is a value
 * reasoned from reading the arithmetic.
 */
import { describe, it, expect } from "vitest";
import refCases from "./campaignEstimate.ref.json";
import { estimateCampaign, fitFor, planCard, slowWeeks, clampAgents, type CampaignAnswers } from "./campaignEstimate";

type RefCase = {
  today: string; answers: CampaignAnswers;
  label: string; why: string; prep: boolean; fit: 1 | 3 | 6 | 12; plan: string; amt: string; pm: string; tail: string;
};
const cases = refCases as RefCase[];
const day = (d: string) => new Date(d + "T12:00:00");

describe("estimateCampaign agrees with the ref, case for case", () => {
  it("the ref file is the full sweep (not vacuous)", () => {
    expect(cases.length).toBe(480);
    expect(new Set(cases.map((c) => c.today))).toEqual(new Set(["2026-10-21", "2026-06-15"]));
    /* every branch of the output is entered at least once */
    expect(new Set(cases.map((c) => c.fit))).toEqual(new Set([3, 6, 12]));
    expect(new Set(cases.map((c) => c.tail)).size).toBe(4);
    expect(cases.some((c) => c.label === "About a year or more")).toBe(true);
  });

  for (const c of cases) {
    const a = c.answers;
    it(`${c.today} · ${a.stage} · ${a.kind}${a.len ? "/" + a.len : ""} · ${a.agents} · ${a.pace}`, () => {
      const e = estimateCampaign(a, day(c.today));
      expect(e.label).toBe(c.label);
      expect(e.why).toBe(c.why);
      expect(e.prep).toBe(c.prep);
      expect(e.fit).toBe(c.fit);
      expect(e.tail).toBe(c.tail);
      const card = planCard(e.fit);
      expect(card.name).toBe(c.plan);
      expect(card.price).toBe(c.amt);
      expect(card.perMonth).toBe(c.pm);
    });
  }
});

describe("the pack's named cases, today fixed at 21 Oct 2026", () => {
  const today = day("2026-10-21");
  it("Getting ready, a novel of 80–110k, 40 agents, a few at a time", () => {
    const e = estimateCampaign({ stage: "prep", kind: "novel", len: "m", agents: 40, pace: "steady" }, today);
    expect(e.label).toBe("About twelve months");
    expect(e.fit).toBe(12);
    expect(e.why).toContain("in four rounds");
    expect(e.why).toContain("Christmas and August");
    expect(e.prep).toBe(true);
  });
  it("Ready to start, a picture book, 20 agents, bigger batches", () => {
    const e = estimateCampaign({ stage: "ready", kind: "pb", len: null, agents: 20, pace: "brisk" }, today);
    expect(e.label).toBe("About four months");
    expect(e.fit).toBe(6);
    expect(e.prep).toBe(false);
  });
});

describe("the parts", () => {
  it("the fit thresholds are 1.25, 3.5 and 7 months — including the one-month pass the sweep never reaches", () => {
    expect(fitFor(1)).toBe(1);
    expect(fitFor(1.25)).toBe(1);
    expect(fitFor(1.26)).toBe(3);
    expect(fitFor(3.5)).toBe(3);
    expect(fitFor(3.51)).toBe(6);
    expect(fitFor(7)).toBe(6);
    expect(fitFor(7.01)).toBe(12);
  });
  it("each slow season is counted once, in the order the campaign meets it", () => {
    expect(slowWeeks(60, day("2026-10-21"))).toEqual({ lost: 5, seen: ["Christmas", "August"] });
    expect(slowWeeks(60, day("2026-06-15"))).toEqual({ lost: 5, seen: ["August", "Christmas"] });
    expect(slowWeeks(4, day("2026-02-10"))).toEqual({ lost: 0, seen: [] });
  });
  it("the agents stepper runs 5 to 150", () => {
    expect(clampAgents(0)).toBe(5);
    expect(clampAgents(155)).toBe(150);
    expect(clampAgents(40)).toBe(40);
  });
});
