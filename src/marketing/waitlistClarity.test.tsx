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
