/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pricing v4 locks that hold on rendered markup (this repo's tests run in node — no DOM, no
 * interaction). What needs a browser — the box across the join, the faces, the fold, the journey
 * driven to its result — is `tests/e2e/pricingV4.measure.ts`; the counter with a figure in the store
 * is `pricingCounter.test.tsx`. Each lock was proved red by removing the thing it guards; the record
 * is in reports/pricing-v4/REPORT.md.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { renderPage, noNavigate, useSignedOutDb, restoreSmokeUser } from "../test/pageSmoke";

vi.mock("../lib/db", async () => (await import("../test/pageSmoke")).dbMock());
vi.mock("../lib/firebase", async () => (await import("../test/pageSmoke")).firebaseMock());
vi.mock("../components/toast/ToastProvider", async () => (await import("../test/pageSmoke")).toastMock());

import { PricingPage } from "./PricingPage";
import { stepAnswered, stepInsight, BLANK_ANSWERS } from "./CampaignJourney";
import { sliceBetween } from "../test/sliceBetween";
import {
  PV4_H1, PV4_SUB, PV4_LAUNCH_LINE, PV4_FREE, PV4_PRO, PV4_FAQ, PV4_PERKS, PV4_STEPS, faqText,
} from "./pricingCopy";

const html = () => renderPage(<PricingPage onNavigate={noNavigate} />, "/pricing");
/** The page's text, tags out, entities back, whitespace folded. It includes the closed perks panel
 *  (rendered with `hidden`), which is the point: hidden copy is still the page's copy. */
const textOf = (h: string) =>
  h.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/\s+/g, " ");

beforeEach(useSignedOutDb);
afterEach(restoreSmokeUser);

