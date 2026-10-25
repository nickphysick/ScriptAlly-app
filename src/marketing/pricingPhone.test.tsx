/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pricing on phones (25 Oct; ref design-refs/pricing-page-mobile-v1.html) — the locks that hold on
 * rendered markup. This repo's tests run in node with no DOM, so the phone tree is rendered directly
 * (`usePhone` reads "not a phone" without `matchMedia`). Behaviour — the swipe, the sheet, the
 * sticky bar — is measured on a rendered page in tests/e2e/pricingMobile.measure.ts.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderPage, noNavigate } from "../test/pageSmoke";

vi.mock("../lib/db", async () => (await import("../test/pageSmoke")).dbMock());
vi.mock("../lib/firebase", async () => (await import("../test/pageSmoke")).firebaseMock());
vi.mock("../components/toast/ToastProvider", async () => (await import("../test/pageSmoke")).toastMock());

import { PricingPhone, perkIndex } from "./PricingPhone";
import { PricingPage } from "./PricingPage";
import { PV4_FAQ, PV4_PERKS, PV4_STEPS, faqText, PRO_PLANS, planTileLines } from "./pricingCopy";

const html = () => renderPage(<PricingPhone onNavigate={noNavigate} />, "/pricing");
const text = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");

describe("the phone tree", () => {
  it("has one h1, and it is the founding box's", () => {
    const h = html();
    expect(h.match(/<h1\b/g)?.length).toBe(1);
    expect(h).toMatch(/<section class="mk-pvbox"[^>]*>[\s\S]*<h1 id="mk-pvm-h1"/);
  });
  it("is not what renders without a phone width — the desktop tree is", () => {
    const h = renderPage(<PricingPage onNavigate={noNavigate} />, "/pricing");
    expect(h).toContain('class="mk-pv4"');
    expect(h).not.toContain('class="mk-pvm"');
  });
  it("reads every perk, step and question from the shared copy module", () => {
    const t = text(html());
    for (const p of PV4_PERKS) { expect(t).toContain(p.title); expect(t).toContain(p.body); }
    for (const s of PV4_STEPS) expect(t).toContain(s);
    for (const q of PV4_FAQ) { expect(t).toContain(q.q); expect(t).toContain(faqText(q.a)); }
  });
  it("says plans, never passes", () => {
    expect(text(html())).not.toMatch(/\bpass(es)?\b/i);
  });
  it("the toggle and every question are disclosures over a hidden region", () => {
    const h = html();
    expect(h).toMatch(/<button type="button" class="mk-pvmore" aria-expanded="false" aria-controls="mk-pvdetail"/);
    expect(h).toMatch(/<div class="mk-pvdetail" id="mk-pvdetail" hidden=""/);
    expect(h.match(/aria-controls="mk-pvqa-\d"/g)?.length).toBe(PV4_FAQ.length);
    expect(h.match(/class="mk-pvqaa" id="mk-pvqa-\d" hidden=""/g)?.length).toBe(PV4_FAQ.length);
  });
  it("the Free / Pro switch is a tablist with Free selected", () => {
    const h = html();
    expect(h).toMatch(/class="mk-pvseg" role="tablist"/);
    expect(h).toMatch(/role="tab" id="mk-pvtab-free" aria-selected="true"/);
    expect(h).toMatch(/role="tab" id="mk-pvtab-pro" aria-selected="false"/);
  });
  it("no plan is lit before the questions have been answered", () => {
    expect(html()).not.toContain("mk-pvpt--fit");
  });
});

describe("the parts", () => {
  it("the current perk follows the scroll, and stops at the last", () => {
    expect(perkIndex(0, 262, 4)).toBe(0);
    expect(perkIndex(2 * 272, 262, 4)).toBe(2);
    expect(perkIndex(760, 262, 4)).toBe(3);
    expect(perkIndex(9999, 262, 4)).toBe(3);
    expect(perkIndex(100, 0, 4)).toBe(0);
  });
  it("a tile's phone line puts the saving on its own line, and the one-month plan reads 'Add to any plan'", () => {
    expect(PRO_PLANS.map(planTileLines)).toEqual([
      { lead: "Add to any plan", save: null },
      { lead: "£6.33 a month", save: "save 20%" },
      { lead: "£4.83 a month", save: "save 40%" },
      { lead: "£3.75 a month", save: "save 53%" },
    ]);
  });
});
