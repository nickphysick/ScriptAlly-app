/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THESE CLAIMS MOVED HERE FROM `bookProfile.test.tsx` WHEN THE PAGER LEFT THE BOOK'S BAND, and
 * they have now followed it once more — into the record bar. They did not lapse and they were not
 * weakened: the component that owns the behaviour owns the assertions.
 *
 * ⚠️ AND EVERY CLAIM HERE IS ABOUT SOURCE OR RENDERED MARKUP, never about where the control lands on
 * screen. "The pager sits at the far end of the bar, opposite the departure" is geometry and is
 * measured (`msRecord.measure.ts`); `indexOf` cannot see a band.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ManuscriptPager } from "./ManuscriptPager";

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const page = () => strip(readFileSync(join(__dirname, "../AllManuscripts.tsx"), "utf8"));

const pager = (over: Partial<React.ComponentProps<typeof ManuscriptPager>> = {}) =>
  renderToStaticMarkup(
    <ManuscriptPager position="2 / 3" onPrev={() => {}} onNext={() => {}} {...over} />,
  );

describe("the shelf pager, in the record bar", () => {
  /** ⚠️ THE READOUT IS THE REASON IT MOVED — `1 / 3` is the shelf position the band never stated. */
  it("states the position", () => {
    expect(pager({ position: "1 / 3" })).toContain(">1 / 3<");
  });

  /**
   * ⚠️ RENDERED WHEN THEY CANNOT BE USED. A control that appears the day a second book exists
   * teaches nothing to the writer who has one; dimmed and disabled says "this pages your shelf".
   */
  it("renders both chevrons disabled when there is nowhere to page", () => {
    const html = pager({ onPrev: null, onNext: null });
    expect((html.match(/<button/g) ?? []).length).toBe(2);
    expect((html.match(/disabled/g) ?? []).length).toBe(2);
  });

  /**
   * ⚠️ NO WRAP-AROUND: the ends are ends, so a reader can tell from the control where they are.
   *
   * ⚠️ SPLIT ON THE TAG, NOT AN OFFSET FROM THE LABEL. The first form sliced 120 characters back
   * from `aria-label` and read an empty string — an assertion that would have been satisfied by
   * nothing at all. Each button is its own fragment; that is a boundary that cannot be off by a
   * count.
   */
  it("enables only the direction that has a neighbour", () => {
    const buttons = pager({ onPrev: null }).split("<button").slice(1);
    expect(buttons, "the two chevrons are not two buttons").toHaveLength(2);
    const prev = buttons.find((b) => b.includes("Previous manuscript"))!;
    const next = buttons.find((b) => b.includes("Next manuscript"))!;
    expect(prev, "the first book could page backwards").toContain("disabled");
    expect(next, "the direction that has a neighbour was disabled too").not.toContain("disabled");
  });

  it("names both directions for a screen reader", () => {
    expect(pager()).toContain('aria-label="Previous manuscript"');
    expect(pager()).toContain('aria-label="Next manuscript"');
  });
});