describe("pricing v4: the copy is the ref's, word for word", () => {
  /* Literals on purpose: the constants are what is under test, so the expected side may not read them. */
  const BOX = [
    "Founding writers",
    "A free QueryHawk campaign for our first 100 writers.",
    "We're looking for founding writers to put QueryHawk through its paces.",
    "What founding writers get",
    "The full power of QueryHawk, completely free of charge",
    "Full access to QueryHawk Pro for an entire querying campaign.",
    "A direct line to the founder",
    "You'll shape QueryHawk for future users, and help countless other writers get their story told.",
    "Bring your list across",
    "If you're already querying, Smart Import will read your list and turn your agents and queries into a smart QueryHawk database.",
    "Discounts for your network on launch",
    "When QueryHawk launches properly, you'll be able to invite friends and fellow writers on board with an exclusive Early Bird discount.",
    "How it works",
    "Sign up", "Receive and confirm your invite", "Log in with your unique founder's code",
  ];
  const TIERS = [
    "Then, once we launch:",
    "For as long as you like",
    "One manuscript", "Up to 20 agents", "Unlimited queries and response tracking", "To-do list",
    "Bring your list across with Smart Import",
    "A plan sized to your campaign. No subscription.", "Everything in Free, plus:",
    "Unlimited agents", "Manuscript versions, one for each draft", "Submission packages and materials tracking",
    "Smart email drop", "The Scout",
    "Pick 1, 3, 6 or 12 months. It never renews automatically, and we'll be in touch with options before it ends.",
  ];
  const PLANS = [
    "Pro plans", "Every Pro feature, for as long as your campaign runs.", "Which plan suits me best?",
    "1 month", "£7.99", "Add to any plan",
    "3 months", "£19", "£6.33 a month · save 20%",
    "6 months", "£29", "£4.83 a month · save 40%",
    "12 months", "£45", "£3.75 a month · save 53%",
  ];
  const FAQ: [string, string][] = [
    ["Is it really free for founding writers?",
      "Yes, completely. Founding writers get the full power of QueryHawk Pro for an entire querying campaign, free of charge. No card, and no catch."],
    ["What happens when my founding campaign ends?",
      "Just drop us a note to let us know you're done. We'd love to hear how it went."],
    ["What's the difference between Free and Pro?",
      "Free covers the essentials: one manuscript, up to 20 agents, and every query and response tracked. Pro adds the tools that make querying smarter, from manuscript versions and submission packages to Smart email drop and The Scout."],
    ["Is Pro a subscription?",
      "No. You choose a plan that matches how long you expect to be querying, from one month to twelve, and it simply ends on its date. We'll remind you a week before, so you're never charged for something you didn't ask for."],
    ["Which plan should I choose?",
      "Querying usually takes longer than writers expect, often six months or more once agents start reading full manuscripts. Answer four quick questions under Which plan suits me best? and we'll suggest one for you."],
    ["What if my campaign runs longer than planned?",
      "Before your current plan ends, we'll get in touch with options to extend it. Whatever you decide, you'll never lose your data."],
    ["What if I sign with an agent before my plan runs out?",
      "Congratulations! There's nothing you need to do. Your plan will simply run to the end of its months, and it won't renew automatically."],
    ["Can I bring across the spreadsheet I already use?",
      "Yes. Smart Import will read your list and turn your agents and queries into a smart QueryHawk database, so you don't have to start again."],
  ];

  it("renders every line: the box, its panel, the tiers, the plan tiles and the eight questions", () => {
    const t = textOf(html());
    for (const line of [...BOX, ...TIERS, ...PLANS, ...FAQ.flat()]) expect(t, line).toContain(line);
  });

  it("…and the constants are those lines (so an edit in one place cannot pass)", () => {
    expect(PV4_H1).toBe(BOX[1]);
    expect(PV4_SUB).toBe(BOX[2]);
    expect(PV4_PERKS.map((p) => [p.title, p.body]).flat()).toEqual(BOX.slice(4, 12));
    expect(PV4_STEPS).toEqual(BOX.slice(13, 16));
    expect(PV4_LAUNCH_LINE).toBe(TIERS[0]);
    expect([...PV4_FREE.list]).toEqual(TIERS.slice(2, 7));
    expect([...PV4_PRO.list]).toEqual(TIERS.slice(9, 14));
    expect(PV4_PRO.flex).toBe(TIERS[14]);
    expect(PV4_FAQ.map((qa) => [qa.q, faqText(qa.a)])).toEqual(FAQ);
  });

  it("says plans, never passes; never names Wall of no or Corkboard; never says AI or 'no card needed'", () => {
    const t = textOf(html());
    expect(t).not.toMatch(/\bpass(es)?\b/i);
    expect(t).not.toMatch(/wall of no/i);
    expect(t).not.toMatch(/corkboard/i);
    expect(t).not.toMatch(/\bAI\b/);
    expect(t).not.toMatch(/no card needed/i);
  });

  it("never limits Smart Import to once", () => {
    const t = textOf(html());
    const lines = t.split(/(?<=[.:?!])\s/).filter((l) => /Smart Import/.test(l));
    expect(lines.length, "the sweep found the Smart Import lines (not vacuous)").toBeGreaterThanOrEqual(3);
    for (const l of lines) expect(l, l).not.toMatch(/\bonce\b/i);
  });
});

