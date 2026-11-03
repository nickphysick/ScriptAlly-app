/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Landing waitlist clarity v1 (2 Nov; ref design-refs/landing-waitlist-clarity-v1.html).
 *   WLC-1 · the phone hero: the founding block in place of the form, places line and privacy line, and
 *           "See what it does" as a wordless chevron button on the hero's foot.
 * Rendered with the founding store mocked, so the places line can be read with a real count.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { readFileSync } from "fs";
import { join } from "path";
import { renderToStaticMarkup } from "react-dom/server";

let mockCount: { cap: number; claimed: number } | null = null;
vi.mock("./foundingStore", () => ({
  useFounding: () => ({ state: "idle", count: mockCount }),
  ensureCount: () => {},
  submitFounding: async () => {},
}));

import { LandingPhone } from "./LandingPhone";
import { HeroPlaces } from "./HeroPlaces";

const noNavigate = () => {};
const unesc = (s: string) => s.replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"');
const text = (h: string) => unesc(h.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
const css = (f: string) => readFileSync(join(process.cwd(), "src/marketing", f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

export const HEADING = "We're looking for founding writers";
export const TICKS = ["Everything QueryHawk has to offer", "Free for your whole campaign", "A direct line to the founder"];

/** The phone hero's own markup, from its opening tag to the section's close. */
const phoneHero = () => {
  const h = renderToStaticMarkup(<LandingPhone onNavigate={noNavigate} />);
  const m = h.match(/<section class="mk-wl-hero"[\s\S]*?<\/section>/);
  expect(m, "the phone hero renders").toBeTruthy();
  return m![0];
};

describe("WLC-1 · the phone hero", () => {
  beforeEach(() => { mockCount = { cap: 50, claimed: 13 }; });

  it("heads the block 'We're looking for founding writers', then the three ticks in order", () => {
    const h = phoneHero();
    const head = h.match(/<h2[^>]*class="mk-wl-fhead"[^>]*>([\s\S]*?)<\/h2>/);
    expect(head, "an h2 after the h1, so no level is skipped").toBeTruthy();
    expect(text(head![1])).toBe(HEADING);
    const ticks = h.match(/<ul class="mk-wl-fticks">([\s\S]*?)<\/ul>/);
    expect(ticks, "the ticks list").toBeTruthy();
    expect([...ticks![1].matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => text(m[1]))).toEqual(TICKS);
    expect(ticks![1].match(/class="mk-dtick"/g) ?? [], "the existing disc tick, three times").toHaveLength(3);
  });

  it("has one full-width Join the waitlist button and no email field, places line text or privacy line", () => {
    const h = phoneHero();
    expect(h).toMatch(/<button type="button" class="mk-wl-fjoin">Join the waitlist<\/button>/);
    expect(h, "no form in the hero").not.toMatch(/<form\b|type="email"/);
    expect(h, "no privacy line").not.toContain("mk-betanote");
    expect(h).not.toContain("Privacy");
  });

  it("states the places as 'N of 50 places left', N bold, from the live count", () => {
    const h = phoneHero();
    const p = h.match(/<div class="mk-places mk-places--hero"[^>]*>([\s\S]*?)<\/div>/);
    expect(p, "the places bar").toBeTruthy();
    expect(p![0]).toContain('aria-label="37 of 50 places left"');
    expect(p![1]).toMatch(/<b>\d+<\/b> of 50 places left/);
  });

  it("holds nothing while the count is loading: no digits, hidden", () => {
    mockCount = null;
    const h = renderToStaticMarkup(<HeroPlaces variant="hero" />);
    expect(h).toContain("mk-places mk-places--hero mk-places--wait");
    expect(h).not.toMatch(/\d/);
  });

  it("turns 'See what it does' into a wordless chevron button with that accessible name, same target", () => {
    const h = phoneHero();
    const a = h.match(/<a href="#mk-be-h" class="mk-wl-see"([^>]*)>([\s\S]*?)<\/a>/);
    expect(a, "the anchor keeps its target").toBeTruthy();
    expect(a![1]).toContain('aria-label="See what it does"');
    expect(text(a![2]), "no words").toBe("");
    expect(a![2]).toContain("<svg");
  });

  it("the chevron is a 48px cream circle straddling the hero's foot; the next section clears it", () => {
    const c = css("waitlist.css");
    const see = c.match(/\n\.mk-wl-see \{([^}]*)\}/)?.[1] ?? "";
    expect(see).toMatch(/position:\s*absolute/);
    expect(see).toMatch(/width:\s*48px/);
    expect(see).toMatch(/height:\s*48px/);
    expect(see).toMatch(/border-radius:\s*50%/);
    expect(see).toMatch(/transform:\s*translate\(-50%,\s*50%\)/);
    expect(see).toMatch(/background:\s*var\(--mk-hero-ground\)/);
  });
});

/* ── WLC-2 · the desktop hero (ref section 2) ── */
import { Hero } from "./Hero";
import { NavPass } from "./WaitlistParts";

const deskHero = () => renderToStaticMarkup(<Hero onNavigate={noNavigate} />);

describe("WLC-2 · the desktop hero", () => {
  beforeEach(() => { mockCount = { cap: 50, claimed: 13 }; });

  it("after the sub-line: the navy pill and the places bar (hero trim, 3 Nov: no heading, no ticks — HT-2)", () => {
    const h = deskHero();
    const copy = h.slice(h.indexOf('class="mk-dh-copy"'));
    const iSub = copy.indexOf('class="mk-dh-sub"'), iBlock = copy.indexOf('class="mk-dh-founding"');
    expect(iSub, "the sub-line is there").toBeGreaterThan(0);
    expect(iBlock, "the block follows it").toBeGreaterThan(iSub);
    expect(h).not.toContain("mk-dh-fhead");
    expect(h).not.toContain("mk-dh-fticks");
    expect(h).toMatch(/<a href="#mk-band-email" class="mk-dh-fjoin">Become a founding writer<\/a>/);
    expect(h).toContain('aria-label="37 of 50 places left"');
  });

  it("has no email field and no privacy line; the headline, strap, sub-line and hawk stay", () => {
    const h = deskHero();
    expect(h).not.toMatch(/<form\b|type="email"/);
    expect(h).not.toContain("mk-betanote");
    for (const c of ["mk-dh-q", "mk-dh-strap", "mk-dh-sub", "mk-dh-art"]) expect(h).toContain(`class="${c}"`);
  });

  it("the desktop nav's pass button reads Join the waitlist", () => {
    const shell = readFileSync(join(process.cwd(), "src/marketing/MarketingShell.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
    expect(shell).toMatch(/<NavPass label=\{WAITLIST_CTA\} \/>/);
    expect(renderToStaticMarkup(<NavPass label="Join the waitlist" />)).toContain("<span>Join the waitlist</span>");
  });

  it("the desktop pill keeps the ref's values: 56px high, navy (its width is HT-3's)", () => {
    const c = css("waitlist.css");
    const rule = (sel: string) => c.match(new RegExp("\\n" + sel.replace(/\./g, "\\.") + " \\{([^}]*)\\}"))?.[1] ?? "";
    expect(rule(".mk-dh-fjoin")).toMatch(/height:\s*56px/);
    expect(rule(".mk-dh-fjoin")).toMatch(/background:\s*var\(--mk-navy\)/);
  });
});

/* WLC-2b (the desktop ticks' face) is retired with the ticks (hero trim, 3 Nov). */

/* ── WLC-3 · every "Join" goes to one form ── */
import * as Parts from "./WaitlistParts";
import { FOUNDING_CTA } from "./landingCopy";

const src = (f: string) => readFileSync(join(process.cwd(), "src/marketing", f), "utf8")
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

describe("WLC-3 · every Join goes to the founding section's form", () => {
  /** A stand-in for `document`: only what `joinDestination` asks of it. */
  const doc = (band: boolean, card: boolean) => ({
    querySelector: (s: string) => (s === ".mk-claimband" && band ? { band: true } : null),
    getElementById: (id: string) => (id === "mk-close-signup" && card ? { card: true } : null),
  });

  it("desktop: the founding band, then its email field", () => {
    const d = (Parts as Record<string, unknown>).joinDestination as ((x: unknown) => { target: unknown; field: string } | null) | undefined;
    expect(typeof d, "joinDestination is exported").toBe("function");
    expect(d!(doc(true, false))).toEqual({ target: { band: true }, field: "mk-band-email" });
  });

  it("phone: the Founding writer pass card, then its email field", () => {
    const d = (Parts as Record<string, unknown>).joinDestination as (x: unknown) => unknown;
    expect(d(doc(false, true))).toEqual({ target: { card: true }, field: "mk-close-email" });
    expect(d(doc(false, false)), "nothing to go to").toBeNull();
  });

  it("the hero buttons, the phone nav's Join, the desktop nav's pass and the join bar all call scrollToJoin", () => {
    expect(src("WaitlistParts.tsx")).toMatch(/className=\{p \+ "-fjoin"\} onClick=\{scrollToJoin\}/);
    expect(src("WaitlistParts.tsx")).toMatch(/className="mk-navpass" onClick=\{scrollToJoin\}/);
    expect(src("MarketingShell.tsx")).toMatch(/className="mk-wljoin" onClick=\{scrollToJoin\}/);
    expect(src("JoinBar.tsx")).toMatch(/onClick=\{scrollToJoin\}/);
    for (const f of ["WaitlistParts.tsx", "MarketingShell.tsx", "JoinBar.tsx", "Hero.tsx", "LandingPhone.tsx"])
      expect(src(f), `${f}: the old two-form helpers are gone`).not.toMatch(/\bscrollToForm\b|\bjoinTarget\b/);
  });

  it("both targets clear the sticky nav", () => {
    const m = css("marketing.css") + css("waitlist.css");
    expect(m).toMatch(/\n\.mk-claimband \{[^}]*scroll-margin-top:\s*var\(--mk-nav-h[^}]*\}/);
    expect(m).toMatch(/\n\.mk-tkt \{[^}]*scroll-margin-top:\s*calc\(var\(--mk-nav-h[^}]*\}/);
  });

  it("the founding form's button says Join the waitlist", () => {
    expect(FOUNDING_CTA).toBe("Join the waitlist");
  });
});
