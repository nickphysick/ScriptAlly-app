/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the Manuscripts plate marks.
 *
 * ⚠️ THE FAILURES THESE GUARD AGAINST ARE ALL SILENT ONES. A mark that inherits colour renders
 * fine in Cappuccino and vanishes in Editorial; a mark that gains `mix-blend-mode` renders fine
 * on white and dirties its own washes; a mark that needs a second prop crashes only the call site
 * that forgot it. None of that is visible in a geometry assertion, so these assert the mechanism.
 *
 * This repo has NO jsdom (`vitest.config.ts` is `environment: 'node'`), so specs render through
 * `renderToStaticMarkup` and assert against the HTML string. Per the house rule these use
 * whole-string `toContain`/`toMatch` and never slice — a slice that misses its anchor passes
 * against an empty string and tests nothing.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  MANUSCRIPT_MARKS,
  MARK_SIZE,
  PaperPlaneMark,
  BookSpinesMark,
  CalendarClockMark,
  StackedPagesMark,
  MagnifierMark,
  type ManuscriptMarkKey,
} from "./manuscriptMarks";

const KEYS = Object.keys(MANUSCRIPT_MARKS) as ManuscriptMarkKey[];
const render = (Mark: React.FC<{ size?: number }>, size?: number) =>
  renderToStaticMarkup(React.createElement(Mark, size === undefined ? {} : { size }));

describe("the marks — one prop, and it is optional", () => {
  it("the registry is the marks the card needs, in a stable order", () => {
    expect(KEYS).toEqual(["plane", "spines", "calendar", "pages", "magnifier"]);
  });

  it.each(KEYS)("%s renders at the requested size on both axes", (key) => {
    const html = render(MANUSCRIPT_MARKS[key], 104);
    expect(html).toContain('width="104"');
    expect(html).toContain('height="104"');
  });

  it.each(KEYS)("%s renders with NO props at all — `size` is the only one and it defaults", (key) => {
    const html = render(MANUSCRIPT_MARKS[key]);
    expect(html).toContain(`width="${MARK_SIZE}"`);
    expect(html).toContain(`height="${MARK_SIZE}"`);
  });

  /**
   * ⚠️ A square viewBox is what lets ONE number govern both axes. If a mark is ever redrawn on a
   * non-square canvas, `size` silently stops meaning "height" and the four fall off a common scale.
   */
  it.each(KEYS)("%s is drawn on the shared square 80×80 canvas", (key) => {
    expect(render(MANUSCRIPT_MARKS[key])).toContain('viewBox="0 0 80 80"');
  });
});

