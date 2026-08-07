/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE VIEWPORT LOCK (tasks-viewport pack, Phase 1; ref design-refs/tasks-viewport.html).
 *
 * ⚠️ WHAT THESE LOCKS CAN AND CANNOT PROVE. There is no jsdom here (`vitest.config.ts` is
 * `environment: 'node'`), so nothing in this file computes a used height — a test cannot watch a
 * page fail to scroll. What it CAN pin is that every link in the `min-height: 0` chain DECLARES
 * its part, and that each page renders the anatomy the lock needs. The chain resolving is a
 * BROWSER check, flagged as the lead item of the walk in reports/tasks-viewport.md.
 *
 * That distinction matters because the failure mode is silent and total: one ancestor left at
 * the default `min-height: auto` and the column grows to its content instead of the frame — the
 * page scrolls exactly as before, and every declaration below it is still perfectly correct.
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TasksPageLayout, TplZone } from "./TasksPageLayout";

const here = __dirname;
const css = readFileSync(join(here, "tasksLayout.css"), "utf8");
const pageCss = readFileSync(join(here, "todo.css"), "utf8");
const calCss = readFileSync(join(here, "todoCalendar.css"), "utf8");
const layout = readFileSync(join(here, "TasksPageLayout.tsx"), "utf8");
const board = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
const today = readFileSync(join(here, "TodoTodayPage.tsx"), "utf8");
const cal = readFileSync(join(here, "TodoCalendarPage.tsx"), "utf8");
const note = readFileSync(join(here, "TodoNoteboardPage.tsx"), "utf8");

/* ⚠️ COMMENTS ARE STRIPPED, and that is not fussiness. These rules explain themselves by QUOTING
   the declaration they replaced ("this was `overflow-y: auto`"), so a raw substring match reads
   the prose as code and fails a rule that is correct. Strip first, assert second. */