describe("pricing v4: the founding box", () => {
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
    expect(band).not.toContain("places left");
  });

  it("the toggle is a real disclosure, and its panel is hidden until it opens", () => {
    const h = html();
    const btn = /<button[^>]*class="mk-fbmore"[^>]*>/.exec(h);
    expect(btn, "the toggle renders").toBeTruthy();
    expect(btn![0]).toContain('aria-expanded="false"');
    expect(btn![0]).toContain('aria-controls="mk-fbdetail"');
    expect(btn![0]).toContain('type="button"');
    const panel = /<div class="mk-fbdetail" id="mk-fbdetail"([^>]*)>/.exec(h);
    expect(panel, "the panel it controls renders").toBeTruthy();
    expect(panel![1]).toMatch(/\shidden=""/);
    expect(h.indexOf('id="mk-fbdetail"'), "the panel comes before the toggle, so open it sits at the panel's foot")
      .toBeLessThan(h.indexOf('class="mk-fbmore"'));
  });

  it("its drawing is decorative and versioned by the file's own md5 — the same version the band types", () => {
    const h = html();
    const panel = sliceBetween(h, 'class="mk-fbpanel"', 'class="mk-fbdetail"');
    expect(panel, "the panel is hidden from assistive tech").toContain('aria-hidden="true"');
    const img = /<img[^>]*>/.exec(panel)![0];
    expect(img).toContain('alt=""');
    const [path, version] = /src="([^"]+)"/.exec(img)![1].split("?v=");
    expect(path).toBe("/images/founding-writers.png");
    const here = dirname(fileURLToPath(import.meta.url));
    const png = readFileSync(resolve(here, "../../public" + path));
    expect(version, "the version IS the file").toBe(createHash("md5").update(png).digest("hex").slice(0, 8));
    /* FoundingBand.tsx (out of this pack's scope) still types the version itself: hold the two equal. */
    expect(readFileSync(resolve(here, "FoundingBand.tsx"), "utf8")).toContain(`version: "${version}"`);
  });

  it("has exactly one h1, and it is the box's", () => {
    const h = html();
    const h1s = [...h.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)];
    expect(h1s).toHaveLength(1);
    expect(textOf(h1s[0][1]).trim()).toBe("A free QueryHawk campaign for our first 100 writers.");
    expect(h.indexOf("<h1")).toBeGreaterThan(h.indexOf('<section class="mk-fb"'));
  });
});

describe("pricing v4: the questions", () => {
  it("are hidden behind a real disclosure, inside the Pro plans container, under the tiles", () => {
    const h = html();
    const plans = sliceBetween(h, 'class="mk-pv4plans"', 'class="mk-pv4sect"');
    const link = /<button[^>]*class="mk-pv4suit"[^>]*>([^<]*)<\/button>/.exec(plans);
    expect(link, "the link is in the container").toBeTruthy();
    expect(link![0]).toContain('aria-expanded="false"');
    expect(link![0]).toContain('aria-controls="how-long"');
    expect(link![1]).toBe("Which plan suits me best?");
    expect(plans.indexOf('class="mk-pv4pgrid"')).toBeLessThan(plans.indexOf('id="how-long"'));
    expect(/<div class="mk-pv4how" id="how-long"([^>]*)>/.exec(plans)![1]).toMatch(/\shidden=""/);
  });
  it("open on question 1 with Next disabled, nothing pre-selected and no tile navy", () => {
    const h = html();
    expect(h).toContain("Question 1 of 4");
    const next = /<button[^>]*class="[^"]*mk-jynext[^"]*"[^>]*>/.exec(h)![0];
    expect(next).toMatch(/\sdisabled=""/);
    expect(h).not.toContain('aria-pressed="true"');
    expect(h).not.toContain("mk-pv4ptile--fit");
  });
  it("each step opens only once it is answered, and a novel needs its length", () => {
    const blank = BLANK_ANSWERS;
    expect(stepAnswered(0, blank)).toBe(false);
    expect(stepAnswered(0, { ...blank, stage: "ready" })).toBe(true);
    expect(stepAnswered(1, { ...blank, kind: "novel" })).toBe(false);
    expect(stepAnswered(1, { ...blank, kind: "novel", len: "m" })).toBe(true);
    expect(stepAnswered(1, { ...blank, kind: "pb" })).toBe(true);
    expect(stepAnswered(2, blank), "the agents count has a default").toBe(true);
    expect(stepAnswered(3, blank)).toBe(false);
    expect(stepAnswered(3, { ...blank, pace: "unsure" })).toBe(true);
  });
  it("the agents note moves with the count, and says so when it is a guess", () => {
    const blank = BLANK_ANSWERS;
    expect(stepInsight(2, { ...blank, agents: 15 })).toMatch(/^That's a fairly short list/);
    expect(stepInsight(2, { ...blank, agents: 40 })).toMatch(/^That's about typical/);
    expect(stepInsight(2, { ...blank, agents: 65 })).toMatch(/^That's a long list/);
    expect(stepInsight(2, { ...blank, agentsUnknown: true })).toMatch(/^No problem. We'll go with about 40/);
    expect(stepInsight(1, { ...blank, kind: "novel" }), "a novel says nothing until its length").toBe("");
  });
});
