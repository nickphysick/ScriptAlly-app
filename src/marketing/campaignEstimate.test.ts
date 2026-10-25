/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE EXPECTED VALUES ARE THE REF'S OWN OUTPUT. `campaignEstimate.ref.json` is written by
 * `scripts/pricing-mobile-refoutputs.mjs`, which drives design-refs/pricing-page-mobile-v1.html's
 * script in a browser with the clock pinned (pricing on phones, 25 Oct: it superseded the desktop
 * ref's recording, from which it differs only in the two tails that sold a month at £5.99) — 810 answer combinations on two dates, "I don't know" and "Not
 * sure yet" included, with the note the ref shows under each answer. Nothing here is a value
 * reasoned from reading the arithmetic.
 */
import { describe, it, expect } from "vitest";
import refCases from "./campaignEstimate.ref.json";
import { estimateCampaign, fitFor, planCard, slowWeeks, clampAgents, type CampaignAnswers } from "./campaignEstimate";
import { stepInsight, stepAgents, toggleUnknown, BLANK_ANSWERS, type Answers } from "./CampaignJourney";

type RefCase = {
  today: string; answers: CampaignAnswers;
  label: string; why: string; prep: boolean; fit: 1 | 3 | 6 | 12; fits: number;
  plan: string; amt: string; pm: string; tail: string; notes: string[];
};
const cases = refCases as RefCase[];
const day = (d: string) => new Date(d + "T12:00:00");

describe("estimateCampaign agrees with the ref, case for case", () => {
  it("the ref file is the full sweep (not vacuous)", () => {
    expect(cases.length).toBe(810);
    expect(new Set(cases.map((c) => c.today))).toEqual(new Set(["2026-10-24", "2026-06-15"]));
    /* every branch of the output is entered at least once */
    expect(new Set(cases.map((c) => c.fit))).toEqual(new Set([3, 6, 12]));
    expect(new Set(cases.map((c) => c.tail)).size).toBe(4);
    /* ⚠️ THE 24 OCT POLICY: a plan is extended by QueryHawk getting in touch; no tail sells a month. */
    expect(cases.filter((c) => c.tail.includes("we'll be in touch with options to extend")).length).toBe(321);
    expect(cases.some((c) => c.tail.includes("£"))).toBe(false);
    expect(cases.some((c) => c.label === "About a year or more")).toBe(true);
    expect(cases.filter((c) => c.answers.agentsUnknown).length).toBe(90);
    expect(cases.filter((c) => c.answers.pace === "unsure").length).toBe(270);
    expect(cases.filter((c) => c.why.startsWith("Going by a typical campaign")).length).toBe(330);
    /* the ref turns exactly one plan tile navy, every time */
    expect(new Set(cases.map((c) => c.fits))).toEqual(new Set([1]));
  });

  for (const c of cases) {
    const a = c.answers;
    it(`${c.today} · ${a.stage} · ${a.kind}${a.len ? "/" + a.len : ""} · ${a.agentsUnknown ? "don't know" : a.agents} · ${a.pace}`, () => {
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
      /* the note under each of the four answers, as the ref showed it */
      const ans: Answers = { stage: a.stage, kind: a.kind, len: a.len, pace: a.pace, agents: a.agents, agentsUnknown: a.agentsUnknown };
      expect([0, 1, 2, 3].map((n) => stepInsight(n, ans))).toEqual(c.notes);
    });
  }
});

describe("the pack's named cases, today fixed at 24 Oct 2026", () => {
  const today = day("2026-10-24");
  it("(a) Getting ready, a novel of 80–110k, I don't know, Not sure yet", () => {
    const e = estimateCampaign({ stage: "prep", kind: "novel", len: "m", agents: 40, agentsUnknown: true, pace: "unsure" }, today);
    expect(e.label).toBe("About twelve months");
    expect(e.fit).toBe(12);
    expect(e.why.startsWith("Going by a typical campaign, you'd send about 40 queries in four rounds")).toBe(true);
    expect(e.prep).toBe(true);
  });
  it("(b) Ready to start, non-fiction, 40 agents, bigger batches", () => {
    const e = estimateCampaign({ stage: "ready", kind: "nonfic", len: null, agents: 40, agentsUnknown: false, pace: "brisk" }, today);
    expect(e.label).toBe("About five months");
    expect(e.fit).toBe(6);
    expect(e.why.startsWith("You'd send 40 queries in three rounds")).toBe(true);
    expect(e.prep).toBe(false);
  });
});

describe("the parts", () => {
  it("the fit thresholds are 1.25, 3.5 and 7 months — including the one-month plan the sweep never reaches", () => {
    expect(fitFor(1)).toBe(1);
    expect(fitFor(1.25)).toBe(1);
    expect(fitFor(1.26)).toBe(3);
    expect(fitFor(3.5)).toBe(3);
    expect(fitFor(3.51)).toBe(6);
    expect(fitFor(7)).toBe(6);
    expect(fitFor(7.01)).toBe(12);
  });
  it("each slow season is counted once, in the order the campaign meets it", () => {
    expect(slowWeeks(60, day("2026-10-24"))).toEqual({ lost: 5, seen: ["Christmas", "August"] });
    expect(slowWeeks(60, day("2026-06-15"))).toEqual({ lost: 5, seen: ["August", "Christmas"] });
    expect(slowWeeks(4, day("2026-02-10"))).toEqual({ lost: 0, seen: [] });
  });
  it("the agents stepper runs 5 to 150", () => {
    expect(clampAgents(0)).toBe(5);
    expect(clampAgents(155)).toBe(150);
    expect(clampAgents(40)).toBe(40);
  });
  it("I don't know sets 40; a stepper press clears it; pressing it again clears it too", () => {
    const at60 = { ...BLANK_ANSWERS, agents: 60 };
    const idk = toggleUnknown(at60);
    expect(idk).toMatchObject({ agentsUnknown: true, agents: 40 });
    expect(stepAgents(idk, 5)).toMatchObject({ agentsUnknown: false, agents: 45 });
    expect(stepAgents(idk, -5)).toMatchObject({ agentsUnknown: false, agents: 35 });
    expect(toggleUnknown(idk)).toMatchObject({ agentsUnknown: false, agents: 40 });
  });
  it("Not sure yet is estimated at the steady pace, said to be a guess", () => {
    const base = { stage: "ready" as const, kind: "pb" as const, len: null, agents: 40, agentsUnknown: false };
    const steady = estimateCampaign({ ...base, pace: "steady" }, day("2026-10-24"));
    const unsure = estimateCampaign({ ...base, pace: "unsure" }, day("2026-10-24"));
    expect(unsure.label).toBe(steady.label);
    expect(unsure.fit).toBe(steady.fit);
    expect(unsure.why).toBe(steady.why.replace(/^You/, "Going by a typical campaign, you"));
  });
});
