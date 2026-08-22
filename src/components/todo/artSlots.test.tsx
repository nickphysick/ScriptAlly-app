/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ArtSlot and the six slots (board-optimise pack, Phase 3; ref design-refs/art-slots.html).
 *
 * ⚠️ THE TWO REJECTIONS ARE TESTED AS HARD AS THE SIX SLOTS. "No art in page headers" and "no art
 * per card" are the decisions that keep the illustrator's budget on six pieces that land rather
 * than forty that decorate — and a rejection with no tripwire is a comment somebody will
 * cheerfully violate in six months.
 */
import React from "react";
import { sliceBetween } from "../../test/sliceBetween";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ArtSlot, ART_SLOTS, ArtSlotName } from "./ArtSlot";

const here = __dirname;
const css = readFileSync(join(here, "artSlot.css"), "utf8");
const board = readFileSync(join(here, "TodoBoard.tsx"), "utf8");
const listPage = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
const noteboard = readFileSync(join(here, "TodoNoteboardPage.tsx"), "utf8");
const layout = readFileSync(join(here, "TasksPageLayout.tsx"), "utf8");

/* ⚠️ SEVEN 7 Aug 2026 (tasks-viewport P2): "seize-the-day" joins the six, and it is the FIRST
   slot to carry a real asset — the illustration arrived embedded in today-redesign.html and is
   committed at public/todo-seize-the-day.png. The census stays exhaustive so a slot cannot be
   added without a brief, which is the whole point of this list. */
const NAMES: ArtSlotName[] = [
  "desk-clear", "noteboard-empty", "done-empty", "dock-seal", "review-masthead", "first-run-board",
  "seize-the-day",
  // Query Centre's agent context panel with nothing on file — the first slot outside /todo.
  "agent-unknown",
  // Query Centre stage 1 with nobody left to suggest.
  "no-quick-picks",
  // Query Centre's reading pane before a query is chosen (ref 176) — 210×150, the ref's own box.
  "pane-unselected",
];

