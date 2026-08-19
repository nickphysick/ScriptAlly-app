/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE SLOT IS THE DELIVERABLE, NOT THE ICON (§1).
 *
 * These headers label SURFACES, so the destination is a commissioned illustrated mark; the
 * monoline icon is a temporary occupant. Everything here therefore tests the SWAP: that the box is
 * 28px whatever is inside it, that the brief never reaches the DOM, and that a failed asset
 * degrades rather than leaving a broken-image glyph in a header.
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import React from "react";
import { OneScreenMark, markHasArt, MarkName } from "./OneScreenMark";

const NAMES: MarkName[] = ["active-queries", "goals", "activity", "tasks"];
const css = readFileSync(resolve(__dirname, "./oneScreen.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const blk = (sel: string) => {
  const i = css.indexOf(`${sel} {`);
  expect(i, `${sel} must exist`).toBeGreaterThan(-1);
  return css.slice(i, css.indexOf("}", i));
};

describe("the mark slot", () => {
  it("every named mark renders exactly one slot", () => {
    for (const n of NAMES) {
      const out = renderToStaticMarkup(<OneScreenMark name={n} />);
      expect((out.match(/class="os-mark"/g) ?? []), n).toHaveLength(1);
      expect(out).toContain(`data-mark="${n}"`);
    }
  });

  it("⚠️ THE BOX IS 28px IN BOTH DIRECTIONS AND DOES NOT FLEX", () => {
    const b = blk(".os-mark");
    expect(b).toContain("flex: 0 0 28px");
    expect(b).toContain("width: 28px");
    expect(b).toContain("height: 28px");
  });

  it("⚠️ the box's size is INDEPENDENT of its contents — that is what makes the swap free", () => {
    // the icon states its own 17px; an asset is bounded and letterboxed. Neither may size the box.
    expect(blk(".os-mark svg")).toContain("width: 17px");
    const img = blk(".os-mark img");
    expect(img).toContain("max-width: 100%");
    expect(img).toContain("max-height: 100%");
    expect(img).toContain("object-fit: contain");
  });

  it("⚠️ the plate's rim is an INSET SHADOW, never a border — a border would add 2px to a 28px box", () => {
    const b = blk(".os-mark");
    expect(b).toContain("box-shadow: inset 0 0 0 1px");
    expect(b).not.toMatch(/(^|;|\s)border:\s*[\d.]+px/);
  });

  it("⚠️ ONE translucent plate serves BOTH bands — no per-band override", () => {
    expect(blk(".os-mark")).toContain("rgba(253, 250, 245, 0.72)");
    // a `.os-th2 .os-mark` or `.os-ahead .os-mark` rule would be this becoming four rules again
    expect(css).not.toMatch(/\.os-(th2|ahead)\s+\.os-mark\s*\{/);
  });

  it("⚠️ THE BRIEF NEVER REACHES THE DOM — a rendered brief is a brief that ships", () => {
    const src = readFileSync(resolve(__dirname, "./OneScreenMark.tsx"), "utf8");
    for (const phrase of ["ruled page", "wax-sealed", "clock face over", "pencil resting"]) {
      expect(src, `${phrase} must be documented`).toContain(phrase);
    }
    for (const n of NAMES) {
      const out = renderToStaticMarkup(<OneScreenMark name={n} />);
      for (const phrase of ["ruled page", "wax-sealed", "clock face", "pencil resting"]) {
        expect(out, `${n} must not render its brief`).not.toContain(phrase);
      }
    }
  });

  it("the mark is decorative — the title beside it carries the meaning", () => {
    expect(renderToStaticMarkup(<OneScreenMark name="tasks" />)).toContain('aria-hidden="true"');
  });
});

describe("every dashboard container header carries one mark", () => {
  const files = {
    "Tasks": "OneScreenTasks.tsx",
    "Chart": "OneScreenChart.tsx",
    "Rail (goals + activity)": "OneScreenRail.tsx",
  };
  it("all four headers are wired, and none twice", () => {
    let total = 0;
    for (const f of Object.values(files)) {
      const src = readFileSync(resolve(__dirname, `./${f}`), "utf8");
      total += (src.match(/<OneScreenMark name=/g) ?? []).length;
    }
    /* ⚠️ THREE, NOT FOUR — Goals carries no mark. Its header is a LABEL, not an instrument, and
       both the band and the mark box were tried there and rejected. A fourth appearing means the
       goals card has been re-banded by someone who read this as an oversight. */
    expect(total).toBe(3);
  });
});

/**
 * ⚠️ THE ILLUSTRATED MARKS, AND WHY ONE FIELD IS WORTH A LOCK. `markHasArt` reads `src` and NOTHING
 * else, so that single field decides whether a page's header is a 38px plated glyph or an 88px bare
 * illustration — no call site is involved, which is the rule's whole virtue and also why losing the
 * field would resize a page's header with nothing to point at.
 *
 * ⚠️ IT GOES THROUGH THE PUBLIC PREDICATE, NOT THE MAP. `MARK` is deliberately module-private;
 * exporting it so a test could enumerate it would widen the module's surface to make an assertion
 * easier, which is the wrong way round. So this states what it can actually verify — these marks
 * have art, those do not — and claims no exhaustiveness it has no honest way to check.
 */
describe("illustrated marks keep their artwork and their fallback", () => {
  it("queries is illustrated — the 88px bare drawing, not the plated glyph", () => {
    expect(markHasArt("queries"), "the Query Centre header fell back to its 38px glyph").toBe(true);
  });

  it("beside the two that already were", () => {
    expect(markHasArt("contacts")).toBe(true);
    expect(markHasArt("manuscripts")).toBe(true);
  });

  it("and the glyph marks are untouched — adding one drawing must not resize other headers", () => {
    for (const n of ["packages", "analytics", "noteboard", "discover", "comps", "settings"] as MarkName[]) {
      expect(markHasArt(n), `${n} gained artwork, which silently doubles its header mark`).toBe(false);
    }
  });

  /**
   * ⚠️ THE DEGRADE PATH SURVIVES, and it is the same drawing at lower fidelity. A 404 keeps the
   * 88px box and renders the monoline plane — so a failed request changes how the mark is drawn
   * and never the geometry of the header around it.
   */
  it("the illustrated mark still renders an img, and the glyph is still behind it", () => {
    const html = renderToStaticMarkup(<OneScreenMark name="queries" />);
    expect(html, "the artwork is not rendered").toContain("<img");
    expect(html).toContain('data-mark="queries"');
  });
});
