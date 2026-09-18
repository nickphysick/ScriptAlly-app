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

/* "active-queries" is retired with the chart that wore it — the stage-3 chart carries the hawk (17 Sep) */
const NAMES: MarkName[] = ["goals", "activity", "tasks"];
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

  it("⚠️ THE BOX IS 26px IN BOTH DIRECTIONS AND DOES NOT FLEX", () => {
    const b = blk(".os-mark");
    expect(b).toContain("flex: 0 0 26px");
    expect(b).toContain("width: 26px");
    expect(b).toContain("height: 26px");
  });

  it("⚠️ the box's size is INDEPENDENT of its contents — that is what makes the swap free", () => {
    // the icon states its own 20px; an asset is bounded and letterboxed. Neither may size the box.
    expect(blk(".os-mark svg")).toContain("width: 20px");
    const img = blk(".os-mark img");
    expect(img).toContain("max-width: 100%");
    expect(img).toContain("max-height: 100%");
    expect(img).toContain("object-fit: contain");
  });

  /* ⚠️ RETARGETED (dashboard redesign, Phase 2). THE PLATE IS GONE; THE SLOT IS NOT — and the
     distinction is the whole component. The parchment fill and the burgundy inset ring were the
     BAND's furniture, and the bands are gone: on a bare header a plated tile reads as a button.
     What survives, and is what this file exists to guard, is the swap-ready box — 28px, its own
     `flex` basis, contents bounded — so an icon at 17px and a future illustration at full bleed
     still occupy one footprint. A `border` is still refused: it would add 2px to a 28px box. */
  it("⚠️ the plate is RETIRED — no fill, no rim, and no border in its place", () => {
    const b = blk(".os-mark");
    expect(b).not.toContain("box-shadow");
    expect(b).not.toContain("rgba(253, 250, 245, 0.72)");
    expect(b).not.toMatch(/(^|;|\s)border:\s*[\d.]+px/);
    expect(b).not.toContain("background");
  });

  it("⚠️ and the SLOT survives it — the box is still 26px and still swap-ready", () => {
    const b = blk(".os-mark");
    expect(b).toContain("flex: 0 0 26px");
    expect(b).toContain("width: 26px");
    expect(b).toContain("height: 26px");
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
  /* the chart is not in this list any more: its header carries the hawk illustration, not a mark
     (dashboard stage 3, 17 Sep) — `oneScreenStages.test.tsx` holds that it renders no mark at all */
  /* ⚠️ NO DASHBOARD HEADER CARRIES A MARK SINCE v16 (18 Sep). The rail is retired and the to-do card's
     header is a title, an eyebrow and a chip — the ref draws no mark on any of the five cards. The
     component is NOT retired: `OneScreenCommunity` and three other pages render it, which is why this
     census now asserts the page's own files carry none rather than counting two. */
  const files = {
    "Tasks": "OneScreenTasks.tsx",
    "Feed": "OneScreenFeed.tsx",
    "Chart": "OneScreenChart.tsx",
    "Closed": "OneScreenClosed.tsx",
    "Quick actions": "OneScreenActions.tsx",
  };
  it("no card on the page carries one, and the component is still live elsewhere", () => {
    let total = 0;
    for (const f of Object.values(files)) {
      const src = readFileSync(resolve(__dirname, `./${f}`), "utf8");
      total += (src.match(/<OneScreenMark name=/g) ?? []).length;
    }
    /* ⚠️ ZERO, AND IT IS A DECISION RATHER THAN AN OMISSION (v16). The ref's five cards carry a title,
       an eyebrow and a chip; the page's pictures are the three quick-action tiles. A mark appearing in
       one of these headers is someone reading this as an oversight. */
    expect(total).toBe(0);
    /* ⚠️ AND THE COMPONENT IS NOT DEAD — three pages beyond this one render it, which is why the
       component and its rules stay. A census of zero here must not read as "delete the mark". */
    const community = readFileSync(resolve(__dirname, "./OneScreenCommunity.tsx"), "utf8");
    expect(community).toContain("<OneScreenMark");
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
