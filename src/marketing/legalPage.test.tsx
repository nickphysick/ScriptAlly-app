/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Terms in the privacy page's layout (contact and terms redesign v1, 12 Nov) with their old wording
 * restored (13 Nov) — and Privacy left exactly as it was.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { createHash } from "crypto";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("../lib/db", async () => (await import("../test/pageSmoke")).dbMock());
vi.mock("../lib/firebase", async () => (await import("../test/pageSmoke")).firebaseMock());

import { LegalPage, termsSectionId } from "./LegalPage";
import { LEGAL_COPY_REVIEWED, LEGAL_DOCUMENTS } from "./legalCopy";
import { LEGAL_LAST_UPDATED } from "../lib/companyInfo";

const noop = () => {};
const render = (doc: "terms" | "privacy") => renderToStaticMarkup(<LegalPage doc={doc} onNavigate={noop} />);

/**
 * ⚠️ PRIVACY IS NOT TOUCHED BY THE TERMS' MOVE, TO THE BYTE. The Terms now render through the view
 * Privacy has drawn since 2 Nov, so a change to that view for the Terms' sake could reach Privacy
 * unseen. The hash is of the whole rendered markup, captured before the move began (12 Nov). If
 * Privacy is ever meant to change, that change re-captures this — never the Terms' work.
 */
const PRIVACY_BASELINE = {
  sha256: "037b1de7b46b2f63a6d4799fb8c33ca0da14e434f3d699c799a4287e0f30f28a",
  length: 10469,
};

describe("Privacy is byte-identical to its baseline", () => {
  it("renders exactly the markup it rendered before the Terms moved", () => {
    const h = render("privacy");
    expect(h.length, "same length").toBe(PRIVACY_BASELINE.length);
    expect(createHash("sha256").update(h).digest("hex"), "same bytes").toBe(PRIVACY_BASELINE.sha256);
  });
});

describe("the Terms' working-draft ribbon", () => {
  /* The ribbon is a function of the flag, so the flag's state is asserted beside its effect — a green
     here with the flag already true would prove nothing. */
  it("is on the page while the copy is unreviewed, above the contents", () => {
    expect(LEGAL_COPY_REVIEWED).toBe(false);
    const h = render("terms");
    const ribbon = /<div class="mk-draftribbon" role="note"><span class="mk-drtag">Working draft<\/span><p>([^<]*)<\/p><\/div>/.exec(h);
    expect(ribbon, "the ribbon renders").toBeTruthy();
    expect(ribbon![1]).toBe("These terms are a working draft and have not yet been legally reviewed. Bracketed items are pending confirmation.");
    expect(h.indexOf("mk-draftribbon"), "above the contents").toBeLessThan(h.indexOf("mk-pv-toc"));
  });
});

describe("the Terms take the privacy page's layout", () => {
  it("the drawer: title, the date read from companyInfo, and the lede — no short version", () => {
    const h = render("terms");
    expect(h).toMatch(/^<div class="mk-pv" data-terms="true"><header class="mk-pv-hero">/);
    expect(h).toContain('<h1 class="mk-pv-h1">Terms</h1>');
    /* The date is READ, not typed: the copy carries the constant, and the page prints it. */
    expect(LEGAL_DOCUMENTS.terms.lastUpdated).toBe(LEGAL_LAST_UPDATED);
    expect(h).toContain(`<p class="mk-pv-upd">Last updated ${LEGAL_LAST_UPDATED}</p>`);
    expect(h).not.toContain("The short version");
    expect(h).not.toContain("mk-pv-short");
  });

  it("the contents name every section, and each anchor is the Terms' own", () => {
    const h = render("terms");
    const sections = LEGAL_DOCUMENTS.terms.sections;
    expect(sections).toHaveLength(10);
    sections.forEach((s, i) => {
      const id = termsSectionId(i);
      expect(h, `${id} is linked`).toContain(`href="#${id}"`);
      expect(h.match(new RegExp(`\\sid="${id}"`, "g")) ?? [], `${id} is one section`).toHaveLength(1);
    });
    expect(h, "no Privacy anchor on the Terms").not.toContain('id="priv-s');
  });

  it("no \"In plain words\" line survives on the Terms", () => {
    expect(render("terms")).not.toContain("In plain words");
  });
});

/** Rendered markup → the text a reader sees: tags gone, entities decoded, spaces collapsed. */
const textOf = (html: string) =>
  html.replace(/<[^>]+>/g, "")
    .replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/\s+/g, " ").trim();

/**
 * ⚠️ THE TERMS' WORDS ARE plan-rules-v1's, SENTENCE FOR SENTENCE (13 Nov, Nick). The 12 Nov move gave
 * the Terms Privacy's layout and swapped their wording for a ref's; Nick kept the layout and ruled the
 * words go back. Every string below was copied from `origin/plan-rules-v1:src/marketing/legalCopy.ts`
 * (with companyInfo's placeholders as they render), and the test compares the page's text, section by
 * section, heading and body. A change to any sentence of the Terms is a deliberate re-capture here.
 */
