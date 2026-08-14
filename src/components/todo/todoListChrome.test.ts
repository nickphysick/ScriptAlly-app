/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE TRIPWIRE FOR THE CHROME BYPASS (corrections fix 3).
 *
 * Phase 2 built the To-do list page's group cards and passed every one of its tests — while the
 * live page showed the OLD era: the "What's on your desk?" hero, the review pill, the retired chip
 * strip, and no page side container at all.
 *
 * TWO CAUSES, COMPOUNDING:
 *
 * 1. **A view-scoped render path.** Phase 2 rewrote `renderLedger()` — the ROWS view — and nothing
 *    else. The default view is `cards`, which Phase 4 then pointed at the board. So the three
 *    group cards were only ever reachable by switching views, and the page's own chrome (header,
 *    control line, side container) was never in Phase 2's scope at all.
 *
 * 2. **Tests that asserted SOURCE PRESENCE, not the rendered page.** Every Phase 2 assertion read
 *    a string inside `renderLedger`, which existed and was correct. A source-string test cannot
 *    see that the function it is reading is unreachable by default, and cannot see what the page
 *    renders ABOVE the branch it lives in.
 *
 * So this file asserts the page's chrome as a WHOLE — the things that are true regardless of which
 * view is showing — and asserts them OUTSIDE any view branch. It is the shape of test that would
 * have failed on the walk's first look.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const here = __dirname;
const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");

/** Everything before the body renders — the page's chrome.
 *  ⚠️ The anchor has moved three times: with the view switch (board+dock P1), with the board
 *  itself (tasks-consolidation P2, 9 Aug), and now with the SPLIT (rail + workspace P2), which
 *  put the list inside a pane so `") : renderList()}"` stopped existing. The slice ends at the
 *  body's opening element, whatever the body currently is — that is the whole point of anchoring
 *  on it rather than on a view. */
const chrome = (() => {
  const i = page.indexOf('<div className="tdw-split">');
  expect(i, "the split — the page's body — must exist for this slice to mean anything").toBeGreaterThan(-1);
  return page.slice(0, i);
})();

describe("the To-do list page's chrome — present in BOTH views", () => {
  it("the page names itself for its breadcrumb", () => {
    /* ⚠️ Re-anchored (tasks-pages P1): the header block is TasksPageLayout's now — the page hands
       it the title/subtitle and renderTools feeds its tool row. Same law, new home. */
    expect(chrome).toContain("<TasksPageLayout");
    expect(chrome).toContain('title="To-do list"');
    /* ⚠️ THE PROSE SUBTITLE IS RETIRED (tasks-consolidation P2) AND THE STAT CHIPS SAY IT NOW.
       `boardSubtitleCopy(boardFigures(boardCols))` and `taskStats(boardCols, …)` state the same
       facts over the same object; two statements of one derivation is the fault the counting law
       exists to prevent, so the header keeps ONE. The mono eyebrow arrives in its place — the
       Dashboard's grammar, both halves imported from the Dashboard's own derivations. */
    expect(chrome).not.toContain("subtitle={boardSubtitle()}");
    expect(chrome).toContain("eyebrow={tasksEyebrow(longDate(new Date(now)), weekOfQuerying(queries, new Date(now)))}");
    /* Scoped to the LIVE chrome: `renderHero` is the dormant bespoke hero, kept whole behind its
       red gate, and it legitimately still carries the old wording. Asserting over the whole file
       would fail on a thing that is deliberately preserved. */
    expect(chrome.slice(chrome.indexOf("<TasksPageLayout"))).not.toContain("What’s on your desk?");
  });

  /* ⚠️ THE SIDE CONTAINER'S MOUNT IS RETIRED (tasks-consolidation P2, 9 Aug), AND THE TRIPWIRE
     THIS FILE EXISTS FOR IS NOT. Its FILTERS facets asked "what KIND of thing is this" — the
     question the five groups now answer permanently and in the open — so a control that narrowed
     to one kind was a way of hiding four. Its other two jobs both kept their doors: Task settings
     via the Settings page (tasks-viewport P5) and the Noteboard via its own nav row.
     ⚠️ ONE THING GENUINELY WENT: the TAG narrowing. Flagged in reports/STATE.md, not absorbed. */
  it("⚠️ NO PAGE CARRIES A SIDEBAR NOW — and the two doors it held are still open", () => {
    expect(chrome).not.toContain("<TodoSideContainer");
    expect(chrome).not.toContain("sidebar={");
    // the settings sheet is still HOSTED here — the Settings page's route lands before the event
    expect(page).toContain("TODO_OPEN_TASK_SETTINGS");
    expect(page).toContain("<TaskSettingsSheet");
  });

  it("the body is the GROUPED LIST — the four columns, the ledger and the view toggle are all gone", () => {
    /* ⚠️ RETIRED SURFACE, TWICE OVER. board+dock P1 retired the Lane/ledger grammar and the view
       toggle for the board; tasks-consolidation P2 retires the board itself. The pieces each
       carried survive: the housekeeping FOLD is `groupSlice`, the SNOOZED BAND is the snoozed
       fold row, and the KIND facet is the group heading it was always approximating. */
    expect(page).not.toContain("function renderLedger");
    expect(page).not.toContain("function groupCard");
    expect(page).not.toContain("function renderBoard");
    expect(page).toContain("function renderList");
    // the slice above already proves the call is reached from the chrome, not from a view branch
    expect(page).toContain("<TaskList");
  });

  it("the Add is PINK (creation); the session launcher is RETIRED (board fixes II P3)", () => {
    // tasks-pages P1: the controls live in renderTools (the layout's tool row) now
    const hero = page.slice(page.indexOf("function renderTools"), page.indexOf("function renderHero"));
    expect(hero).toContain('className="tdb-addb"');   // pink
    /* ⚠️ SUPERSEDED: "tdb-ghb ▶ Focused session" is gone — the dock's doors (every card, the
       menu's Action now) made a separate launcher a second name for a thing already under your
       pointer. The ENGINE survives whole; only the button went. */
    expect(hero).not.toContain('className="tdb-ghb"');
    expect(hero).not.toContain("Focused session");
  });

  it("the briefing seat still renders above the groups — it is what the pill pointed at", () => {
    expect(chrome).toContain("tdb-brief");
    expect(chrome).toContain("LAST WEEK IN REVIEW");
  });
});

