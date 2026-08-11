/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the Comparable titles pane.
 *
 * The two things that must not go wrong here are both about honesty rather than layout: the tab
 * must be FREE in full (only the Scout is gated), and the Scout's three states must not be mistaken
 * for one another — an offer, a tool, and an outage are three different facts.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ManuscriptCompsPane, compMetaLine, SCOUT_BLURB, SCOUT_DOWN, COPIED_MS,
} from "./ManuscriptCompsPane";
import { comparableTitlesTile, PITCH_NEEDS_ONE, PITCH_NEEDS_TWO } from "../../lib/manuscriptTiles";
import { ManuscriptDetailTiles } from "./ManuscriptDetailTiles";
import { outInTheWorld, onTheShelf, submissionMaterials } from "../../lib/manuscriptTiles";
import { pitchLineText } from "../../lib/comps";
import { CompTitle, ManuscriptStatus } from "../../types";

const comp = (title: string, over: Partial<CompTitle> = {}): CompTitle => ({ title, ...over });
const YEAR = 2026;

/** renderToStaticMarkup escapes apostrophes; assert against the escaped form, not the source. */
const esc = (t: string) => t.replace(/'/g, "&#x27;");

const pane = (over: Partial<React.ComponentProps<typeof ManuscriptCompsPane>> = {}) =>
  renderToStaticMarkup(
    React.createElement(ManuscriptCompsPane, {
      comps: [], isPro: false, scoutAvailable: false, currentYear: YEAR, ...over,
    }),
  );

/* ── the shelf is free ──────────────────────────────────────────────────────────────────────── */

describe("⚠️ the tab is FREE IN FULL — only the Scout is gated", () => {
  it("a free user gets the working shelf, not a gate", () => {
    const html = pane({ comps: [comp("Stormbreak"), comp("Nightjar")] });
    expect(html).toContain("Stormbreak");
    expect(html).toContain("Nightjar");
    expect(html).toContain("Add a comp");
    expect(html).toContain("Copy");
  });

  it("and the comps themselves are never behind a chip", () => {
    const html = pane({ comps: [comp("Stormbreak")] });
    // The only Pro chip on the pane belongs to the Scout strip.
    expect(html.match(/msv-prochip/g)).toHaveLength(1);
    expect(html).toContain("msv-offer");
  });
});

/* ── the pitch box ──────────────────────────────────────────────────────────────────────────── */

describe("the pitch box", () => {
  it("composes the line from the first two comps and offers Copy", () => {
    const html = pane({ comps: [comp("Stormbreak"), comp("Nightjar"), comp("Third")] });
    expect(html).toContain("<i>Stormbreak</i>");
    expect(html).toContain("<i>Nightjar</i>");
    expect(html).toContain("Copy");
  });

  /** No line means nothing to copy — the control is ABSENT, not present and inert. */
  it("hides Copy entirely while the line is incomplete", () => {
    expect(pane({ comps: [comp("Only one")] })).not.toContain("msv-pitchcopy");
    expect(pane({ comps: [] })).not.toContain("msv-pitchcopy");
    expect(pane({ comps: [comp("A"), comp("B")] })).toContain("msv-pitchcopy");
  });

  it("what Copy would put on the clipboard is pitchLineText, not a second composition", () => {
    expect(pitchLineText([comp("A"), comp("B")])).toBe("A meets B");
  });

  it("and it flips back after a beat rather than staying flipped", () => {
    expect(COPIED_MS).toBeGreaterThan(500);
    expect(COPIED_MS).toBeLessThan(4000);
  });
});

/**
 * ⚠️ ONE WORDING, TWO SURFACES. `pitchLine` had no consumers before this card, so what is written
 * here becomes the standard the shelf inherits. The Details tile and the pitch box must state the
 * threshold in the SAME words — two near-identical sentences would drift the first time one is
 * edited, and the page would tell a writer two different things about one rule.
 */
describe("⚠️ the threshold copy is shared between the tile and the pitch box", () => {
  it("the pane states the shared strings", () => {
    expect(pane({ comps: [] })).toContain(esc(PITCH_NEEDS_TWO));
    expect(pane({ comps: [comp("One")] })).toContain(esc(PITCH_NEEDS_ONE));
  });

  it("and the Details tile states the very same ones", () => {
    expect(comparableTitlesTile([]).detail).toBe(PITCH_NEEDS_TWO);
    expect(comparableTitlesTile([comp("One")]).detail).toBe(PITCH_NEEDS_ONE);
  });

  it("rendered on both surfaces, character for character", () => {
    const tile = renderToStaticMarkup(
      React.createElement(ManuscriptDetailTiles, {
        world: outInTheWorld([]),
        comps: comparableTitlesTile([]),
        shelf: onTheShelf({ status: ManuscriptStatus.DRAFTING, statusChangedDate: "" }, Date.parse("2026-08-08")),
        materials: submissionMaterials([], []),
      }),
    );
    expect(tile).toContain(esc(PITCH_NEEDS_TWO));
    expect(pane({ comps: [] })).toContain(esc(PITCH_NEEDS_TWO));
  });

  /** They are one sentence with a different number — parallel, and stating rather than urging. */
  it("both are the same shape, and neither coaches", () => {
    expect(PITCH_NEEDS_TWO).toMatch(/^The ‘X meets Y’ line needs /);
    expect(PITCH_NEEDS_ONE).toMatch(/^The ‘X meets Y’ line needs /);
    for (const s of [PITCH_NEEDS_ONE, PITCH_NEEDS_TWO]) {
      expect(s).not.toMatch(/\byou\b|\byour\b|add|write|try|just|simply|makes/i);
    }
  });
});

/* ── the shelf grid ─────────────────────────────────────────────────────────────────────────── */

describe("the comp cards", () => {
  it("omit the meta line gracefully rather than printing separators around nothing", () => {
    expect(compMetaLine(comp("T", { author: "L. Okafor", year: 2024 }))).toBe("L. Okafor · 2024");
    expect(compMetaLine(comp("T", { author: "L. Okafor" }))).toBe("L. Okafor");
    expect(compMetaLine(comp("T", { year: 2024 }))).toBe("2024");
    expect(compMetaLine(comp("T"))).toBeNull();
  });

  it("a comp with neither author nor year renders no meta element at all", () => {
    expect(pane({ comps: [comp("Bare")] })).not.toContain("msv-compa");
  });

  /** The chip is `isOlderComp` from lib/comps — the same rule the shelf and Suggestions use. */
  it("marks an older comp, and only an older one", () => {
    expect(pane({ comps: [comp("Old", { year: 2015 })] })).toContain("Older comp");
    expect(pane({ comps: [comp("New", { year: 2025 })] })).not.toContain("Older comp");
    expect(pane({ comps: [comp("Undated")] })).not.toContain("Older comp");
  });

  it("every comp carries a removal control that names what it removes", () => {
    const html = pane({ comps: [comp("Stormbreak"), comp("Nightjar")] });
    expect(html).toContain('aria-label="Remove Stormbreak"');
    expect(html).toContain('aria-label="Remove Nightjar"');
  });

  it("the spine rotates through three accents by position", () => {
    const html = pane({ comps: [comp("a"), comp("b"), comp("c"), comp("d")] });
    expect(html.match(/msv-compsp s1/g)).toHaveLength(2); // 1st and 4th
    expect(html.match(/msv-compsp s2/g)).toHaveLength(1);
    expect(html.match(/msv-compsp s3/g)).toHaveLength(1);
  });

  it("the add tile is always present, even on a full-looking shelf", () => {
    expect(pane({ comps: [] })).toContain("Add a comp");
    expect(pane({ comps: [comp("a"), comp("b"), comp("c")] })).toContain("Add a comp");
  });
});

/* ── The Scout ──────────────────────────────────────────────────────────────────────────────── */

describe("⚠️ The Scout — three states, and the outage must not wear the offer's clothes", () => {
  const free = () => pane({ isPro: false, scoutAvailable: true });
  const live = () => pane({ isPro: true, scoutAvailable: true });
  const down = () => pane({ isPro: true, scoutAvailable: false });

  it("FREE is an offer: Pro chip, what it does, and two ways forward", () => {
    const html = free();
    expect(html).toContain("msv-prochip");
    expect(html).toContain(esc(SCOUT_BLURB));
    expect(html).toContain("See how it works");
    expect(html).toContain("Upgrade");
    expect(html).not.toContain("Find comps");
  });

  it("PRO + live is a tool: no chip, no upsell, one action", () => {
    const html = live();
    expect(html).not.toContain("msv-prochip");
    expect(html).not.toContain("Upgrade");
    expect(html).toContain("Find comps");
    expect(html).not.toContain("disabled");
  });

  /**
   * ⚠️ THE FAULT THIS GUARDS: a paying user shown a chip and an Upgrade button because a function
   * is undeployed is being sold what they already bought. An outage is a temporary state of a
   * feature they own; an offer is a permanent state of one they do not.
   */
  it("PRO + unavailable is an OUTAGE, and looks like nothing else", () => {
    const html = down();
    expect(html).toContain("Unavailable");
    expect(html).toContain(esc(SCOUT_DOWN));
    expect(html).toContain("disabled");
    expect(html).toContain("msv-offer-down");
    // never sold to
    expect(html).not.toContain("msv-prochip");
    expect(html).not.toContain("Upgrade");
    expect(html).not.toContain("See how it works");
  });

  it("the three states are genuinely distinct markup, not one with a class swapped", () => {
    expect(new Set([free(), live(), down()]).size).toBe(3);
  });

  it("a free user never sees the outage wording — availability is not their fact", () => {
    expect(pane({ isPro: false, scoutAvailable: false })).not.toContain(esc(SCOUT_DOWN));
    expect(pane({ isPro: false, scoutAvailable: false })).toContain("Upgrade");
  });

  it("the strip holds the same slot in every state, so upgrading changes words not shape", () => {
    for (const html of [free(), live(), down()]) {
      expect(html).toContain("msv-offer");
      expect(html).toContain("The Scout");
      expect(html.match(/msv-offeracts/g)).toHaveLength(1);
    }
  });

  /**
   * ⚠️ NO FABRICATED LAST-RUN LINE. The ref reads "Last run 2 August — 6 suggestions, 3 added."
   * Nothing anywhere stores that. Absent field → absent clause.
   */
  it("states no last-run history unless a real field supplies one", () => {
    expect(live()).not.toMatch(/last run/i);
    expect(pane({ isPro: true, scoutAvailable: true, lastRun: "Last run 2 August." })).toContain("Last run 2 August.");
  });
});
