/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Landing hero trim (3 Nov). Both heroes lose the founding block's heading and ticks; what stays under the
 * desktop's sub-line (and the phone's lockup) is one button, "Become a founding writer", over the places bar.
 *   HT-1 · the desktop sub-line reads "Track your entire campaign with QueryHawk." (QueryHawk bold).
 *   HT-2 · the desktop block: no heading, no ticks; an in-page link to the band's field, then the places bar.
 *   HT-3 · the desktop button and places bar share ONE width, stated once on the block.
 *   HT-4 · the phone block: no heading, no ticks; an in-page link to the pass card, then the places bar.
 *   HT-5 · one label for both heroes (`HERO_CTA`); the founding forms' own buttons stay "Join the waitlist";
 *          the heading and ticks copy is gone from the copy module.
 * The founding store is mocked so the places bar renders with a real count.
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

import * as copy from "./landingCopy";
import { Hero } from "./Hero";
import { LandingPhone } from "./LandingPhone";

const unesc = (s: string) => s.replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"');
const text = (h: string) => unesc(h.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
const css = (f: string) => readFileSync(join(process.cwd(), "src/marketing", f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
/** Every declaration block for a selector, read at a line start (a bare match also hits descendant selectors). */
const rules = (c: string, sel: string) =>
  [...c.matchAll(new RegExp(`(?:^|\\n)\\s*${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`, "g"))].map((m) => m[1]);

const OLD_HEADING = "We're looking for founding writers";
const OLD_TICKS = ["Everything QueryHawk has to offer", "Free for your whole campaign", "A direct line to the founder"];

const deskBlock = () => {
  const h = renderToStaticMarkup(<Hero onNavigate={() => {}} />);
  const i = h.indexOf('class="mk-dh-founding"');
  expect(i, "the desktop block renders").toBeGreaterThan(0);
  /* The block runs to the copy column's close: the art column follows it. */
  const j = h.indexOf('class="mk-dh-art"', i);
  expect(j, "the art column follows the block").toBeGreaterThan(i);
  return { page: h, block: h.slice(h.lastIndexOf("<div", i), j) };
};
const phoneBlock = () => {
  const h = renderToStaticMarkup(<LandingPhone onNavigate={() => {}} />);
  const hero = h.match(/<section class="mk-wl-hero"[\s\S]*?<\/section>/);
  expect(hero, "the phone hero renders").toBeTruthy();
  const s = hero![0], i = s.indexOf('class="mk-wl-founding"'), j = s.indexOf('class="mk-wl-see"', i);
  expect(i, "the phone block renders").toBeGreaterThan(0);
  expect(j, "the chevron follows the block").toBeGreaterThan(i);
  return { hero: s, block: s.slice(s.lastIndexOf("<div", i), j) };
};

describe("HT-1 · the desktop sub-line", () => {
  it("reads 'Track your entire campaign with QueryHawk.', QueryHawk bold, the full stop after it", () => {
    expect(copy.WAIT_HERO_SUB).toBe("Track your entire campaign with QueryHawk.");
    const sub = deskBlock().page.match(/<p class="mk-dh-sub">([\s\S]*?)<\/p>/);
    expect(sub, "the sub-line renders").toBeTruthy();
    expect(sub![1]).toBe("Track your entire campaign with <b>QueryHawk</b>.");
  });
});

describe("HT-2 · the desktop block", () => {
  beforeEach(() => { mockCount = { cap: 50, claimed: 2 }; });

  it("holds no heading and no ticks", () => {
    const { block } = deskBlock();
    expect(block).not.toMatch(/<h[1-6]\b/);
    expect(block).not.toMatch(/<ul\b|mk-dtick/);
    expect(text(block)).not.toContain(OLD_HEADING);
    for (const t of OLD_TICKS) expect(text(block)).not.toContain(t);
  });

  it("is the link 'Become a founding writer' to the band's field, then the places bar, and keeps its id", () => {
    const { block } = deskBlock();
    expect(block).toMatch(/^<div class="mk-dh-founding" id="mk-hero-signup">/);
    const a = block.match(/<a href="#mk-band-email" class="mk-dh-fjoin">([\s\S]*?)<\/a>/);
    expect(a, "an in-page link to the founding band's email field").toBeTruthy();
    expect(text(a![1])).toBe("Become a founding writer");
    expect(block).not.toContain("<button");
    const iA = block.indexOf("mk-dh-fjoin"), iP = block.indexOf("mk-places--hero");
    expect(iP, "the places bar comes after the button").toBeGreaterThan(iA);
    expect(block).toContain('aria-label="48 of 50 places left"');
  });
});

describe("HT-3 · one width for the desktop button and its places bar", () => {
  const c = css("waitlist.css");
  it("the block states the width once; the button and the bar both fill it", () => {
    const block = rules(c, ".mk-dh-founding").join(";");
    expect(block, "the block is a column of its own width").toMatch(/display:\s*grid/);
    expect(block).toMatch(/width:\s*min\(var\(--mk-dh-fw\),\s*100%\)/);
    expect(block).toMatch(/--mk-dh-fw:\s*\d+px/);
    const btn = rules(c, ".mk-dh-fjoin").join(";");
    expect(btn).toMatch(/display:\s*flex/);
    expect(btn, "the label centred").toMatch(/justify-content:\s*center/);
    expect(btn, "no width of its own").not.toMatch(/(^|;|\s)(max-|min-)?width:/);
    const bar = rules(c, ".mk-dh .mk-places--hero").join(";");
    expect(bar, "no width of its own").not.toMatch(/(^|;|\s)(max-|min-)?width:/);
  });
  it("keeps the button's height, colour and radius, and the ~36px gap under the sub-line", () => {
    const btn = rules(c, ".mk-dh-fjoin").join(";");
    expect(btn).toMatch(/height:\s*56px/);
    expect(btn).toMatch(/border-radius:\s*999px/);
    expect(btn).toMatch(/background:\s*var\(--mk-navy\)/);
    expect(btn).toMatch(/color:\s*#fff/);
    const sub = rules(c, ".mk-dh-sub").join(";");
    const block = rules(c, ".mk-dh-founding").join(";");
    const subBottom = Number(sub.match(/margin:\s*\d+px\s+0\s+(\d+)px/)?.[1]);
    const blockTop = Number(block.match(/margin:\s*(\d+)px/)?.[1]);
    /* Adjacent vertical margins collapse: the gap is the larger, never the sum. */
    expect(Math.max(subBottom, blockTop), "the collapsed margin between them").toBe(36);
  });
});

describe("HT-4 · the phone block", () => {
  beforeEach(() => { mockCount = { cap: 50, claimed: 2 }; });

  it("holds no heading and no ticks", () => {
    const { block } = phoneBlock();
    expect(block).not.toMatch(/<h[1-6]\b/);
    expect(block).not.toMatch(/<ul\b|mk-dtick/);
    expect(text(block)).not.toContain(OLD_HEADING);
    for (const t of OLD_TICKS) expect(text(block)).not.toContain(t);
  });

  it("is the link 'Become a founding writer' to the pass card, then the places bar, and keeps its id", () => {
    const { block, hero } = phoneBlock();
    expect(block).toMatch(/^<div class="mk-wl-founding" id="mk-hero-signup">/);
    const a = block.match(/<a href="#mk-close-signup" class="mk-wl-fjoin">([\s\S]*?)<\/a>/);
    expect(a, "an in-page link to the Founding writer pass card").toBeTruthy();
    expect(text(a![1])).toBe("Become a founding writer");
    expect(block).not.toContain("<button");
    expect(block.indexOf("mk-places--hero")).toBeGreaterThan(block.indexOf("mk-wl-fjoin"));
    expect(hero, "the chevron stays on the hero's foot").toMatch(/<a href="#mk-be-h" class="mk-wl-see"/);
    expect(hero.match(/<h[1-6]\b/g), "the hero's only heading is its h1").toEqual(["<h1"]);
  });
});

describe("HT-5 · one label, and no dead copy", () => {
  const src = (f: string) => readFileSync(join(process.cwd(), "src/marketing", f), "utf8");
  it("both heroes read HERO_CTA, and nothing else names the label", () => {
    expect(copy.HERO_CTA).toBe("Become a founding writer");
    const parts = src("WaitlistParts.tsx");
    const hf = parts.slice(parts.indexOf("export const HeroFounding"), parts.indexOf("/* ── Scrolling to a sign-up"));
    expect(hf, "HeroFounding found").toContain("layout");
    expect(hf).toContain("{HERO_CTA}");
    expect(hf).not.toContain("WAITLIST_CTA");
    expect(src("landingCopy.ts").match(/"Become a founding writer"/g), "one string, one owner").toHaveLength(1);
  });
  it("the founding forms' own buttons still read Join the waitlist", () => {
    expect(copy.FOUNDING_CTA).toBe("Join the waitlist");
  });
  it("the heading and the ticks are gone from the copy module", () => {
    expect("HERO_FOUNDING_HEADING" in copy).toBe(false);
    expect("HERO_FOUNDING_TICKS" in copy).toBe(false);
    expect(src("landingCopy.ts")).not.toContain(OLD_HEADING);
  });
});
