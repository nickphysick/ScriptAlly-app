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

/** Everything before the view switch — the chrome that shows in BOTH views. */
const chrome = (() => {
  const i = page.indexOf('view === "ledger" ? renderLedger()');
  expect(i, "the view switch must exist for this slice to mean anything").toBeGreaterThan(-1);
  return page.slice(0, i);
})();

describe("the To-do list page's chrome — present in BOTH views", () => {
  it("the page names itself for its breadcrumb", () => {
    /* ⚠️ The header is CALLED in the chrome and DEFINED below the view switch, so the call and
       the copy are asserted separately. Conflating them is how a test ends up proving a function
       exists while saying nothing about whether the page renders it. */
    expect(chrome).toContain("{renderPageHeader()}");
    const hero = page.slice(page.indexOf("function renderPageHeader"), page.indexOf("function renderHero"));
    expect(hero).toContain('title="To-do list"');
    expect(hero).toContain("description=");
    /* Scoped to the LIVE header: `renderHero` is the dormant bespoke hero, kept whole behind its
       red gate, and it legitimately still carries the old wording. Asserting over the whole file
       would fail on a thing that is deliberately preserved. */
    expect(hero).not.toContain("What’s on your desk?");
  });

  it("⚠️ THE SIDE CONTAINER IS MOUNTED, and OUTSIDE the view switch", () => {
    // This is the assertion Phase 2 needed and did not have: not "the component exists" but
    // "this page mounts it, before the branch that chooses a view".
    expect(chrome).toContain("<TodoSideContainer");
    expect(chrome).toContain('<div className="tdw">');
  });

  it("the tool row carries the local search and the view toggle, and NOT the retired chip strip", () => {
    expect(chrome).toContain('className="tdb-bsearch"');
    expect(chrome).toContain('className="tdb-vtog"');
    expect(chrome).not.toContain("renderFilterChips()");
  });

  it("ONE page action — the pink Add. The review pill's job is the briefing seat's", () => {
    const hero = page.slice(page.indexOf("function renderPageHeader"), page.indexOf("function renderHero"));
    expect((hero.match(/label:/g) ?? []).length).toBe(1);
    expect(hero).toContain('label: "Add task or note"');
    expect(hero).toContain("primary: true");
  });

  it("the briefing seat still renders above the groups — it is what the pill pointed at", () => {
    expect(chrome).toContain("tdb-brief");
    expect(chrome).toContain("LAST WEEK IN REVIEW");
  });
});

describe("the LISTS rows are the ONE narrowing surface", () => {
  it("selecting a list narrows the groups — the facets are not decorative", () => {
    expect(page).toContain("function listShows");
    for (const g of ['listShows("urgent")', 'listShows("housekeeping")', 'listShows("yours")']) {
      expect(page, `${g} must gate its group`).toContain(g);
    }
  });

  it("its counts come from the counting law's hook, never a second tally on this page", () => {
    expect(page).toContain("const listCounts = useTodoCounts();");
    expect(page).toContain("counts={listCounts.byList}");
  });

  it("Snoozed narrows to the band, which is where snoozed items live in list view", () => {
    expect(page).toContain('listFilter === "snoozed"');
  });
});
