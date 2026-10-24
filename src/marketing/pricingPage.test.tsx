/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pricing v3 locks that hold on rendered markup (this repo's tests run in node — no DOM, no
 * interaction). What needs a browser — the faces, the order on screen, the fold, the journey driven
 * to its result — is `tests/e2e/pricingV3.measure.ts`. Each lock here was proved red by breaking the
 * thing it guards; the record is in reports/pricing-v3/REPORT.md.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { renderPage, noNavigate, useSignedOutDb, restoreSmokeUser } from "../test/pageSmoke";

vi.mock("../lib/db", async () => (await import("../test/pageSmoke")).dbMock());
vi.mock("../lib/firebase", async () => (await import("../test/pageSmoke")).firebaseMock());
vi.mock("../components/toast/ToastProvider", async () => (await import("../test/pageSmoke")).toastMock());

import { PricingPage } from "./PricingPage";
import { stepAnswered, stepInsight } from "./CampaignJourney";
import { sliceBetween } from "../test/sliceBetween";
import { PV4_H1, PV4_SUB, PV4_LAUNCH_LINE, PV4_FREE, PV4_PRO, PV4_FAQ } from "./pricingCopy";

const html = () => renderPage(<PricingPage onNavigate={noNavigate} />, "/pricing");
const textOf = (h: string) =>
  h.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");

beforeEach(useSignedOutDb);
afterEach(restoreSmokeUser);

describe("pricing v4: the copy is the ref's, word for word", () => {
  /* Literals on purpose: the constants are what is under test, so the expected side may not read them. */
  const MUST = [
    "Founding writers",
    "A free QueryHawk campaign for our first 100 writers.",
    "We're looking for founding writers to put QueryHawk through its paces.",
    "Then, once we launch:",
    "For as long as you like",
    "One manuscript", "Up to 20 agents", "Unlimited queries and response tracking", "To-do list",
    "Bring your list across with Smart Import",
    "A plan sized to your campaign. No subscription.", "Everything in Free, plus:",
    "Unlimited agents", "Manuscript versions, one for each draft", "Submission packages and materials tracking",
    "Smart email drop", "The Scout",
    "Pick 1, 3, 6 or 12 months. It never renews automatically, and we'll be in touch with options before it ends.",
    "Pro plans", "Every Pro feature, for as long as your campaign runs.",
    "Is it really free for founding writers?",
    "Yes, completely. Founding writers get the full power of QueryHawk Pro for an entire querying campaign, free of charge. No card, and no catch.",
    "What happens when my founding campaign ends?",
    "Just drop us a note to let us know you're done. We'd love to hear how it went.",
    "What's the difference between Free and Pro?",
    "Free covers the essentials: one manuscript, up to 20 agents, and every query and response tracked. Pro adds the tools that make querying smarter, from manuscript versions and submission packages to Smart email drop and The Scout.",
    "Is Pro a subscription?",
    "No. You choose a plan that matches how long you expect to be querying, from one month to twelve, and it simply ends on its date. We'll remind you a week before, so you're never charged for something you didn't ask for.",
    "Which plan should I choose?",
    "Querying usually takes longer than writers expect, often six months or more once agents start reading full manuscripts. Answer four quick questions under Which plan suits me best? and we'll suggest one for you.",
    "What if my campaign runs longer than planned?",
    "Before your current plan ends, we'll get in touch with options to extend it. Whatever you decide, you'll never lose your data.",
    "What if I sign with an agent before my plan runs out?",
    "Congratulations! There's nothing you need to do. Your plan will simply run to the end of its months, and it won't renew automatically.",
    "Can I bring across the spreadsheet I already use?",
    "Yes. Smart Import will read your list and turn your agents and queries into a smart QueryHawk database, so you don't have to start again.",
  ];
  it("renders every line", () => {
    const t = textOf(html());
    for (const line of MUST) expect(t, line).toContain(line);
  });

  it("…and the constants are those lines (so an edit in one place cannot pass)", () => {
    expect(PV4_H1).toBe(MUST[1]);
    expect(PV4_SUB).toBe(MUST[2]);
    expect(PV4_LAUNCH_LINE).toBe(MUST[3]);
    expect([...PV4_FREE.list]).toEqual(MUST.slice(5, 10));
    expect([...PV4_PRO.list]).toEqual(MUST.slice(12, 17));
    expect(PV4_FAQ).toHaveLength(8);
  });

  it("never names Wall of no or Corkboard, never says AI, never limits Smart Import to once", () => {
    const t = textOf(html());
    expect(t).not.toMatch(/wall of no/i);
    expect(t).not.toMatch(/corkboard/i);
    expect(t).not.toMatch(/\bAI\b/);
    const line = PV4_FREE.list.find((l) => /Smart Import/.test(l))!;
    expect(line).not.toMatch(/\bonce\b/i);
    expect(t).not.toMatch(/Smart Import[^.]{0,40}\bonce\b/i);
  });
});

