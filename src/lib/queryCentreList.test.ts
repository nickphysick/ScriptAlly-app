/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre · P2 — the editorial query list (ref design-refs/query-centre-final.html).
 *
 * The head REUSES To-do's values rather than approximating them, and that distinction is the
 * lock: Playfair 17/700 + a mono count over a 1px #ece5d9 warm hairline, exactly as todo.css
 * draws its section heads. The ref shows a 2px ink rule — that is the AGENT LIST's grouping
 * treatment, and the live To-do grammar wins here.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const css = read("../components/shell/f12.css");
const todoCss = read("../components/todo/todo.css");
const queries = read("../components/Queries.tsx");

const rule = (sheet: string, selector: string): string => {
  const at = sheet.indexOf("\n" + selector + " {");
  return at < 0 ? "" : sheet.slice(at, sheet.indexOf("}", at) + 1);
};

describe("the head reuses To-do's values, it does not approximate them", () => {
  it("Playfair 17/700 — the same numbers todo.css uses", () => {
    const mine = rule(css, ".f12-lhtitle h2");
    const theirs = rule(todoCss, ".tdb-sec h2");
    expect(mine, "the head rule is missing").not.toBe("");
    for (const v of ["var(--f12-serif)", "font-size: 17px", "font-weight: 700"]) {
      expect(mine, `head lost ${v}`).toContain(v);
      expect(theirs, `To-do no longer uses ${v} — the two have drifted apart`).toContain(v);
    }
  });

  it("the rule is To-do's 1px warm hairline, NOT the agent list's 2px ink rule", () => {
    const head = rule(css, ".f12-lhtitle");
    expect(head).toContain("border-bottom: 1px solid #ece5d9");
    expect(todoCss, "To-do's hairline moved — reuse means these track each other").toContain("#ece5d9");
    expect(head, "the ref's 2px ink rule must not arrive here").not.toContain("2px solid var(--ink)");
  });

  /* ⚠️ SUPERSEDED, recorded rather than deleted: the count USED to be a separate mono figure
     beside the title ("Your queries" · 21), reusing To-do's head grammar wholesale. It is now
     part of the sentence — "21 queries" / "Showing 12 of 21 queries" — so there is no trailing
     figure left to style and the mono rule is gone with the span. What survives from To-do is
     the Playfair 17/700 and the warm hairline, asserted above; only the count moved. */
  /**
   * ⚠️ THE COLUMN'S HEADING IS GONE (Pack B §1a), so this case moved to the FOOT. The head read
   * "20 queries" — the same figure the masthead states directly above it, twice on one screen. A
   * pane does not introduce itself.
   *
   * ⚠️ AND THE FOOT'S COUNT IS NOT THE SAME FACT, which is why it stays. The masthead counts the
   * whole scope; the foot counts what the FILTER left. They diverge the moment anything is
   * narrowed, which is exactly when the second number earns its place.
   */
  it("the count is stated once on the page — at the foot, where it means something else", () => {
    expect(rule(css, ".f12-lhtitle .f12-lhcount"), "the dead count rule is still in the sheet").toBe("");
    expect(queries, "the count span outlived its rule").not.toContain('className="f12-lhcount"');
    expect(queries, "the head must read the shared label helper, not build a string inline")
      .toContain("SHOWING <b>{sortedList.length}</b> OF {queries.length}");
  });
});

describe("the list is de-carded", () => {
  it("it is no longer a .f12-pane in either branch", () => {
    expect(queries, "the list is still carded").not.toContain('className="f12-pane f12-list"');
    expect(queries.match(/className="f12-list"/g)?.length ?? 0).toBe(2);
  });

  /**
   * ⚠️ INVERTED (Pack B §1c), AND THE OLD RULE WAS RIGHT FOR A DIFFERENT PAGE. "De-carded" meant the
   * list stopped being a bordered `.f12-pane` floating on the desk — a card inside a card — and
   * that deletion stands: no border, no radius, no shadow, no float. What it must NOT be is
   * paintless. The column is FURNITURE now: it runs flush from the masthead to the foot on a faint
   * ground, which is what makes it read as a fixed part of the page rather than as content that
   * happens to sit on the left.
   *
   * A ground tint is not a card. The distinction is the whole of §1c.
   */
  /**
   * ⚠️ INVERTED BY FIX PACK 5. "Furniture, never a card" was the flush-wall law; the list is an inset
   * panel now — rim, standard radius, held off three sides. The GROUND is the one clause that
   * survives unchanged, and the flex/min-height chain with it, because neither had anything to do
   * with whether the column was a card.
   */
  it("it is a card — the same ground, now with a rim and a radius", () => {
    const list = rule(css, ".f12-list");
    /* ⚠️ `--paper` → `--panel` (fix pack 6 §2) → `--white` (§4). The receding fill was right while
       the list was furniture; `--panel` made it an object — but `--panel` is `#fffdfb` and so is
       the reading pane beside it, so "an object" was two surfaces one point apart. Pure white with
       its own cast is the distinction that fill was trying and failing to make. */
    expect(list, "the column lost its ground — it goes back to being loose content")
      .toContain("background: var(--white)");
    expect(list, "the card lost its cast").toContain("box-shadow: var(--sh-2)");
    expect(list, "the panel lost its rim").toContain("border: 1px solid var(--line)");
    expect(list, "the panel lost its radius").toContain("border-radius");
    expect(list, "the seam went back onto the panel, so it stops where the panel stops")
      .not.toContain("border-right");
    expect(list).toContain("display: flex");
    expect(list).toContain("min-height: 0");
  });
});

describe("the selected row is a flat fill, and the bookmark is retired", () => {
  /**
   * ⚠️ INVERTED BY FIX PACK 7 §4, AND THIS CASE IS TURNED ROUND RATHER THAN DELETED. It asserted a
   * 3px burgundy bookmark, inset top and bottom, with rounded ends — the marker the selected row
   * needed while its fill was a small tonal step from the column's ground. The fill is `--pink-t`
   * now: a HUE nothing else in the column carries, which needs neither an edge nor a mark to be
   * found. And burgundy means OUTGOING on the StatusDot two columns to the right of it, so the
   * section's rule is that no burgundy appears in the list at all.
   *
   * A deleted case would let the bookmark come back; this one says why it must not.
   */
  it("3px of ink no longer marks it — the fill does", () => {
    const sel = rule(css, ".f12-row.f12-sel");
    expect(sel, "the selected row lost its fill").toContain("background: var(--pink-t)");
    expect(sel, "a ring came back on top of the fill").toContain("box-shadow: none");
    expect(sel, "the blue came back").not.toContain("--blue-t");
    expect(sel, "the full-height inset edge should be gone").not.toContain("inset 3px 0 0");
    expect(rule(css, ".f12-row.f12-sel::before"), "the bookmark came back").toBe("");
  });
});