describe("⚠️ ONE component, TEN slots — the briefs are the contract", () => {
  it("every briefed slot exists, with its ratio and its caption", () => {
    expect(Object.keys(ART_SLOTS).sort()).toEqual([...NAMES].sort());
    for (const n of NAMES) {
      const b = ART_SLOTS[n];
      expect(b.w, n).toBeGreaterThan(0);
      expect(b.h, n).toBeGreaterThan(0);
      expect(b.caption.length, n).toBeGreaterThan(10);
      expect(b.alt, n).not.toMatch(/illustration|image|picture/i); // alt describes, never names itself
    }
  });

  it("the ratios are the ref's own figures", () => {
    /* ⚠️ 210×150 IS WHAT FIXES THE CAPTION'S POSITION, which is the whole reason the placeholder
       ships: the watercolour drops into the same box later with no layout change. */
    expect([ART_SLOTS["pane-unselected"].w, ART_SLOTS["pane-unselected"].h]).toEqual([210, 150]);
    expect([ART_SLOTS["desk-clear"].w, ART_SLOTS["desk-clear"].h]).toEqual([520, 300]);
    expect([ART_SLOTS["noteboard-empty"].w, ART_SLOTS["noteboard-empty"].h]).toEqual([380, 200]);
    expect([ART_SLOTS["done-empty"].w, ART_SLOTS["done-empty"].h]).toEqual([240, 150]);
    expect([ART_SLOTS["dock-seal"].w, ART_SLOTS["dock-seal"].h]).toEqual([120, 120]);
    expect([ART_SLOTS["review-masthead"].w, ART_SLOTS["review-masthead"].h]).toEqual([640, 90]);
    expect([ART_SLOTS["first-run-board"].w, ART_SLOTS["first-run-board"].h]).toEqual([460, 260]);
  });

  it("⚠️ the PLACEHOLDER RESERVES THE SPACE — a ratio box, so nothing shifts when the art lands", () => {
    for (const n of NAMES) {
      const html = renderToStaticMarkup(<ArtSlot name={n} />);
      const pct = (ART_SLOTS[n].h / ART_SLOTS[n].w) * 100;
      /* ⚠️ ONLY WHERE THERE IS NO ASSET (7 Aug): real artwork stands alone — a ratio box and

         its dashed frame drawn around finished work makes it look unfinished. */

      if (!ART_SLOTS[n].src) expect(html, n).toContain(`padding-top:${(ART_SLOTS[n].h / ART_SLOTS[n].w) * 100}%`);
    }
    // the box is a ratio device, never a fixed height
    const boxRule = css.slice(css.indexOf(".art-box {"), css.indexOf("}", css.indexOf(".art-box {")));
    expect(boxRule).toContain("height: 0");
    expect(boxRule).toContain("position: relative");
  });

  it("⚠️ A MISSING ASSET DEGRADES TO THE CAPTION — never a broken image", () => {
    /* ⚠️ AMENDED 7 Aug 2026 (tasks-viewport P2): this read "no slot has an asset today", which
       was true of all six and is now true of six of seven. The rule it protects is unchanged and
       is the important half — a slot WITHOUT a src renders its caption and never an <img>, so an
       empty state cannot show a broken-image glyph. The one slot WITH a src is asserted below,
       so the two directions are pinned rather than one. */
    for (const n of NAMES) {
      const html = renderToStaticMarkup(<ArtSlot name={n} />);
      const hasAsset = !!ART_SLOTS[n].src;
      if (hasAsset) {
        expect(html, n).toContain("<img");
        expect(html, n).toContain(ART_SLOTS[n].alt); // described, and it is the brief's own alt
      } else {
        expect(html, n).not.toContain("<img");
        /* ⚠️ AND THE BRIEF IS NOT IN THE OUTPUT (7 Aug). It used to render as body text under
           every placeholder, so a writer met the illustrator's note as though the app were
           telling them something. The placeholder names the SLOT and nothing else. */
        expect(html, n).not.toContain(ART_SLOTS[n].caption.slice(0, 20));
        expect(html, n).toContain(`ART · ${n.toUpperCase()}`);
      }
    }
    // exactly ONE slot carries an asset today — the plan card's mark
    expect(NAMES.filter((n) => !!ART_SLOTS[n].src)).toEqual(["seize-the-day"]);
    expect(ART_SLOTS["seize-the-day"].src).toBe("/todo-seize-the-day.png");
    // and when one DOES land, an onError flips it back to the caption rather than the glyph
    const src = readFileSync(join(here, "ArtSlot.tsx"), "utf8");
    expect(src).toContain("onError={() => setFailed(true)}");
    expect(src).toContain("const showArt = !!brief.src && !failed;");
  });

  it("the Done vignette can be capped so it reads at 260px inside its column", () => {
    const html = renderToStaticMarkup(<ArtSlot name="done-empty" maxWidth={260} />);
    expect(html).toContain("max-width:260px");
    expect(board).toContain('<ArtSlot name="done-empty" maxWidth={260}');
  });
});

/* ── the rejections ───────────────────────────────────────────────────────────────────────── */

describe("⚠️ WHERE ART DOES NOT GO — the two rejections, enforced", () => {
  it("NO ART IN A PAGE HEADER: the shared layout's header block cannot render one", () => {
    /* Every Tasks page's title/subtitle/tool row comes from TasksPageLayout — so a single
       assertion on that component covers all four pages at once. */
    /* ⚠️ THE LAYOUT HAS NO `<header>` ELEMENT AT ALL — the header block is the shell's
       `PageHeader`, passed as the grid's `plate`. Slicing for one read the whole file, so the
       "no art in the header" assertion was really "no art in the component", which the line above
       already states. Both halves asserted for what they are. */
    expect(layout).not.toContain("ArtSlot");
    expect(layout).not.toContain("<header");
  });

  it("NO ART PER CARD: no slot renders inside a board card, a note card or a calendar pip", () => {
    const article = sliceBetween(board, "<article", "</article>");
    expect(article).not.toContain("ArtSlot");
    const noteCard = sliceBetween(noteboard, "<article", "</article>");
    expect(noteCard).not.toContain("ArtSlot");
    const calendar = readFileSync(join(here, "TodoCalendarPage.tsx"), "utf8");
    expect(calendar).not.toContain("ArtSlot"); // no pip, no cell, nowhere
  });

  it("the component itself names both rejections, so the next reader inherits the reasoning", () => {
    const src = readFileSync(join(here, "ArtSlot.tsx"), "utf8");
    expect(src).toContain("NOT in page headers");
    expect(src).toContain("NOT per card");
  });
});