const OLD_TERMS = {
  lede:
    "The plain-English promise underneath the legal text: you own everything you put into QueryHawk, we'll be " +
    "straight with you about what the service does, and neither of us should need a lawyer to understand this page.",
  draft: "These terms are a working draft and have not yet been legally reviewed. Bracketed items are pending confirmation.",
  sections: [
    ["Who we are and what you're agreeing to",
      "These terms are an agreement between you and [LEGAL ENTITY NAME] of [REGISTERED / TRADING ADDRESS], United " +
      "Kingdom. By creating an account or using QueryHawk, you accept them. How we handle your personal data is set " +
      "out separately in the privacy policy."],
    ["The service",
      "QueryHawk is a tool for tracking your literary agent querying process: your agents, queries, manuscripts, " +
      "submission packages, and the history of each exchange. It's a record-keeper, not an adviser — it reports " +
      "what you've recorded, and it doesn't guarantee any outcome with any agent or publisher. " +
      "Early-access notice. QueryHawk is newly launched and actively developed. Features may change, and " +
      "occasional rough edges are part of the deal at this stage. We'll flag significant changes rather than " +
      "spring them on you."],
    ["Your account",
      "You need to be 16 or over, give us accurate account details, and keep your sign-in credentials to yourself. " +
      "You're responsible for what happens under your account; tell us straight away if you think it's been " +
      "compromised."],
    ["Your content",
      "Everything you put into QueryHawk — manuscripts, pitches, notes, querying records — remains yours. You grant " +
      "us only the limited licence needed to store, process, and display it back to you, which is what running the " +
      "service means. We claim no other rights in your writing, and we do not use your content to train AI models."],
    ["Acceptable use",
      "Don't use QueryHawk to store or transmit anything unlawful, or content you don't have the right to hold. " +
      "Don't attempt to breach, probe, or overload the service, or access another user's data. " +
      "Don't resell or scrape the service. " +
      "Breaching these lets us suspend or close the account involved."],
    ["AI-assisted features",
      "Some features, such as Smart Import, use third-party AI models to process content you explicitly submit to " +
      "them — the details are in section 4 of the privacy policy. AI-extracted output can contain mistakes; each " +
      "of these features gives you a review step, and you're responsible for checking the results before relying " +
      "on them."],
    ["Fees",
      "QueryHawk is currently free to use. A paid Pro tier is planned; when it arrives, its price and what it " +
      "includes will be stated clearly before you're asked to pay anything, and the free tier will remain " +
      "genuinely useful. These terms will be updated before any payment is taken."],
    ["Availability, and things going wrong",
      "We work to keep QueryHawk available and your data safe, but as a small, early-stage service it's provided " +
      "\"as is\" — we can't promise uninterrupted availability. Nothing in these terms excludes liability that " +
      "can't legally be excluded (such as for death or personal injury caused by negligence, or fraud). Beyond " +
      "that, our total liability to you is limited to the greater of £100 or the amount you've paid us in the " +
      "twelve months before the claim. You should keep your own copies of any manuscript files: QueryHawk tracks " +
      "your querying, it is not your manuscript's only home."],
    ["Ending things",
      "You can close your account at any time, and your data will be deleted as described in the privacy policy. " +
      "We can suspend or close accounts that breach these terms, and we'll give reasonable notice if we ever " +
      "discontinue the service — with a way to export your records first."],
    ["Changes and governing law",
      "If we change these terms in a way that matters, we'll tell you in the app or by email before the change " +
      "takes effect. These terms are governed by the laws of England and Wales, and any disputes belong to the " +
      "courts of England and Wales — though if you use the service as a consumer elsewhere in the UK, you keep the " +
      "protections of your home nation's law. " +
      "Questions about any of this: hello@queryhawk.net."],
  ] as const,
};

describe("the Terms' wording is plan-rules-v1's, sentence for sentence", () => {
  const h = render("terms");
  /* Each rendered section, in order, as [heading, body] — the number span is the position, not words. */
  const rendered = [...h.matchAll(/<section class="mk-pv-sec" id="terms-s(\d+)"><h2 class="mk-pv-h2"><span class="mk-pv-n">\d+<\/span>([\s\S]*?)<\/h2>([\s\S]*?)<\/section>/g)]
    .map((m) => ({ n: Number(m[1]), heading: textOf(m[2]), body: textOf(m[3].replace(/<\/(p|li)>/g, "</$1> ")) }));

  it("compares every section the page renders, and the page renders every section of the old copy", () => {
    expect(rendered.length, "a non-empty comparison").toBeGreaterThan(0);
    expect(rendered.length, "the full section count").toBe(LEGAL_DOCUMENTS.terms.sections.length);
    expect(rendered.length, "the old copy's section count").toBe(OLD_TERMS.sections.length);
    expect(rendered.map((r) => r.n)).toEqual(OLD_TERMS.sections.map((_, i) => i + 1));
  });

  OLD_TERMS.sections.forEach(([heading, body], i) => {
    it(`§${i + 1} ${heading}`, () => {
      expect(rendered[i]?.heading, `§${i + 1} heading`).toBe(heading);
      expect(rendered[i]?.body, `§${i + 1} body`).toBe(body);
    });
  });

  it("the lede and the ribbon are the old ones too", () => {
    expect(textOf(/<p class="mk-pv-lede">([\s\S]*?)<\/p>/.exec(h)?.[1] ?? "")).toBe(OLD_TERMS.lede);
    expect(textOf(/<div class="mk-draftribbon" role="note"><span class="mk-drtag">Working draft<\/span><p>([\s\S]*?)<\/p>/.exec(h)?.[1] ?? "")).toBe(OLD_TERMS.draft);
  });
});
