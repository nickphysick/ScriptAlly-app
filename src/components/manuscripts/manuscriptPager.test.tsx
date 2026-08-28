/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THESE CLAIMS MOVED HERE FROM `bookProfile.test.tsx` WHEN THE PAGER LEFT THE BOOK'S BAND FOR
 * THE MASTHEAD. They did not lapse and they were not weakened — the component that owns the
 * behaviour owns the assertions.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ManuscriptPager, ManuscriptBackLink } from "./ManuscriptPager";

const pager = (over: Partial<React.ComponentProps<typeof ManuscriptPager>> = {}) =>
  renderToStaticMarkup(
    <ManuscriptPager position="2 / 3" onPrev={() => {}} onNext={() => {}} {...over} />,
  );

describe("the shelf pager, in the masthead", () => {
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

describe("the departure", () => {
  it("is a button, and says where it goes", () => {
    const html = renderToStaticMarkup(<ManuscriptBackLink onLeave={() => {}} />);
    expect(html).toContain("<button");
    expect(html).toContain("All manuscripts");
  });

  /**
   * ⚠️ ONE HANDLER, ONE CONSTANT. The departure and the sidebar's `Manuscripts` item must reach the
   * same place: `MANUSCRIPTS_PATH`, which `shellV2Nav` also gives the nav item. This component
   * states no path of its own — it takes a callback — so the two cannot drift, and the call site is
   * asserted below rather than trusted.
   */
  it("the page navigates it to the same constant the sidebar reads", () => {
    const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    const page = strip(readFileSync(join(__dirname, "../AllManuscripts.tsx"), "utf8"));
    expect(page).toContain("navigate(MANUSCRIPTS_PATH)");
    expect(page, "the departure spelled a path of its own").not.toMatch(/onLeave=\{\(\) => navigate\("\//);

    const nav = strip(readFileSync(join(__dirname, "../shell/shellV2Nav.ts"), "utf8"));
    const scope = strip(readFileSync(join(__dirname, "../shell/manuscriptScope.ts"), "utf8"));
    const constant = /MANUSCRIPTS_PATH\s*=\s*"([^"]+)"/.exec(scope)?.[1];
    expect(constant, "MANUSCRIPTS_PATH moved").toBe("/manuscripts");
    expect(nav, "the sidebar item and the departure now reach different places")
      .toContain(`path: "${constant}"`);
  });

  /** This component holds no route knowledge — that is what keeps the two ends on one constant. */
  it("states no path itself", () => {
    const src = readFileSync(join(__dirname, "ManuscriptPager.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(src).not.toContain("/manuscripts");
    expect(src).not.toContain("MANUSCRIPTS_PATH");
  });
});
