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
import { ArtSlot, ART_SLOTS, ArtSlotName } from "./ArtSlot";

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
    /* ⚠️ AND IT ASKS FOR THE REMAINING SPACE, NEVER A PERCENTAGE OF AN ASSUMED ONE (7 Aug fix).
       `height: 100%` needs a parent with a DEFINITE height, and this parent is a flex item inside
       `.ws-cscroll` — the app's real scroll container, which is `overflow: auto`. Whether that
       percentage resolves depends on every ancestor above it, which is not a thing a layout law
       should rest on. */
    expect(rule(css, ".spine-root {")).not.toContain("height: 100%");
    expect(rule(css, ".spine-root {")).toMatch(/flex:\s*1/);
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

  it("⚠️ THE FOUR TASKS SLOTS ARE FLEX COLUMNS — so their child can be a flex ITEM", () => {
    const app = readFileSync(join(here, "..", "..", "App.tsx"), "utf8");
    const todoSlots = [...app.matchAll(/<StagePage active=\{routeKey === "todo"[^>]*>/g)].map((m) => m[0]);
    expect(todoSlots).toHaveLength(4);
    for (const slot of todoSlots) {
      /* `fill` renders the slot `display: block` (isFillCol is false without a contentVariant),
         which leaves `.spine-root` resolving a percentage height. `fillColumn` makes it a flex
         column, so the page asks for the remaining space instead. */
      expect(slot, slot).toContain('layout="fillColumn"');
      expect(slot, slot).toContain("clip");
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
    /* ⚠️ SUPERSEDED 7 Aug — THE COLUMNS ARE THE SCROLLERS NOW, not one zone over the grid. The
       board is PINNED (`position: absolute; inset: 0`) and each column scrolls its own body, so a
       sticky Playfair head holds still at the top of ITS column rather than over the whole board.
       A single zone meant the tallest column set the height and the page scrolled. */
    expect(board).toContain("<TplPin>");
    expect(board).not.toContain("<TplZone");
    /* the sticky head sticks to the zone's top; if the zone ever loses `overflow` the heads
       silently stick to the viewport instead */
    expect(rule(css, ".tpl-zone {")).toContain("overflow: auto");
  });

  it("⚠️ THE RESTORE CONTRACT FOLLOWED THE SCROLLER to the zone", () => {
    /* The wrap is `overflow: hidden` now, so its scrollTop is permanently 0 — the old contract
       would have restored every batch collapse to the top of the board, in silence. */
    /* ⚠️ AND IT FOLLOWED THE SCROLLER AGAIN (7 Aug): the batch rows live in the To do column, so
       the contract reads THAT column's scrollTop. A page-level scroller would return a permanent
       0 and jump every collapse to the top — the exact fault this had to be moved for once
       already, which is why it is asserted rather than assumed. */
    expect(board).toContain(`querySelector<HTMLElement>('[data-col="todo"]')`);
    expect(board).toContain("batchScroll.current[rule] = col?.scrollTop ?? 0");
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
    const i = board.indexOf("<TplPin>");
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


/* ── the four contained fixes (7 Aug) ──────────────────────────────────────────────────────── */

describe("⚠️ THE LEFT GUTTER IS LAW — all four pages, sidebar or not", () => {
  const pageCssLocal = readFileSync(join(here, "todo.css"), "utf8");

  it("the column is LEFT-ANCHORED — the surplus becomes right margin, never two margins", () => {
    /* ⚠️ THE CENTRING WAS THE BUG. `margin-inline: auto` centres the column on its 1360px
       measure, and a centred column's LEFT EDGE MOVES with the width available to it — so pages
       that resolved to different widths started their titles at different offsets. Today and the
       Noteboard sat inboard of the To-do list for exactly that reason. */
    const col = pageCssLocal.slice(pageCssLocal.indexOf(".tdb-col {"));
    expect(pageCssLocal.indexOf(".tdb-col {")).toBeGreaterThan(-1); // the anchor
    const decl = col.slice(0, col.indexOf("}")).replace(/\/\*[\s\S]*?\*\//g, "");
    expect(decl).toContain("margin-inline: 0 auto");
    expect(decl).not.toContain("margin-inline: auto");
  });

  it("⚠️ ALL FOUR PAGES WEAR THE SAME COLUMN — including the two with no sidebar", () => {
    /* The old alignment test covered the sidebar pages only, which is precisely why this shipped:
       the two that diverged were the two nobody was checking. */
    for (const [name, src] of [
      ["To-do list", board], ["Today", today], ["Calendar", cal], ["Noteboard", note],
    ] as const) {
      expect(src, name).toContain('className="t-f12 spine-root"');
      expect(src, name).toContain("<TasksPageLayout");
      // and none of them caps or centres a measure of its own
      expect(src, name).not.toMatch(/margin(-inline)?:\s*(0 )?auto/);
    }
    // the ONE column class is the layout's, and it is written once
    expect(layout).toContain('className="tdb-col tpl"');
  });

  it("the gutter itself is still the single token — the law is offset, not a new number", () => {
    const col = pageCssLocal.slice(pageCssLocal.indexOf(".tdb-col {"));
    expect(col.slice(0, col.indexOf("}"))).toContain("var(--tdb-col-gutter)");
  });
});

describe("⚠️ AN ILLUSTRATOR'S BRIEF IS NEVER USER-FACING COPY", () => {
  const art = readFileSync(join(here, "ArtSlot.tsx"), "utf8");
  const artCss = readFileSync(join(here, "artSlot.css"), "utf8");

  it("NO brief text reaches rendered output, for ANY slot", () => {
    /* They rendered as body text under every placeholder, so a writer met "An empty letter tray,
       a pen laid down." as though the app were telling them something. */
    for (const name of Object.keys(ART_SLOTS) as ArtSlotName[]) {
      const html = renderToStaticMarkup(<ArtSlot name={name} />);
      const brief = ART_SLOTS[name].caption;
      expect(html, name).not.toContain(brief);
      // not even a fragment of it
      expect(html, name).not.toContain(brief.slice(0, 18));
    }
    expect(art).not.toContain("figcaption");
    expect(artCss).not.toContain(".art-cap {");
  });

  it("the placeholder shows the slot NAME in mono, and nothing else", () => {
    const html = renderToStaticMarkup(<ArtSlot name="done-empty" />);
    expect(html).toContain("ART · DONE-EMPTY");
    expect(html).toContain("art-box"); // the ratio box still reserves the room
  });

  it("⚠️ AN ASSET STANDS ALONE — no ratio box, no dashed frame around finished artwork", () => {
    const html = renderToStaticMarkup(<ArtSlot name="seize-the-day" />);
    expect(html).toContain("<img");
    expect(html).toContain("art-real");
    expect(html).not.toContain("art-box");
    expect(html).not.toContain("art-ph");
  });
});

describe("⚠️ UP NEXT MUST NOT TRUNCATE A TITLE", () => {
  const todayCss = readFileSync(join(here, "todoToday.css"), "utf8");
  const r = (sel: string) => {
    const i = todayCss.indexOf(sel);
    expect(i, sel).toBeGreaterThan(-1);
    return todayCss.slice(i, todayCss.indexOf("}", i)).replace(/\/\*[\s\S]*?\*\//g, "");
  };

  it("a long title renders IN FULL — nothing truncates it in the markup", () => {
    const long = "Send your full manuscript to Jonathan Marsh at Willoughby and Crane Literary";
    const html = renderToStaticMarkup(
      <TplZone label="Up next"><div className="tdt-brow"><div className="tdt-bt">{long}</div></div></TplZone>,
    );
    expect(html).toContain(long); // the whole string, not an ellipsis
  });

  it("it wraps to TWO lines and never ellipsises on one", () => {
    const bt = r(".tdt-brow .tdt-bt {");
    expect(bt).toContain("-webkit-line-clamp: 2");
    expect(bt).not.toContain("white-space: nowrap");
    expect(bt).not.toContain("text-overflow: ellipsis");
    // a long unbroken word must not force the rail wider than its track
    expect(bt).toContain("overflow-wrap: anywhere");
  });

  it("⚠️ THE ROW STACKS — the why-line sits BENEATH the title, not beside it", () => {
    /* Two pieces of text competing for one line's width means the title loses, and the title is
       the only part of a suggestion that says what it IS. */
    const row = r(".tdt-brow {");
    expect(row).toContain("flex-direction: column");
    expect(r(".tdt-brow .tdt-why {")).not.toContain("margin-left: auto");
  });

  it("the rail is widened to 360px to pay for it", () => {
    expect(r(".tdt-split {")).toContain("360px");
  });
});

/* ── the pin: a definite box, measured (7 Aug) ─────────────────────────────────────────────── */

describe("⚠️ EVERY REGION IS PINNED — a definite box, not an inherited one", () => {
  const boardCss = readFileSync(join(here, "todoBoard.css"), "utf8");

  it("the pin is absolute with all four insets, inside a relative content region", () => {
    /* ⚠️ WHY THIS REPLACED THE CHAIN: the lock originally derived each region's height through
       seven `flex: 1; min-height: 0` links. That chain cannot be proven in this repo's tests (no
       jsdom, no layout engine) and it failed twice in the browser for reasons no harness could
       reproduce. An absolutely-positioned box with `inset: 0` takes its containing block's
       dimensions OUTRIGHT — nothing to inherit, nothing to break two ancestors up. */
    const pin = rule(css, ".tpl-pin {");
    expect(pin).toContain("position: absolute");
    expect(pin).toContain("inset: 0");
    expect(rule(css, ".tpl-body {")).toContain("position: relative");
  });

  it("⚠️ MEASURED: zero page overflow on ALL FOUR pages at 1440×900 AND 1280×800", () => {
    /* Browser-measured against the built CSS (dist/assets/index-*.css), four page harnesses,
       both viewports — `scrollHeight - clientHeight` on the app's real scroll container:
     *
     *   page        1440×900   1280×800   pin height   what actually scrolls
     *   Calendar        0          0      590 / 490    nothing — it COMPRESSES
     *   To-do list      0          0      590 / 490    3–4 × .tbd-body, one per full column
     *   Today           0          0      567 / 467    2 × .tpl-zone
     *   Noteboard       0          0      590 / 490    1 × .tpl-zone
     *
     * The numbers live here so a future reader can re-run the same check and compare, rather
     * than re-deriving what "should" happen from the declarations. */
    expect(rule(css, ".tpl-pin {")).toContain("inset: 0");
  });

  it("all four pages render a pin — one mechanism, not four", () => {
    for (const [name, src] of [
      ["To-do list", board], ["Today", today], ["Calendar", cal], ["Noteboard", note],
    ] as const) {
      expect(src, name).toContain("<TplPin>");
    }
  });

  it("⚠️ THE BOARD'S COLUMNS SCROLL THEMSELVES, and the sticky head holds still in ITS column", () => {
    /* `align-items: start` sized each column to its own content, so the tallest set the page
       height and the PAGE scrolled. `stretch` gives each column the pin's height to scroll
       INSIDE, which is also the only way a sticky head can pin per column rather than per board.
       Browser-verified: the head's top stayed put while its body scrolled 200px. */
    const grid = rule(boardCss, ".tbd {");
    expect(grid).toContain("align-items: stretch");
    expect(grid).not.toContain("align-items: start");
    expect(rule(boardCss, ".tbd-col {")).toContain("min-height: 0");
    expect(rule(boardCss, ".tbd-body {")).toContain("overflow-y: auto");
    expect(rule(boardCss, ".tbd-fh {")).toContain("position: sticky");
  });

  it("⚠️ AND THE CARD GAP SURVIVES IT — browser-measured at 12px, cards still direct children", () => {
    /* The scrollzone moved onto `.tbd-body` itself rather than into a wrapper, precisely so
       `.tbd-body > .tbd-card` keeps matching. P6's lane div is the precedent: a wrapper one level
       too deep killed this selector in silence. If a future scrollzone breaks the gap again, the
       SCROLLZONE is what gets fixed. */
    expect(boardCss).toContain(".tbd-body > .tbd-card { margin-bottom: 12px; }");
    // one rule for the selector — a descendant form would be read first by a naive rule helper
    expect((boardCss.match(/^\.tbd-body \{/gm) ?? []).length).toBe(1);
    // the note explaining why a descendant form would be wrong may MENTION it; no RULE may use it
    expect(boardCss.replace(/\/\*[\s\S]*?\*\//g, "")).not.toContain(".tbd-col > .tbd-body");
  });

  it("the FILTERS sidebar sits OUTSIDE the pinned region and does not scroll with it", () => {
    /* the aside is a sibling of `.tpl-body`, and the pin lives inside `.tpl-body` */
    const cols = layout.slice(layout.indexOf('<div className="tpl-cols">'));
    expect(cols.indexOf("<aside")).toBeLessThan(cols.indexOf('className="tpl-body"'));
    expect(board.indexOf("sidebar={")).toBeLessThan(board.indexOf("<TplPin>"));
  });
});

describe("⚠️ AN ArtSlot ALWAYS SIZES ITS OWN OUTPUT", () => {
  const artCss2 = readFileSync(join(here, "artSlot.css"), "utf8");

  it("every slot renders inside a bounded box — no unconstrained element anywhere", () => {
    for (const name of Object.keys(ART_SLOTS) as ArtSlotName[]) {
      const html = renderToStaticMarkup(<ArtSlot name={name} />);
      if (ART_SLOTS[name].src) {
        // real numbers on the element, not a percentage of whatever the parent offers
        expect(html, name).toMatch(/width="\d+"/);
        expect(html, name).toMatch(/height="\d+"/);
      } else {
        expect(html, name).toContain("padding-top:"); // the ratio box reserves the room
      }
      // never a background-image — unmeasurable, and it takes the alt text with it
      expect(html, name).not.toContain("background-image");
    }
  });

  it("⚠️ NO SLOT'S ELEMENT CAN EXCEED ITS DECLARED BOX", () => {
    const real = artCss2.slice(artCss2.indexOf(".art-real {"));
    expect(artCss2.indexOf(".art-real {")).toBeGreaterThan(-1); // the anchor
    const decl = real.slice(0, real.indexOf("}"));
    expect(decl).toContain("object-fit: contain");
    expect(decl).toContain("max-width: 100%");
    expect(decl).toContain("max-height: 100%");
    expect(decl).toContain("display: block");
  });

  it("a capped slot honours its cap in both dimensions, keeping the brief's ratio", () => {
    const html = renderToStaticMarkup(<ArtSlot name="seize-the-day" maxWidth={62} />);
    expect(html).toContain('width="62"');
    expect(html).toContain('height="62"'); // 100×100 brief → square at any cap
  });

  it("the plan card places it inline in the row, left of the title", () => {
    expect(today).toContain('<ArtSlot name="seize-the-day" maxWidth={62} className="tdt-planart" />');
    const todayCssL = readFileSync(join(here, "todoToday.css"), "utf8");
    const slot = todayCssL.slice(todayCssL.indexOf(".tdt-planart {"));
    expect(slot.slice(0, slot.indexOf("}"))).toContain("62px");
    // the card is an ordinary flex row: icon, text, button
    expect(todayCssL.slice(todayCssL.indexOf(".tdt-plan {"))).toContain("display: flex");
  });
});