describe("⚠️ trap 1 — a mark that inherits colour disappears in Editorial", () => {
  /**
   * The marks are illustrations, not themed surfaces (ruling 3). Editorial is monochrome and has
   * no sage at all, so a mark drawn in `currentColor` or a theme token would not be recoloured
   * there — it would be wrong there. Baked fills are the decision.
   */
  it.each(KEYS)("%s inherits nothing — no currentColor, no var(), no theme token", (key) => {
    const html = render(MANUSCRIPT_MARKS[key]);
    expect(html).not.toContain("currentColor");
    expect(html).not.toContain("var(");
    expect(html).not.toContain("--msv-");
  });

  /**
   * ⚠️ THIS LIST IS A GATE, NOT A RECORD. It caught `#e9ede6` when the magnifier landed, which is
   * the point: a new colour must be justified against the ref before it joins the vocabulary,
   * rather than arriving because one mark's author liked it. `#e9ede6` earned its place — it is
   * the ref's own `.node.in` fill and the app's canonical sage fill elsewhere. Anything that fails
   * here should be checked against the ref before the list is widened.
   */
  it("every stroke and fill is a baked hex from the plate palette", () => {
    const PALETTE = ["#3a1c14", "#5a6e58", "#7c3a2a", "#fff", "#fdfaf5", "#f5e2da", "#e8c8bc", "#cdd8ca", "#e7ede3", "#e9ede6"];
    for (const key of KEYS) {
      const html = render(MANUSCRIPT_MARKS[key]);
      for (const hex of html.match(/#[0-9a-f]{3,6}/gi) ?? []) {
        expect(PALETTE, `${key} uses an off-palette colour ${hex}`).toContain(hex.toLowerCase());
      }
    }
  });

  it("⚠️ ink is #3a1c14 at 1.3–1.8 — the ref's weight range, not a hairline", () => {
    for (const key of KEYS) {
      const html = render(MANUSCRIPT_MARKS[key]);
      expect(html, `${key} must carry the ink stroke`).toContain('stroke="#3a1c14"');
      for (const w of html.match(/stroke-width="([\d.]+)"/g) ?? []) {
        const n = Number(w.replace(/\D+([\d.]+)\D*/, "$1"));
        expect(n, `${key} stroke-width ${n} is outside the ref's range`).toBeGreaterThanOrEqual(1.3);
        expect(n, `${key} stroke-width ${n} is outside the ref's range`).toBeLessThanOrEqual(1.8);
      }
    }
  });
});

describe("⚠️ trap 2 — the dashboard's blend rules must NOT follow the marks across", () => {
  /**
   * The dashboard once held painted PNGs on a white field that needed `mix-blend-mode: multiply`;
   * they were retired at `a7b5d54` and none survives in `src/`. These are transparent SVG, where
   * multiply has no white to remove and darkens the washes instead. The lock stays because the
   * rule is about THESE marks, not about whether the other ones still exist.
   */
  it.each(KEYS)("%s carries no blend mode of its own", (key) => {
    expect(render(MANUSCRIPT_MARKS[key])).not.toContain("mix-blend-mode");
  });

  it("and no mark transforms — the trap that reinstates a white field on the painted ones", () => {
    for (const key of KEYS) {
      expect(render(MANUSCRIPT_MARKS[key])).not.toMatch(/transform=|transform:/);
    }
  });
});

describe("⚠️ trap 3 — the plate's notebook is the dashboard PNG, never a traced copy", () => {
  const src = readFileSync(resolve(__dirname, "./manuscriptMarks.tsx"), "utf8");

  /**
   * ⚠️ THE COUNT IS INCIDENTAL; THE ABSENCE IS THE INVARIANT. Phase 4 legitimately added a fifth
   * mark (the magnifier), so a bare `toHaveLength(4)` would have failed for the right reason and
   * been "fixed" by bumping a number. What must never come back is the NOTEBOOK — that one is the
   * dashboard's PNG, and a traced copy here would fork one illustration into two.
   */
  it("no notebook is declared here, whatever else the registry grows", () => {
    expect(src).not.toMatch(/NotebookMark|notebook:/);
    expect(KEYS).not.toContain("notebook");
  });

  it("the PNG it defers to is still on disk under the name the plate will import", () => {
    expect(() => readFileSync(resolve(__dirname, "../../assets/shell/manuscript-icon.png"))).not.toThrow();
  });
});

describe("the marks are decorative — the tile's own text is the label", () => {
  it.each(KEYS)("%s is hidden from assistive tech and unfocusable", (key) => {
    const html = render(MANUSCRIPT_MARKS[key]);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('focusable="false"');
  });
});

describe("named exports match the registry — one component per mark, not two", () => {
  it("the registry holds the same functions the module exports by name", () => {
    expect(MANUSCRIPT_MARKS.plane).toBe(PaperPlaneMark);
    expect(MANUSCRIPT_MARKS.spines).toBe(BookSpinesMark);
    expect(MANUSCRIPT_MARKS.calendar).toBe(CalendarClockMark);
    expect(MANUSCRIPT_MARKS.pages).toBe(StackedPagesMark);
    expect(MANUSCRIPT_MARKS.magnifier).toBe(MagnifierMark);
  });
});
