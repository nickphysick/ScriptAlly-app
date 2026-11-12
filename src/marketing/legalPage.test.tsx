/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Terms in the privacy page's layout (contact and terms redesign v1, 12 Nov) — and Privacy left exactly
 * as it was.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { createHash } from "crypto";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("../lib/db", async () => (await import("../test/pageSmoke")).dbMock());
vi.mock("../lib/firebase", async () => (await import("../test/pageSmoke")).firebaseMock());

import { LegalPage, termsSectionId } from "./LegalPage";
import { LEGAL_COPY_REVIEWED, LEGAL_DOCUMENTS } from "./legalCopy";

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
    expect(ribbon![1]).toBe("These terms are a working draft and have not yet been legally reviewed.");
    expect(h.indexOf("mk-draftribbon"), "above the contents").toBeLessThan(h.indexOf("mk-pv-toc"));
  });
});

describe("the Terms take the privacy page's layout", () => {
  it("the drawer: title, date and the short version", () => {
    const h = render("terms");
    expect(h).toMatch(/^<div class="mk-pv" data-terms="true"><header class="mk-pv-hero">/);
    expect(h).toContain('<h1 class="mk-pv-h1">Terms</h1>');
    expect(h).toContain('<p class="mk-pv-upd">Last updated 12 November 2026</p>');
    const ticks = [...h.matchAll(/<li><svg[\s\S]*?<\/svg><span>([^<]*)<\/span><\/li>/g)].map((m) => m[1]);
    expect(ticks).toEqual([
      "Your writing and your querying records stay yours.",
      "QueryHawk keeps records and reminds you. It never writes for you or contacts agents.",
      "Nothing is charged unless you choose a plan.",
      "You can take a copy of your data, or leave, at any time.",
    ]);
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

  it("six sections open with an \"In plain words\" line", () => {
    const h = render("terms");
    expect(h.match(/<strong>In plain words:<\/strong>/g) ?? []).toHaveLength(6);
  });

  it("no bracketed placeholder renders, and Nick is named by first name only", () => {
    const h = render("terms");
    expect(h).not.toMatch(/\[[A-Z /]+\]/);
    expect(h).toContain("which is run by Nick in London, UK.");
    expect(h).not.toMatch(/Physick/);
  });
});