describe("pricing v3: the banner", () => {
  it("puts the counter before the form", () => {
    const h = html();
    const count = h.indexOf('class="mk-fbcount"');
    const form = h.indexOf('class="mk-fbform"');
    expect(count, "the counter's slot renders").toBeGreaterThan(-1);
    expect(form, "the form renders").toBeGreaterThan(-1);
    expect(count).toBeLessThan(form);
  });

  it("with no figure from the store, draws no counter and states no number but the H1's 100", () => {
    /* Up to the perks panel: its "How it works" steps are numbered 1–3, which are not a places figure. */
    const band = sliceBetween(html(), '<section class="mk-fb"', 'class="mk-fbdetail"');
    expect(band).not.toMatch(/["\s`]mk-fmcount["\s`]/);
    expect(band).not.toMatch(/["\s`]mk-fmbar["\s`]/);
    expect(textOf(band).match(/\d+/g)).toEqual(["100"]);
  });

  it("has exactly one h1, and it is the banner's", () => {
    const h = html();
    const h1s = [...h.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)];
    expect(h1s).toHaveLength(1);
    expect(textOf(h1s[0][1]).trim()).toBe("A free QueryHawk campaign for our first 100 writers.");
    expect(h.indexOf("<h1")).toBeGreaterThan(h.indexOf('class="mk-fb"'));
  });
});

describe("pricing v3: the journey's gates", () => {
  const blank = { stage: null, kind: null, len: null, pace: null, agents: 40 } as const;
  it("opens on question 1 with Next disabled and nothing pre-selected", () => {
    const h = html();
    expect(h).toContain("Question 1 of 4");
    const next = /<button[^>]*class="[^"]*mk-jynext[^"]*"[^>]*>/.exec(h)![0];
    expect(next).toMatch(/\sdisabled=""/);
    expect(h).not.toContain('aria-pressed="true"');
  });
  it("each step opens only once it is answered, and a novel needs its length", () => {
    expect(stepAnswered(0, blank)).toBe(false);
    expect(stepAnswered(0, { ...blank, stage: "ready" })).toBe(true);
    expect(stepAnswered(1, { ...blank, kind: "novel" })).toBe(false);
    expect(stepAnswered(1, { ...blank, kind: "novel", len: "m" })).toBe(true);
    expect(stepAnswered(1, { ...blank, kind: "pb" })).toBe(true);
    expect(stepAnswered(2, blank), "the agents count has a default").toBe(true);
    expect(stepAnswered(3, blank)).toBe(false);
    expect(stepAnswered(3, { ...blank, pace: "brisk" })).toBe(true);
  });
  it("the agents insight moves with the count", () => {
    expect(stepInsight(2, { ...blank, agents: 15 })).toMatch(/^That's a short list/);
    expect(stepInsight(2, { ...blank, agents: 40 })).toMatch(/^That's in line/);
    expect(stepInsight(2, { ...blank, agents: 65 })).toMatch(/^A long list/);
    expect(stepInsight(1, { ...blank, kind: "novel" }), "a novel says nothing until its length").toBe("");
  });
});
