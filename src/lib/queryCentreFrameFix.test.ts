/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre · frame corrections against design-refs/query-centre-final.html.
 *
 * The ref's pane column has NO wrapper card — the toolbar row, the hero and the three columns are
 * siblings directly inside the workspace frame, and the only bordered surfaces are the hero and
 * the columns. Carrying .f12-pane on the wrapper put a card inside the frame inside the sheet.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const queries = read("../components/Queries.tsx");
const pane = read("../components/queries/QueryCreatePane.tsx");
const css = read("../components/shell/f12.css");
const todo = read("../components/todo/todo.css");

const rule = (sel: string): string => {
  const at = css.indexOf("\n" + sel + " {");
  return at < 0 ? "" : css.slice(at, css.indexOf("}", at) + 1);
};

describe("no double container", () => {
  it("the reading-pane wrapper is not a .f12-pane", () => {
    expect(queries, "the wrapper card came back").not.toContain("qp-pane f12-pane f12-detail");
    expect(queries).toContain("qp-pane f12-detail ");
  });

  it("...but the hero and the columns keep their card skin", () => {
    /* ⚠️ THE CARD'S RIM IS A RING SINCE FIX PACK 7 §2 — same 1px, same `--line`, drawn by an
       `::after` overlay instead of a border so it can surround the header's fill. The clause is the
       rim, not the property that draws it, so the card is asserted against its ring. */
    expect(rule(".f12-card::after"), ".f12-card lost its rim")
      .toContain("box-shadow: inset 0 0 0 1px var(--line)");
    expect(rule(".f12-card"), "the card took a border back — it would double with the ring")
      .not.toMatch(/(?:^|;|\{)\s*border\s*:/);
    /* ⚠️ `.f12-hero` RETIRED WITH THE PLATE (pairing pack §1); the pairing card is the object this
       clause is about now — it keeps a card skin while the page keeps one container. */
    expect(rule(".qc-pair::after"), ".qc-pair lost its rim")
      .toContain("box-shadow: inset 0 0 0 2px var(--qc-card-border)");
    expect(rule(".qc-pair"), "the pairing card took a border back — it would double with the ring")
      .not.toMatch(/(?:^|;|\{)\s*border\s*:/);
  });

  /* ⚠️ REVERSED — the frame is gone entirely (flatten §1). "Hairline-only" was the right rule for
     a container that should not have existed; the fill and the shadow are still forbidden, and now
     so is the hairline. */
  it("and there is no frame at all", () => {
    const body = rule(".f12-body").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(body, "the frame came back").not.toContain("border:");
    expect(body, "the working area must never gain a fill").not.toContain("background:");
    expect(body, "hairline only — and not even that now").not.toContain("box-shadow");
  });
});

describe("frame interior padding", () => {
  /* ⚠️ THERE IS NO INTERIOR, because there is no frame. The padding existed so content did not sit
     against a hairline; with the hairline gone it is a second gutter inside the row's own. */
  it("is gone with the frame — the row's gutters are the only ones", () => {
    expect(rule(".f12-body").replace(/\/\*[\s\S]*?\*\//g, ""), "an interior padding came back").not.toContain("padding:");
  });
});

describe("quiet scrollbars — the To-do pattern, reused", () => {
  it("thin and transparent at rest on the rows and every column body", () => {
    expect(css).toContain(".f12-rows, .f12-quiet-scroll { scrollbar-width: thin; scrollbar-color: transparent transparent; }");
    expect(todo, "To-do's pattern moved — these were meant to track each other")
      .toContain("scrollbar-color: transparent transparent");
  });

  it("a hairline thumb appears on hover or keyboard focus", () => {
    expect(css).toContain(":focus-within { scrollbar-color: var(--hairline) transparent; }");
  });

  /* Create mode's two scrolling column bodies went with the grid (v3): the stack shows one
     section at a time and the pane scrolls as a whole, so there is nothing left inside it that
     scrolls on its own. The READING pane's three columns are untouched and still the point. */
  /* ⚠️ TWO SCROLLERS NOW, NOT THREE (pairing pack §1). "What you sent" had one; its rows moved into
     the pairing card, which does not scroll — it sizes to its contents, and a scroller there would
     be a card that hides half its own subject. Tracking and Notes keep theirs. */
  it("applied to the list rows and the reading pane's two card bodies", () => {
    expect(queries.match(/scrollClassName="f12-quiet-scroll"/g)?.length ?? 0).toBe(2);
    expect(pane, "a create-mode inner scroller came back").not.toContain('className="f12-quiet-scroll"');
  });

  it("the webkit half is present — To-do's rule lacks it, so Safari would show a system bar", () => {
    expect(css).toContain("::-webkit-scrollbar-thumb");
    expect(todo, "if To-do gains one, this note should be revisited").not.toContain("tdb-tmid2::-webkit-scrollbar");
  });
});