const rule = (sheet: string, sel: string): string => {
  const i = sheet.indexOf(sel);
  expect(i, `${sel} has no rule`).toBeGreaterThan(-1);
  return sheet.slice(i, sheet.indexOf("}", i)).replace(/\/\*[\s\S]*?\*\//g, "");
};

describe("⚠️ THE PAGE NEVER SCROLLS — the frame is a window, the zones do the scrolling", () => {
  it("the wrap stopped being the page scroller, AT ITS OWN RULE", () => {
    /* The inversion had to happen where `overflow-y: auto` was declared — in todo.css. A second
       single-class rule elsewhere would have equal specificity and win or lose on import order. */
    const wrap = rule(pageCss, ".tdb-wrap {");
    expect(wrap).toContain("overflow: hidden");
    expect(wrap).not.toContain("overflow-y: auto");
    expect(wrap).toContain("display: flex");
    expect(wrap).toContain("flex-direction: column");
    // and nothing re-declares it in the layout sheet, which is where the temptation was
    expect(css).not.toContain(".tdb-wrap {");
  });

  it("⚠️ EVERY LINK IN THE min-height:0 CHAIN DECLARES ITS PART", () => {
    /* Listed in the order they nest. A missing link does not fail loudly — it simply restores
       the old behaviour, which is why each is named rather than spot-checked. */
    expect(rule(css, ".spine-root {")).toContain("min-height: 0");
    expect(rule(pageCss, ".tdb-wrap {")).toContain("min-height: 0");
    expect(rule(css, ".tdb-col.tpl {")).toContain("min-height: 0");
    expect(rule(css, ".tpl-cols {")).toContain("min-height: 0");
    expect(rule(css, ".tpl-body {")).toContain("min-height: 0");
    expect(rule(css, ".tpl-zone {")).toContain("min-height: 0");
    /* and each of those must also GROW into the frame, or the chain is only half-stated */
    for (const sel of [".tdb-col.tpl {", ".tpl-cols {", ".tpl-body {", ".tpl-zone {"]) {
      expect(rule(css, sel), sel).toMatch(/flex:\s*1/);
    }
  });

  it("the header block is fixed — it never scrolls away from the list it controls", () => {
    expect(rule(css, ".tpl-head { flex:")).toContain("flex: 0 0 auto");
  });

  it("⚠️ THE ZONE IS THE ONLY DECLARED SCROLLER on a Tasks page", () => {
    expect(rule(css, ".tpl-zone {")).toContain("overflow: auto");
    /* The sidebar scrolls too — it is a column of its own — but it is not a page scroller: it
       cannot grow the frame, because it carries min-height:0 like every other link. */
    expect(rule(css, ".tpl-side {")).toContain("min-height: 0");
  });

  it("the columns STRETCH under the lock — a content-sized column has no height to scroll in", () => {
    const cols = rule(css, ".tpl-cols {");
    expect(cols).toContain("align-items: stretch");
    expect(cols).not.toContain("align-items: flex-start");
  });
});

describe("⚠️ the fade hem: sticky, weightless, and only where content continues", () => {
  it("it costs no height — sticky with its own negative margin", () => {
    const hem = rule(css, ".tpl-hem {");
    expect(hem).toContain("position: sticky");
    expect(hem).toContain("bottom: 0");
    /* the pull-back must equal the height, or the hem opens a gap under a short list */
    expect(hem).toContain("height: 28px");
    expect(hem).toContain("margin-top: -28px");
    expect(hem).toContain("pointer-events: none");
  });

  it("⚠️ HEM IFF OVERFLOW — a hem over a list that fits fades to nothing and lies", () => {
    const withHem = renderToStaticMarkup(<TplZone hem>content</TplZone>);
    expect(withHem).toContain("tpl-hem");
    const without = renderToStaticMarkup(<TplZone hem={false}>content</TplZone>);
    expect(without).not.toContain("tpl-hem");
    // the caller decides from real data — the Noteboard hems only when notes exist
    expect(note).toContain("hem={notes.length > 0}");
  });

  it("the hem is the zone's LAST child, or it is not at the foot", () => {
    const html = renderToStaticMarkup(<TplZone hem><p>body</p></TplZone>);
    expect(html.indexOf("tpl-hem")).toBeGreaterThan(html.indexOf("<p>"));
  });

  it("a scrollable region is reachable by keyboard, and named when it says what it holds", () => {
    const html = renderToStaticMarkup(<TplZone label="Notes">x</TplZone>);
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Notes"');
  });
});

describe("⚠️ THE SIDEBAR IS THE TO-DO LIST'S ALONE — the other three run full width", () => {
  it("the contract renders NO aside when the sidebar is absent — never an empty gutter", () => {
    const bare = renderToStaticMarkup(
      <TasksPageLayout title="T" tools={<span />}>body</TasksPageLayout>,
    );
    expect(bare).not.toContain("<aside");
    expect(bare).toContain("tpl-body");
    const withSide = renderToStaticMarkup(
      <TasksPageLayout title="T" tools={<span />} sidebar={<nav>side</nav>}>body</TasksPageLayout>,
    );
    expect(withSide).toContain("<aside");
  });

  it("⚠️ EXACTLY ONE PAGE PASSES A SIDEBAR, and it is the board", () => {
    expect(board).toContain("sidebar={");
    for (const [name, src] of [["Today", today], ["Calendar", cal], ["Noteboard", note]] as const) {
      expect(src, `${name} must run full width`).not.toContain("sidebar={");
    }
  });

  it("Task settings therefore needs its second door — the sidebar foot reaches one page now", () => {
    /* Stated as a lock so the consequence cannot be forgotten: three of four pages can no longer
       reach the settings sheet through the sidebar. Phase 5 is the app-Settings door. */
    /* the phrase wraps across the comment's lines — match it the way prose actually sits */
    expect(layout.replace(/\s*\n\s*\*\s*/g, " ")).toContain("Task settings therefore needs a second door");
  });
});

describe("⚠️ each page's scroll anatomy, per page", () => {
  it("the BOARD's column region is the zone — and its sticky heads still have a scroller", () => {
    expect(board).toContain("<TplZone scrollRef={zoneRef}");
    /* the sticky head sticks to the zone's top; if the zone ever loses `overflow` the heads
       silently stick to the viewport instead */
    expect(rule(css, ".tpl-zone {")).toContain("overflow: auto");
  });

  it("⚠️ THE RESTORE CONTRACT FOLLOWED THE SCROLLER to the zone", () => {
    /* The wrap is `overflow: hidden` now, so its scrollTop is permanently 0 — the old contract
       would have restored every batch collapse to the top of the board, in silence. */
    expect(board).toContain("batchScroll.current[rule] = zoneRef.current?.scrollTop ?? 0");
    expect(board).toContain("zoneRef.current.scrollTop = batchScroll.current[rule]");
    expect(board).not.toContain("batchScroll.current[rule] = wrapRef.current?.scrollTop");
  });

  it("Today, Calendar and Noteboard each declare their own region", () => {
    expect(today).toContain("<TplZone");
    expect(note).toContain("<TplZone");
    /* ⚠️ THE CALENDAR IS THE EXCEPTION AND IT IS DELIBERATE: it answers the lock by COMPRESSING,
       not scrolling — the whole month stays on screen. So it has no zone, and that is the
       design rather than an omission. */
    expect(cal).not.toContain("<TplZone");
  });

  it("⚠️ THE CALENDAR COMPRESSES: the grid takes the remaining height with ZERO-MIN 1fr rows", () => {
    const grid = rule(calCss, ".cal-grid {");
    expect(grid).toMatch(/flex:\s*1/);
    expect(grid).toContain("min-height: 0");
    expect(grid).not.toContain("overflow: auto");

    /* ⚠️ minmax(0, 1fr), NEVER a bare `1fr` — THIS IS THE WHOLE FIX and it shipped wrong once.
       A bare `1fr` grid row is `minmax(auto, 1fr)`: its floor is the content's min-content
       height, so the rows could not shrink and the month overflowed instead of compressing.
       Browser-measured at 1440×900 with the bare version: rows resolved to
       `12.75px 104px 104px 104px 104px 104px 104px` and the grid ran 17px past its frame.
       Same law as the board's column measure — a capped track needs a zero minimum, or the cap
       is the only thing that ever applies. */
    expect(grid).toContain("grid-auto-rows: minmax(0, 1fr)");
    expect(grid).not.toMatch(/grid-auto-rows:\s*1fr/);

    /* row 1 is the day-name strip and must stay `auto` — the DOW labels share this grid, so
       without it they take a week row's share and you get a 100px-tall "MON TUE WED" */
    expect(grid).toContain("grid-template-rows: auto");
  });

  it("⚠️ AND THE CELL CARRIES NO HEIGHT FLOOR — a floor on the cell is a floor on its row", () => {
    /* `.cal-cell` had `min-height: 104px`. Six of those plus the header block cannot fit a
       laptop, so the month scrolled however the grid was declared. Measured after removing it:
       zero overflow at every height from 900px down to 560px, week rows compressing 101 → 44px. */
    const cell = rule(calCss, ".cal-cell {");
    expect(cell).not.toMatch(/min-height:\s*\d+px/);
    expect(cell).toContain("min-height: 0");
    // and it clips tidily rather than spilling into its neighbour
    expect(cell).toContain("overflow: hidden");
  });
});

describe("⚠️ the Calendar's tool-row facet — the sidebar's filter, rehoused (P3)", () => {
  it("it exists, and it reads the ONE facet definition rather than a second label list", () => {
    expect(cal).toContain("cal-facetwrap");
    expect(cal).toContain("TODO_FACETS.map");
    expect(cal).not.toContain("FACET_LABEL"); // no per-page vocabulary
  });

  it("⚠️ ITS COUNTS ARE THE BOARD'S OWN — the two surfaces cannot state different numbers", () => {
    expect(cal).toContain("facetCounts(liveBoardCards(assembled.cols))");
  });

  it("the facet reaches the pips, the day lists AND the day sheet — all read byDay", () => {
    /* byDay is derived UNDER the facet, so narrowing cannot reach one surface and miss another;
       that is why the filter is applied at the derivation rather than at each render site. */
    expect(cal).toContain("userTasks: facet === \"all\" ? userTasks : []");
    expect(cal).toContain("dayData(ymd)");
  });

  it("the week view obeys the same lock — no zone, the grid still fills", () => {
    expect(cal).not.toContain("<TplZone");
    expect(cal).toContain('view === "month" ? 6 : 1'); // the row divisor follows the view
  });
});

describe("⚠️ the board's card spacing SURVIVES the conversion", () => {
  it("the zone wraps the grid — it does not sit between the body and its cards", () => {
    /* The pack's own instruction: if the scrollzone changes margin handling, the fix is the
       scrollzone and never the gap. P6's lane div is the precedent — a wrapper one level too
       deep killed `.tbd-body > .tbd-card` silently. The zone is OUTSIDE `.tbd` entirely. */
    const i = board.indexOf("<TplZone scrollRef={zoneRef}");
    expect(i).toBeGreaterThan(-1);
    const seg = board.slice(i, i + 500);
    expect(seg).toContain("<TodoBoard");
    // nothing is introduced between the board's body and its cards
    expect(seg).not.toContain("tbd-body");
  });
});

/* ── Phase 4: the Noteboard to standard ────────────────────────────────────────────────────── */

describe("⚠️ the Noteboard: no sidebar, masonry as the scrollzone, the empty slot", () => {
  const nbCss = readFileSync(join(here, "todoNoteboard.css"), "utf8");

  it("no sidebar (settled) — header, hairline, then full-width masonry", () => {
    expect(note).not.toContain("sidebar={");
    expect(note).not.toContain("TodoSideContainer");
  });

  it("the masonry is the zone, and it hems only when there are notes to continue into", () => {
    expect(note).toContain("<TplZone");
    expect(note).toContain("hem={notes.length > 0}");
  });

  it("the empty state carries its ArtSlot ABOVE the copy that was already written", () => {
    const empty = note.slice(note.indexOf("nb-empty"));
    expect(note.indexOf("nb-empty")).toBeGreaterThan(-1); // the anchor, per the slice law
    expect(empty.indexOf('<ArtSlot name="noteboard-empty"')).toBeGreaterThan(-1);
    // the art precedes the heading — a slot beneath the copy is a footnote, not an empty state
    expect(empty.indexOf('<ArtSlot name="noteboard-empty"'))
      .toBeLessThan(empty.indexOf("Nothing pinned yet"));
  });

  it("⚠️ 'READ AS A COLUMN' IS CENTRED and changes the columns, never the scroller", () => {
    const col = nbCss.slice(nbCss.indexOf(".nb-grid.column {"));
    expect(nbCss.indexOf(".nb-grid.column {")).toBeGreaterThan(-1);
    const rule = col.slice(0, col.indexOf("}"));
    expect(rule).toContain("columns: 1");
    expect(rule).toContain("margin-inline: auto");
    // one zone for both views — the toggle must not grow a second scroller
    expect((note.match(/<TplZone/g) ?? []).length).toBe(1);
  });

  it("the tool row's controls share ONE height — search, tag, view toggle, pink", () => {
    /* the shared 32px step; the pink creation action takes the layout's own 34px rule, which is
       the tool row's single exception and is asserted in tasksLayout.test.tsx */
    const search = nbCss.slice(nbCss.indexOf(".nb-search {"));
    expect(search.slice(0, search.indexOf("}"))).toContain("height: 32px");
    const calCssNav = readFileSync(join(here, "todoCalendar.css"), "utf8");
    const nav = calCssNav.slice(calCssNav.indexOf(".cal-nav {"));
    expect(nav.slice(0, nav.indexOf("}"))).toContain("height: 32px");
  });
});

/* ── Phase 5: Task settings, two doors ─────────────────────────────────────────────────────── */

describe("⚠️ ONE SHEET, TWO DOORS — and never a second copy of the settings UI", () => {
  const acct = readFileSync(join(here, "..", "AccountSettings.tsx"), "utf8");
  const sidebar = readFileSync(join(here, "TodoSideContainer.tsx"), "utf8");
  const sheet = readFileSync(join(here, "TaskSettingsSheet.tsx"), "utf8");

  it("door one: the board sidebar's foot, unchanged", () => {
    expect(sidebar).toContain("onOpenTaskSettings");
    expect(board).toContain("TODO_OPEN_TASK_SETTINGS");
  });

  it("door two: a Tasks section on the app Settings page", () => {
    expect(acct).toContain('{ id: "tasks", label: "Tasks"');
    expect(acct).toContain("tasks: tasksSection");
    expect(acct).toContain("TODO_OPEN_TASK_SETTINGS");
  });

  it("⚠️ BOTH DOORS OPEN THE SAME COMPONENT — the settings UI is written ONCE", () => {
    /* The Settings page must NOT re-render the four behaviours. Two forms would mean two places
       to change a default and two chances to disagree; the sheet writes `User.todoPrefs` through
       one path precisely so that cannot happen. */
    for (const behaviour of ["staleMonths", "goodDay", "rollForward", "weeklyBriefing"]) {
      expect(acct, behaviour).not.toContain(behaviour);
    }
    expect(acct).not.toContain("TODO_PREF_ROWS");
    expect(acct).not.toContain("todoPrefs(");
    // the sheet remains the one home for all four
    for (const behaviour of ["staleMonths", "goodDay", "rollForward", "weeklyBriefing"]) {
      expect(sheet, behaviour).toContain(behaviour);
    }
  });

  it("⚠️ THE ROUTE LANDS BEFORE THE EVENT — the sheet is hosted by the board", () => {
    /* Dispatching first would fire into a page that is not mounted, and the door would silently
       do nothing from /account. The account menu's existing door already works this way. */
    const sec = acct.slice(acct.indexOf("const tasksSection"));
    expect(acct.indexOf("const tasksSection")).toBeGreaterThan(-1); // the anchor
    expect(sec.indexOf('onNavigate("todo")')).toBeLessThan(sec.indexOf("TODO_OPEN_TASK_SETTINGS"));
  });

  it("no gear in any tool row — the doors are the two named places", () => {
    for (const [name, src] of [["Today", today], ["Calendar", cal], ["Noteboard", note]] as const) {
      expect(src, name).not.toContain("TODO_OPEN_TASK_SETTINGS");
    }
  });
});
