/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE CARD CONTRACT (Command Deck v2 P4 — supersedes the Variant-A rim/frame/band structure):
 * flat cards on the sheet (1px #d8cfc4 + the sheet shadow, radius 12, content-sized, flex:0 0
 * 250); band = identity + status only; body = content only; click anywhere opens; hover grows
 * the verb row downward as an overlay. Rule-text locks over todo.css + ToDoPage.tsx.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const here = __dirname;
const css = readFileSync(join(here, "todo.css"), "utf8");
const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
const rule = (sel: string): string => {
  const m = css.match(new RegExp("(?:^|\\n)" + sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}"));
  if (!m) throw new Error(`rule not found: ${sel}`);
  return m[1];
};

describe("The card contract — structure law (todo-deck-v2.html THE LAWS)", () => {
  it("flat on the sheet: 1px #d8cfc4, radius 12, the sheet shadow, the SHARED min-height (the tightening P3)", () => {
    for (const sel of [".tdb-tile", ".tdb-gcard"]) {
      const r = rule(sel);
      expect(r).toContain("border: 1px solid #d8cfc4");
      expect(r).toContain("border-radius: 12px");
      expect(r).toContain("box-shadow: 0 2px 6px rgba(58, 28, 20, 0.07)");
      // feet align across a row because EVERY card shares one min-height and pins its foot
      expect(r).toContain("min-height: var(--card-minh)");
      expect(r).not.toContain("--reelw");
    }
    expect(rule(".tdb-wrap")).toContain("--card-minh: 150px");
  });
  it("hover: ~150ms intent, 180ms ease, lift — and the CELL is a PLAIN grid item now (the tightening P3)", () => {
    expect(page).toContain("window.setTimeout(() => setVerbKey(key), 150);");
    expect(rule(".tdb-tile")).toContain("transition: box-shadow 0.18s ease, transform 0.18s ease");
    const hov = rule(".tdb-tile.hov, .tdb-gcard.hov");
    expect(hov).toContain("box-shadow: 0 10px 26px rgba(58, 28, 20, 0.18)");
    expect(hov).toContain("transform: translateY(-2px)");
    expect(hov).not.toContain("z-index"); // detail P1: the raise rides the CELL, not the surface
    // the fixed-height cell + absolute surface machinery is superseded: the foot is always
    // present, so nothing grows on hover and nothing needs a reserved resting height.
    expect(rule(".tdb-cell")).not.toContain("height: var(--tdb-cardh)");
    expect(css).not.toContain("position: absolute; top: 0; left: 0; right: 0;");
    expect(rule(".tdb-cell > .tdb-tile, .tdb-cell > .tdb-gcard")).toContain("height: 100%");
  });
  it("detail P1 — THE STACKING LAW: cell-carried z (the absolute anchor died with the hover surface)", () => {
    // the z-rule: the CELL raises on hover AND focus-within, above the headings' z 10
    expect(rule(".tdb-cell")).toContain("z-index: 1");
    expect(css).toContain(".tdb-cell:hover, .tdb-cell:focus-within { z-index: 30; }");
    expect(css).toContain(".tdb-lrow:hover, .tdb-lrow:focus-within { z-index: 30; }"); // the ledger's open menu clears them too
    // (todo rebuild P1) There is nothing left to beat: the STICKY headings — the lane header bar
    // .tdb-lh2 and the ledger's .tdb-lsech — went with the containers. Sections are typographic
    // and static, so the cell's raise clears them by default.
    expect(css).not.toContain(".tdb-lh2 {");
    expect(css).not.toContain(".tdb-lsech {");
    // the ancestor audit: no clipper, no stacking-context creator between cell and the board
    for (const sel of [".tdb-grid", ".tdb-lane", ".tdb-lanes", ".tdb-board"]) {
      let r = "";
      try { r = rule(sel); } catch { continue; } // .tdb-lanes has no own rule — nothing to audit
      expect(r).not.toContain("overflow: hidden");
      expect(r).not.toContain("overflow: clip");
      expect(r).not.toContain("transform");
      expect(r).not.toContain("filter");
      expect(r).not.toContain("will-change");
      expect(r).not.toMatch(/[^-]z-index/);
    }
    // the overlap itself is a paint-order fact jsdom cannot render — the browser walk confirms
  });
  it("the hover VERB STACK is SUPERSEDED (the tightening P3): the foot is the action lane, always present", () => {
    // the 0fr⇄1fr reveal machinery is extinct — feet cannot align if actions appear on hover
    expect(css).not.toContain(".tdb-vwrap");
    expect(css).not.toContain(".tdb-vstack");
    expect(page).not.toContain("cardVerbs(");
    // the foot: pinned with margin-top:auto (the ONE sanctioned auto margin — a vertical pin,
    // never a horizontal position), the chevron on the last 1fr track
    const foot = rule(".tdb-cfoot");
    expect(foot).toContain("margin-top: auto");
    expect(foot).toContain("display: grid");
    expect(foot).toContain("grid-template-columns: auto auto auto 1fr");
    expect(rule(".tdb-cfoot .tdb-crest")).toContain("justify-self: end");
  });
  it("focus: the default ring dies; :focus-visible = 2px ink outline at 2px offset; reduced motion = no lift, instant", () => {
    expect(css).toContain(".tdb-tile:focus, .tdb-gcard:focus { outline: none; }");
    expect(css).toContain(".tdb-tile:focus-visible, .tdb-gcard:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }");
    expect(css).toContain(".tdb-tile.hov, .tdb-gcard.hov { transform: none; }");
  });
  it("the batch progress: #ece5d8 track, ink fill, mono meta", () => {
    expect(rule(".tdb-pbar")).toContain("background: #ece5d8");
    expect(rule(".tdb-pbar i")).toContain("background: var(--ink)");
  });
});

/* ⚠️ "v4 P4 → grouping P1 — the batch card at rest" IS DELETED, NOT ADJUSTED (15 Aug). Every one
   of its four cases asserted the BATCH CARD's markup — the shared min-height, the group bar, the
   pagination branches, the fixed progress slot — all of it inside `renderGroupCard` /
   `renderGroupExpanded`, which had ZERO callers and were removed. A test that survives the removal
   of what it tested is a test asserting nothing. */

