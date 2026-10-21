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
import { PV3_H1, PV3_SUB, PV3_LAUNCH_LINE, PV3_FREE, PV3_PRO, PV3_FAQ } from "./pricingCopy";

const html = () => renderPage(<PricingPage onNavigate={noNavigate} />, "/pricing");
const textOf = (h: string) =>
  h.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");

beforeEach(useSignedOutDb);
afterEach(restoreSmokeUser);

describe("pricing v3: the copy is the ref's, word for word", () => {
  /* Literals on purpose: the constants are what is under test, so the expected side may not read them. */
  const MUST = [
    "Founding writers",
    "A free QueryHawk campaign for our first 100 writers.",
    "We're looking for founding writers to put QueryHawk through its paces.",
    "Then, once we launch:",
    "For as long as you like",
    "One manuscript", "Up to 20 agents", "Unlimited queries and response tracking", "To-do list",
    "Bring your list across with Smart Import",
    "A pass sized to your campaign. No subscription.", "Everything in Free, plus:",
    "Unlimited agents", "Manuscript versions, one for each draft", "Submission packages and materials tracking",
    "Smart email drop", "The Scout",
    "Pick 1, 3, 6 or 12 months. Add a month whenever you need one, pause while you revise, and keep unused months if you sign.",
    "How long will I need?",
    "Will a pass renew without asking?",
    "No. A pass ends on its date. We'll remind you a week before, and you choose whether to extend.",
    "Which pass should I buy?",
    "Most first campaigns run around six months, with a few rounds of sending and waiting. If you're not sure, start there and extend if you need to.",
    "What happens to my months if I sign?",
    "Record your signing and any whole months left are kept as credit. They start again when you begin querying your next book.",
    "Why can I only add one manuscript right now?",
    "Adding a second manuscript is coming soon, on every pass.",
    "What happens when the hundred founding places are gone?",
    "Founding places close, and QueryHawk opens to everyone on the plans above. Founding writers stay free for their whole campaign.",
    "Will anything here charge me today?",
    "No. Passes aren't on sale yet, and nothing changes on your account until you choose to buy one.",
  ];
  it("renders every line", () => {
    const t = textOf(html());
    for (const line of MUST) expect(t, line).toContain(line);
  });

  it("…and the constants are those lines (so an edit in one place cannot pass)", () => {
    expect(PV3_H1).toBe(MUST[1]);
    expect(PV3_SUB).toBe(MUST[2]);
    expect(PV3_LAUNCH_LINE).toBe(MUST[3]);
    expect([...PV3_FREE.list]).toEqual(MUST.slice(5, 10));
    expect([...PV3_PRO.list]).toEqual(MUST.slice(12, 17));
    expect(PV3_FAQ).toHaveLength(6);
  });

  it("never names Wall of no or Corkboard, never says AI, never limits Smart Import to once", () => {
    const t = textOf(html());
    expect(t).not.toMatch(/wall of no/i);
    expect(t).not.toMatch(/corkboard/i);
    expect(t).not.toMatch(/\bAI\b/);
    const line = PV3_FREE.list.find((l) => /Smart Import/.test(l))!;
    expect(line).not.toMatch(/\bonce\b/i);
    expect(t).not.toMatch(/Smart Import[^.]{0,40}\bonce\b/i);
  });
});

describe("pricing v3: the banner", () => {
  it("puts the counter before the form", () => {
    const h = html();
    const count = h.indexOf('class="mk-pv3count"');
    const form = h.indexOf('class="mk-pv3form"');
    expect(count, "the counter's slot renders").toBeGreaterThan(-1);
    expect(form, "the form renders").toBeGreaterThan(-1);
    expect(count).toBeLessThan(form);
  });

  it("with no figure from the store, draws no counter and states no number but the H1's 100", () => {
    const band = sliceBetween(html(), '<section class="mk-pv3band"', '<section class="mk-pv3soon"');
    expect(band).not.toMatch(/["\s`]mk-fmcount["\s`]/);
    expect(band).not.toMatch(/["\s`]mk-fmbar["\s`]/);
    expect(textOf(band).match(/\d+/g)).toEqual(["100"]);
  });

  it("has exactly one h1, and it is the banner's", () => {
    const h = html();
    const h1s = [...h.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)];
    expect(h1s).toHaveLength(1);
    expect(textOf(h1s[0][1]).trim()).toBe("A free QueryHawk campaign for our first 100 writers.");
    expect(h.indexOf("<h1")).toBeGreaterThan(h.indexOf('class="mk-pv3band"'));
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
