/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Create mode v2 · P2 — FOCUS THROUGH SPACE (ref design-refs/qc-create-v2.html).
 *
 * The scrim is gone (P1). Create mode now focuses by collapsing the list to a monogram rail and
 * letting the pane take the freed width: the thing you are doing becomes the biggest thing on
 * the page, and nothing is dimmed to achieve it.
 *
 * Browser-measured against the built CSS, 1500×820 viewport, 14 rows + a draft:
 *
 *   state    list    pane    head   foot   rows scroll   page scroll
 *   rest      334     788      48   34.8       yes             0
 *   create     62    1060       0      0       yes             0
 *   back      334     788      48   34.8       yes             0
 *
 * Two facts that lock the design:
 *  · THE RESTORE IS EXACT — every figure returns to its rest value, so the reverse is the
 *    forward transition run backwards rather than a second set of rules to keep in step.
 *  · PAGE SCROLL STAYS 0 THROUGHOUT. The viewport-fit chain (.ws-work--fit → .f12-body →
 *    .f12-list → .f12-rows) is entirely VERTICAL and reads no width, so animating width cannot
 *    disturb it. The rows keep their own scroll container across the whole transition; the rail
 *    actually gains row height (401 → 550) because the furniture collapses out of the column.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const css = read("../components/shell/f12.css");
const queries = read("../components/Queries.tsx");

const rule = (selector: string): string => {
  const at = css.indexOf("\n" + selector + " {");
  return at < 0 ? "" : css.slice(at, css.indexOf("}", at) + 1);
};

describe("the list collapses to a rail", () => {
  /* ⚠️ The token sits beside --listw in index.css's .t-f12 block, NOT in a second .f12-root
     rule in f12.css. The list's full width and its rail width are the same fact in two states
     and belong in one place — and a duplicate rule for a selector that already exists is how
     this sheet has silently lost declarations before. */
  it("the rail width is a token, and it lives with the list's other width", () => {
    const indexCss = read("../index.css");
    expect(indexCss, "the rail token is missing").toContain("--listw: 334px; --f12-railw: 62px;");
    expect(css, "a second .f12-root rule was opened to hold it").not.toContain(".f12-root { --f12-railw");
    expect(rule(".qh-create .f12-list")).toContain("width: var(--f12-railw)");
  });

  it("the width transition is the ref's curve, and it lives on the base rule", () => {
    const list = rule(".f12-list");
    expect(list, "the base rule must carry the transition, or only one direction animates")
      .toContain("transition: width 0.34s cubic-bezier(0.22, 0.9, 0.3, 1)");
    expect(list, "the list must keep a definite width — the fit chain relies on it not flexing")
      .toContain("flex: none");
  });

  /* Fading the furniture is not enough: an invisible 48px head, 36px control row and footer
     still hold their boxes and still push the rows down inside a 62px rail. */
  it("the furniture collapses its BOX, not just its opacity", () => {
    const out = rule(".qh-create .f12-lhtitle,\n.qh-create .f12-lhead,\n.qh-create .f12-lfoot");
    expect(out, "the collapse rule is missing").not.toBe("");
    for (const prop of ["opacity: 0", "height: 0", "margin: 0", "padding: 0", "border-width: 0", "overflow: hidden"]) {
      expect(out, `the furniture keeps ${prop.split(":")[0]} — it will still hold space`).toContain(prop);
    }
  });
});

describe("the rows keep only their monogram", () => {
  /* ⚠️ THE BUG THIS LOCKS, because fading alone looked right until it was measured: with
     opacity: 0 and nothing else, .f12-end still held 34.2px of the flex line. Monogram (32) +
     end (34.2) overflows a 51px rail row, and `justify-content: center` centres the OVERFLOW —
     which put the monogram at -7.6px, clipped outside its own row. After collapsing the width
     the monogram measures 9.5px from the row's left edge against a computed centre of 9.5. */
  it("the withdrawn parts leave the flex line, not merely the eye", () => {
    const withdrawn = rule(".qh-create .f12-row .f12-mid,\n.qh-create .f12-row .f12-end");
    expect(withdrawn, "the withdraw rule is missing").not.toBe("");
    expect(withdrawn).toContain("opacity: 0");
    expect(withdrawn, "opacity hides from the eye, not from layout — the monogram will clip")
      .toContain("flex: 0 0 0");
    expect(withdrawn).toContain("width: 0");
    expect(withdrawn, "the row must not become a click target for invisible text")
      .toContain("pointer-events: none");
  });

  it("the monogram centres, and the row box itself is untouched", () => {
    const row = rule(".qh-create .f12-row");
    expect(row).toContain("justify-content: center");
    expect(row, "the rail must read as the list with its text withdrawn, not a shorter list")
      .not.toContain("height:");
  });

  /* Selection is stashed while a draft is open, so a marked row would point at a record the
     page is not currently showing. The draft is the only thing worth marking in the rail. */
  it("the selected row's marker stands down; the draft keeps its tile", () => {
    expect(rule(".qh-create .f12-row.f12-sel")).toContain("background: transparent");
    expect(css).toContain(".qh-create .f12-row.f12-sel::before { opacity: 0; }");
    expect(rule(".qh-create .f12-row.f12-draft")).toContain("justify-content: center");
  });
});

describe("motion and reach", () => {
  it("reduced motion applies the collapse instantly", () => {
    const at = css.indexOf("@media (prefers-reduced-motion: reduce) {\n  .f12-list,");
    expect(at, "the reduced-motion block for the rail is missing").toBeGreaterThan(-1);
    const block = css.slice(at, css.indexOf("}\n", css.indexOf(".f12-end { transition: none", at)));
    for (const sel of [".f12-list", ".f12-lhtitle", ".f12-lhead", ".f12-lfoot", ".f12-mid", ".f12-end"]) {
      expect(block, `${sel} still animates under reduced motion`).toContain(sel);
    }
    expect(block).toContain("transition: none !important");
  });

  /* CSS-only: the class is the whole mechanism, so both directions come from one transition
     and no JS timer drives a frame. */
  it("the page root carries qh-create while creating, and nothing else drives it", () => {
    expect(queries).toContain('${creating ? " qh-create" : ""}');
  });

  /* A 32px monogram with its label collapsed to zero width is still fully named to a screen
     reader — text at width 0 with overflow hidden stays in the accessibility tree, unlike
     display:none or visibility:hidden. The POINTER has no such fallback, hence the title. */
  it("a rail monogram names its agent for the pointer, and only in the rail", () => {
    expect(queries).toContain("title={creating ? agentPrimary(agent) : undefined}");
  });
});