describe("the pager is mounted, and mounted in the one slot that is for it", () => {
  /**
   * ⚠️ IT HAD NEVER RENDERED. `PageHeader` drew `acts.length > 0 ? acts.map(…) : actionsSlot`, and
   * this page passed an unconditional `actions` entry — so the ternary took the actions branch on
   * every render and the pager was unreachable from the day it was added. A component with a spec,
   * a stylesheet and no caller passes every test it has.
   *
   * ⚠️ SO THE CLAIM IS REACHABILITY, NOT SPELLING: the page imports it, renders it, and does so
   * inside `record.within` — the slot whose contract is navigation WITHIN the set.
   */
  it("the page renders it, inside the record's `within` slot", () => {
    const src = page();
    expect(src, "the page stopped importing the pager").toContain("ManuscriptPager }");
    const rec = src.slice(src.indexOf("record={selected ?"), src.indexOf("masthead={"));
    expect(rec, "the record block did not survive the slice").toContain("backLabel");
    expect(rec, "the pager is not in the record's `within` slot").toContain("within: (");
    expect(rec).toContain("<ManuscriptPager");
  });

  /**
   * ⚠️ THE SHELF'S OWN ORDER, NEVER A SECOND SORT. A pager walking a different sequence from the
   * grid it came out of would put the writer somewhere they could not have predicted from what they
   * clicked. Asserted as the identifier the grid itself renders from, so a future second ordering
   * cannot slip in beside it.
   */
  it("pages through the same sequence the shelf renders", () => {
    const src = page();
    expect(src).toMatch(/const msAt = selected \? ordered\.findIndex/);
    expect(src).toContain("ordered[msAt - 1].id");
    expect(src).toContain("ordered[msAt + 1].id");
  });

  /**
   * ⚠️ PAGING RE-SCOPES AS WELL AS RE-VIEWS. `openDossier` writes the section-wide pointer the comps
   * and packages sub-pages read AND navigates; setting the view alone left the sidebar's switcher
   * naming a different book from the one on screen.
   */
  it("pages through `openDossier`, so the section pointer travels with the view", () => {
    const src = page();
    const rec = src.slice(src.indexOf("record={selected ?"), src.indexOf("masthead={"));
    expect(rec.match(/openDossier\(/g) ?? [], "a direction paged without re-scoping").toHaveLength(2);
  });
});

describe("the departure", () => {
  /**
   * ⚠️ IT IS THE GRID'S CONTROL NOW, SHARED WITH QUERY CENTRE. `ManuscriptBackLink` is deleted:
   * a second implementation of "leave this record", living in this folder and rendered by nothing,
   * is the shape this repo keeps paying for — a replacement that is ADDED leaves the original
   * reachable, and only one that is SWAPPED retires it.
   */
  it("is gone from this folder, not merely unused", () => {
    const src = readFileSync(join(__dirname, "ManuscriptPager.tsx"), "utf8");
    expect(strip(src), "a second back link survives here").not.toContain("ManuscriptBackLink:");
    const css = strip(readFileSync(join(__dirname, "bookProfile.css"), "utf8"));
    expect(css, "the back link's styling outlived the component").not.toContain(".msp-backlink");
    /* the pager's own rules must NOT have gone with it — a removal is verified against survivors */
    for (const kept of [".msp-pager", ".msp-pagerbtn", ".msp-pagerpos"]) {
      expect(css, `${kept} was swept away with the back link`).toContain(kept);
    }
  });

  /**
   * ⚠️ ONE HANDLER, ONE CONSTANT. The departure and the sidebar's `Manuscripts` item must reach the
   * same place: `MANUSCRIPTS_PATH`, which `shellV2Nav` also gives the nav item — so the two cannot
   * drift, and the call site is asserted rather than trusted.
   */
  it("the page navigates it to the same constant the sidebar reads", () => {
    const src = page();
    expect(src).toContain("onBack: () => navigate(MANUSCRIPTS_PATH)");
    expect(src, "the departure spelled a path of its own").not.toMatch(/onBack:[^,]*navigate\("\//);

    const nav = strip(readFileSync(join(__dirname, "../shell/shellV2Nav.ts"), "utf8"));
    const scope = strip(readFileSync(join(__dirname, "../shell/manuscriptScope.ts"), "utf8"));
    const constant = /MANUSCRIPTS_PATH\s*=\s*"([^"]+)"/.exec(scope)?.[1];
    expect(constant, "MANUSCRIPTS_PATH moved").toBe("/manuscripts");
    expect(nav, "the sidebar item and the departure now reach different places")
      .toContain(`path: "${constant}"`);
  });

  /** This component holds no route knowledge — that is what keeps the two ends on one constant. */
  it("the pager states no path itself", () => {
    const src = strip(readFileSync(join(__dirname, "ManuscriptPager.tsx"), "utf8"));
    expect(src).not.toContain("/manuscripts");
    expect(src).not.toContain("MANUSCRIPTS_PATH");
  });
});