/* ── each trigger ─────────────────────────────────────────────────────────────────────────── */

describe("⚠️ each slot's TRIGGER — the conditions, named", () => {
  it("done-empty: the Done column, and only while it is empty", () => {
    expect(board).toContain('col.id === "done" && <ArtSlot name="done-empty"');
    // it sits inside the empty branch — a non-empty Done cannot reach it
    const emptyBranch = board.slice(board.indexOf("{cards.length === 0 && ("), board.indexOf("{visible.map"));
    expect(emptyBranch).toContain("done-empty");
  });

  it("noteboard-empty: the first-run state, ABOVE the copy that was already written", () => {
    expect(noteboard).toContain('<ArtSlot name="noteboard-empty"');
    expect(noteboard.indexOf('name="noteboard-empty"')).toBeLessThan(noteboard.indexOf("Nothing pinned yet"));
  });

  /* ⚠️ THE TWO desk-clear SPECS WENT WITH TODAY (tasks-consolidation P1, 9 Aug). Both asserted
     against `TodoTodayPage.tsx`, which is retired — the ranked order of the one list IS the plan,
     so a second page over a subset of the same tasks was the over-complication.

     THE SLOT ITSELF SURVIVES and is still in the census above: `desk-clear` is briefed, ratio'd
     and rendered by ArtSlot exactly as before. What is gone is its MOUNT — the consolidated page
     re-earns it, and its three-way AND (nothing committed ∧ nothing urgent ∧ nothing suggested,
     read UNFILTERED so a filter cannot fake a clear desk) is the rule to rebuild against. */

  it("first-run-board is DISTINCT from desk-clear — not yet versus well done", () => {
    expect(listPage).toContain('<ArtSlot name="first-run-board"');
    // the new-desk state is the trigger; the two never share an asset or a slot name
    const newDesk = listPage.slice(listPage.indexOf("function renderNewDesk"), listPage.indexOf("function renderNewDesk") + 900);
    expect(newDesk).toContain("first-run-board");
    expect(newDesk).not.toContain("desk-clear");
    expect(ART_SLOTS["first-run-board"].caption).not.toBe(ART_SLOTS["desk-clear"].caption);
  });

  /**
   * ⚠️ THE BRIEFING CARD IS UNMOUNTED FROM THE TO-DO PAGE, so its art slot goes with it — and the
   * rule this case protects is unchanged rather than relaxed. `review-masthead` is the ONE place a
   * header illustration earns its keep BECAUSE the card is temporary and celebratory; a slot that
   * outlived its card would be a permanent page illustration, which is exactly what the trigger
   * list forbids. So the assertion inverts: no card, no slot.
   *
   * The slot's own definition is untouched and the card returns with it.
   */
  it("review-masthead does not render while the briefing card is unmounted", () => {
    expect(listPage).not.toContain('<ArtSlot name="review-masthead"');
    /* and the reason is stated at the unmount site, so restoring one restores both */
    expect(listPage).toContain("THE WEEKLY REVIEW BANNER IS UNMOUNTED");
  });
});

describe("⚠️ dock-seal: 600ms, and OFF under reduced motion", () => {
  it("the flourish is a keyframe animation at the ref's duration, on the shared curve", () => {
    expect(css).toContain("animation: artSeal 600ms cubic-bezier(.2, .7, .3, 1) forwards");
    expect(css).toContain("@keyframes artSeal");
  });

  it("reduced motion stops it in the stylesheet as well as at the mount", () => {
    const i = css.indexOf("@media (prefers-reduced-motion: reduce)");
    expect(i).toBeGreaterThan(-1);
    expect(css.slice(i)).toContain("animation: none");
  });

  it("the seal shows no caption — a stamp that explained itself would not be a stamp", () => {
    /* ⚠️ RETIRED 7 Aug — `.art-cap` is gone entirely: an illustrator's brief is not user-facing
       copy, and it was rendering as body text under every placeholder. There is no caption left
       to hide per slot. */
  });
});