describe("ONE narrowing, applied in ONE place — it cannot reach some of the page and not the rest", () => {
  /* ⚠️ THE SURFACE CHANGED AND THE LAW DID NOT. FILTERS was the one narrowing surface and it had
     to reach all four columns; the facet retired with the sidebar, so the search is what is left
     — and it still has to reach every source set alike, or the page shows differently-scoped
     views of one list and you have to remember which. `narrowCards` is where it is applied, and
     the list, the dock's queue and the "nothing matches" branch all read THAT. */
  /* ⚠️ RE-ANCHORED ON `railGroups` (Phase 4). The narrowing moved out of `renderList` into the
     function BOTH the list and the "is the rail empty" question read — which is the same law
     tightened, not relaxed: the emptiness check used to run on a parallel set built with a
     different filter model, free to answer differently from the list beside it. */
  const fn = (() => {
    const i = page.indexOf("function railGroups");
    expect(i, "railGroups must exist for this slice to mean anything").toBeGreaterThan(-1);
    return page.slice(i, i + 1400);
  })();

  it("every source set walks through the same narrow helper", () => {
    for (const col of ["todo", "today", "snoozed", "done"]) {
      expect(fn, `${col} must be narrowed`).toContain(`${col}: narrowCards(boardCols.${col})`);
    }
  });

  it("the helper carries the search, the TAG and the sort, so none can diverge per group", () => {
    /* The tag filter rejoined the tool row after P2 (Nick's call): it composes here, in the ONE
       helper, rather than at a render site — which is what makes it impossible for the list, the
       dock's queue and the no-match branch to be looking at different sets. */
    const helper = page.slice(page.indexOf("function narrowCards"), page.indexOf("function narrowCards") + 900);
    expect(helper).toContain("matchesSearch(c, search, sctx)");
    expect(helper).toContain("matchesTags(c.tags, [tagSel])");
    expect(helper).toContain("sortBoardCards(tagged, sort)");
  });

  it("the DOCK walks exactly what you were looking at — the same helper, never a second order", () => {
    const dock = page.slice(page.indexOf("function dockAllCards"), page.indexOf("function dockAllCards") + 300);
    expect(dock).toContain("narrowCards([...board.do, ...board.hk, ...board.nt])");
  });

  it("the header's figures come from the cards the page RENDERS, never a second tally", () => {
    /* ⚠️ SUPERSEDED FEED, TWICE. P5 moved it off the raw lanes (which held every sweep member
       loose and could not see the flags-built Snoozed — "Everything 27" beside fourteen); P2
       moves it off the FILTERS rows onto the stat chips. Same object both times: `boardCols`. */
    expect(page).toContain("taskStats(boardCols,");
    expect(page).not.toContain("facetCounts(");
  });
});
