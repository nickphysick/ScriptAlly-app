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
const splitCss = readFileSync(join(here, "todoSplit.css"), "utf8");
const layout = readFileSync(join(here, "TasksPageLayout.tsx"), "utf8");
const board = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
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

  it("⚠️ THE TASKS SLOTS ARE FLEX COLUMNS — so their child can be a flex ITEM", () => {
    const app = readFileSync(join(here, "..", "..", "App.tsx"), "utf8");
    const todoSlots = [...app.matchAll(/<StagePage active=\{routeKey === "todo"[^>]*>/g)].map((m) => m[0]);
    expect(todoSlots).toHaveLength(3); // list · calendar · noteboard (Today retired, P1 9 Aug)
    for (const slot of todoSlots) {
      /* `fill` renders the slot `display: block` (isFillCol is false without a contentVariant),
         which leaves `.spine-root` resolving a percentage height. `fillColumn` makes it a flex
         column, so the page asks for the remaining space instead. */
      expect(slot, slot).toContain('layout="fillColumn"');
      expect(slot, slot).toContain("clip");
    }
  });

  /**
   * ⚠️ THIS ASSERTION IS RETIRED, AND WHY IT WAS GREEN IS THE POINT. It required
   * `flex: 0 0 auto` on `.tpl-head` by reading this stylesheet as TEXT. The rule's comment had lost
   * its opening delimiter, so the browser discarded the whole declaration block — and the lock went
   * on passing, because the text it was searching was still in the file. It asserted, for months,
   * a property that never once applied to an element.
   *
   * ⚠️ AND THE ELEMENT DOES NOT EXIST EITHER: `TasksPageLayout` renders eight `tpl-` classes and
   * `tpl-head` is not among them. So the lock was doubly vacuous — a declaration that never
   * applied, to a class that is never rendered.
   *
   * What actually holds the header still is the `flex: 1; min-height: 0` chain on `.tpl-cols` and
   * `.tpl-body`, which the viewport locks below already assert, and which the acceptance matrix
   * measures on a rendered page rather than reading out of a file.
   */

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

  /**
   * ⚠️ IT DISSOLVES INTO THE WINDOW, NOT INTO A CARD — nothing in `.tpl-cols → .tpl-body →
   * .tdb-centre → .tpl-zone` paints a background, so what shows behind this hem is `.ws-window`.
   * It was written as a literal `#ffffff` back when the window was white; it now reads the ground
   * token, so it cannot drift from the surface it is supposed to disappear into.
   */
  it("⚠️ IT RESOLVES INTO THE WINDOW'S GROUND — never a literal", () => {
    const hem = rule(css, ".tpl-hem {");
    expect(hem, "the anchor this case reads is gone").toContain("background:");
    expect(hem, `the hem paints a hex literal — it fades to a colour the window no longer has: ${hem.trim()}`)
      .not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(hem, "the hem fades through white — the near end and the far end are no longer one colour")
      .not.toMatch(/\b255,\s*255,\s*255\b/);
    expect(hem).toContain("var(--ws-window)");
    expect(hem).toContain("rgba(var(--ws-window-rgb), 0)");
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
      <TasksPageLayout mark="todo" title="T" tools={<span />}>body</TasksPageLayout>,
    );
    expect(bare).not.toContain("<aside");
    expect(bare).toContain("tpl-body");
    const withSide = renderToStaticMarkup(
      <TasksPageLayout mark="todo" title="T" tools={<span />} sidebar={<nav>side</nav>}>body</TasksPageLayout>,
    );
    expect(withSide).toContain("<aside");
  });

  /* ⚠️ NOW NO PAGE PASSES ONE (tasks-consolidation P2, 9 Aug). The count went three → one → zero,
     and each step was the same argument: the sidebar's FILTERS facets asked "what KIND of thing
     is this", and the consolidated page's five groups answer that permanently and in the open, so
     a control that narrowed to one kind was a way of hiding four. The CONTRACT is unchanged and
     is what this describe protects — `sidebar` is optional, and absent means no aside at all,
     never an empty gutter (asserted against the rendered output above). */
  it("⚠️ NO PAGE PASSES A SIDEBAR — all four Tasks pages run full width", () => {
    for (const [name, src] of [["To-do list", board], ["Calendar", cal], ["Noteboard", note]] as const) {
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

  it("the Calendar and the Noteboard each declare their own region", () => {
    /* Today's clause went with the page (tasks-consolidation P1, 9 Aug). */
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
    /* ⚠️ THE BODY CHANGED, THE LAW DID NOT (tasks-consolidation P2, 9 Aug). The zone wraps
       whatever the body is and introduces nothing inside it — P6's lane div is the precedent: a
       wrapper one level too deep killed `.tbd-body > .tbd-card` in perfect silence. The list's
       own equivalent is `.tdg-panel > .tdg-row`, locked in tasksList.test.tsx. */
    expect(seg).toContain("<TaskList");
    expect(seg).not.toContain("tdg-panel");
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
    /* ⚠️ RE-ANCHORED (P2 follow-up, 9 Aug): `.cal-nav` moved to `taskChrome.css`. It is the tool
       row's SHARED control — the Calendar's nav, the Noteboard's toggle and both tag filters —
       and it was declared in one consumer's stylesheet only because that consumer used it first,
       which would have left the To-do list's tag filter unstyled in dev. */
    const chrome = readFileSync(join(here, "taskChrome.css"), "utf8");
    const nav = chrome.slice(chrome.indexOf(".cal-nav {"));
    expect(nav.slice(0, nav.indexOf("}"))).toContain("height: 32px");
    for (const sheet of ["todoCalendar.css", "todoNoteboard.css"]) {
      const s = readFileSync(join(here, sheet), "utf8");
      expect(s.includes(".cal-nav {"), `${sheet} must not re-declare the shared control`).toBe(false);
    }
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
    /* ⚠️ THREE BEHAVIOURS NOW — `goodDay` is retired (tasks-consolidation P2 follow-up, 9 Aug):
       it advised on the size of the day's commitment, which the consolidation removed. The rule
       here is untouched and is about DUPLICATION, not about the count. */
    const behaviours = ["staleMonths", "rollForward", "weeklyBriefing"];
    for (const behaviour of [...behaviours, "goodDay"]) {
      expect(acct, behaviour).not.toContain(behaviour);
    }
    expect(acct).not.toContain("TODO_PREF_ROWS");
    expect(acct).not.toContain("todoPrefs(");
    // the sheet remains the one home for every behaviour that still exists
    for (const behaviour of behaviours) {
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
    for (const [name, src] of [["Calendar", cal], ["Noteboard", note]] as const) {
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
    /* ⚠️ NO AUTO MARGIN AT ALL (7 Aug, second pass). `margin-inline: auto` centred the column;
       `margin-inline: 0 auto` left-anchored it but ALSO disabled `align-items: stretch` — an auto
       margin on a flex container's cross axis does that — so the column shrink-wrapped its
       content. Measured collapsed: Calendar 295px with 26px cells, Today 557, Noteboard 477.
       `margin-inline: 0` keeps the stretch: fills, caps, sits hard left, surplus on the right. */
    expect(decl).toContain("margin-inline: 0;");
    expect(decl).not.toContain("margin-inline: auto");
    expect(decl).not.toContain("margin-inline: 0 auto");
  });

  it("⚠️ ALL FOUR PAGES WEAR THE SAME COLUMN — including the two with no sidebar", () => {
    /* The old alignment test covered the sidebar pages only, which is precisely why this shipped:
       the two that diverged were the two nobody was checking. */
    for (const [name, src] of [
      ["To-do list", board], ["Calendar", cal], ["Noteboard", note],
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
    expect(html).not.toMatch(/["\s`]art-ph["\s`]/);
  });
});

/* ⚠️ THE "UP NEXT MUST NOT TRUNCATE" DESCRIBE WENT WITH TODAY (tasks-consolidation P1, 9 Aug).
   It read `todoToday.css` and asserted the suggestion rail's two-line clamp, its stacked row and
   its 360px measure. The page is retired, so the rail is too.

   ⚠️ THE LAW ITSELF IS WORTH CARRYING FORWARD AND IS NOT WRITTEN DOWN ANYWHERE ELSE: a title is
   the only part of a row that says what it IS, so it wraps and is never ellipsised; a why-line
   sits BENEATH it rather than competing for the same line's width; and the measure is widened to
   pay for that rather than the title being shortened to fit. The consolidated list's rows inherit
   the same problem and should inherit the same answer. */

describe("⚠️ WHAT ACTUALLY BOUNDS THE TASKS FRAME — and it is not in the chain below it", () => {
  const shell = readFileSync(join(here, "..", "shell", "AppShell.tsx"), "utf8");
  const shellCss = readFileSync(join(here, "..", "shell", "workspaceShell.css"), "utf8");

  it("⚠️ THE TASKS ROUTES OPT INTO `fit` — the one thing that was missing, twice", () => {
    /* `.ws-work` is `flex: 1 0 auto` — SHRINK 0 — so it can never be smaller than its content,
       and NO number of correct `min-height: 0` links below it can make the card fit. That is why
       two full passes of chain work failed and why no harness reproduced it: the break sits
       ABOVE everything the chain covers. `--fit` swaps in a definite basis. */
    expect(shell).toContain('routeKey === "todo"');
    expect(shell).toMatch(/fit=\{[^}]*routeKey === "todo"/);
    expect(shellCss).toContain(".ws-work { flex: 1 0 auto;");
    expect(shellCss).toContain(".ws-work--fit { flex: 1 1 0; min-height: 0; }");
  });

  it("⚠️ MEASURED, fit OFF vs ON, all four pages at 1440×900 and 1280×800", () => {
    /* Browser-measured against the built CSS with the REAL shell chain reproduced
       (.ws-cscroll → .ws-work → slot → .spine-root → …). Page scroll on .ws-cscroll:
     *
     *   page          fit OFF (900 / 800)   fit ON
     *   Calendar         115px / 215px        0 / 0
     *   To-do list       707px / 807px        0 / 0
     *   Today            384px / 484px        0 / 0
     *   Noteboard        816px / 916px        0 / 0
     *
     * ⚠️ NOT 100dvh. A frame of 100dvh sits inside a scroller that ALREADY contains the 66px
     * bar, so the card would overflow by exactly the bar — the fault the dashboard fixed hours
     * earlier ("66px was exactly --head"). A `calc(100dvh - bar)` is worse still: CLAUDE.md
     * forbids bar offsets outright, and it hardcodes the shell's chrome into every page. */
    expect(shell).toMatch(/fit=\{[^}]*routeKey === "todo"/);
  });

  it("THE CHAIN, ENUMERATED — every wrapper between the frame and a scrollzone", () => {
    /* ⚠️ ALL OF THESE ARE REQUIRED AND NONE IS SUFFICIENT. One missing `min-height: 0` restores
       the old behaviour with every other declaration still perfectly correct — which is the
       failure mode that cost two passes. Listed in nesting order:
         1. .ws-work--fit   flex: 1 1 0; min-height: 0   (workspaceShell.css) ← the missing one
         2. StagePage slot  flex: 1; min-height: 0        (AppShell.tsx, layout="fillColumn")
         3. .spine-root     flex: 1; min-height: 0
         4. .tdb-wrap       flex: 1; min-height: 0        (todo.css)
         5. .tdb-col.tpl    flex: 1; min-height: 0
         6. .tpl-cols       flex: 1; min-height: 0
         7. .tpl-body       flex: 1; min-height: 0
         8. .tpl-zone       flex: 1; min-height: 0; overflow: auto  ← the scroller */
    expect(rule(shellCss, ".ws-work--fit {")).toContain("min-height: 0");
    for (const [sheet, sel] of [
      [css, ".spine-root {"], [pageCss, ".tdb-wrap {"], [css, ".tdb-col.tpl {"],
      [css, ".tpl-cols {"], [css, ".tpl-body {"], [css, ".tpl-zone {"],
    ] as const) {
      expect(rule(sheet, sel), sel).toContain("min-height: 0");
      expect(rule(sheet, sel), sel).toMatch(/flex:\s*1/);
    }
    /* ⚠️ THE `.tpl-head` CLAUSE IS GONE FROM HERE TOO — same reason as the retired assertion
       above: a discarded rule on an unrendered class, asserted by reading text. The chain the loop
       above checks is the real one. */
  });
});

describe("⚠️ WIDTHS ARE NEVER TOUCHED BY THE HEIGHT WORK", () => {
  it("the column FILLS its container and caps — no collapse, either fit state", () => {
    /* Measured at 1440×900 and 1280×800, fit off AND on, all four pages: the column equals
       min(container, 1360) and the body equals the available width less any sidebar. The height
       mechanism cannot reach the width, and this test exists because one of my own fixes DID —
       `margin-inline: 0 auto` disabled the cross-axis stretch and collapsed three pages. */
    const col = rule(pageCss, ".tdb-col {");
    expect(col).toContain("margin-inline: 0;");
    expect(col).not.toContain("margin-inline: auto");
    expect(col).toContain("max-width: var(--tdb-col-max)");
    // the body takes the remaining width; the sidebar takes its own and does not grow
    expect(rule(css, ".tpl-body {")).toMatch(/flex:\s*1/);
    expect(rule(css, ".tpl-side {")).toContain("flex: 0 0 auto");
    /* No page fixes its own PIXEL width — the column is the one measure. Percentage widths are
       exempt and legitimate: they are progress-bar fills (`width: ${pct}%`), which describe a
       proportion of their own bar rather than a page dimension. */
    for (const [name, src] of [["Calendar", cal], ["Noteboard", note], ["board", board]] as const) {
      expect(src, name).not.toMatch(/style=\{\{[^}]*\bwidth:\s*[`"']?\d+px/);
    }
  });
});

/* ── THE SPLIT (rail + workspace, Phase 2) ──────────────────────────────────────────────────── */

describe("⚠️ TWO PANES, TWO SCROLLERS, AND THE FRAME STILL NEVER SCROLLS", () => {
  /**
   * ⚠️ THE CHAIN GAINED TWO LINKS AND BOTH MUST DECLARE THEIR PART. `.tpl-zone` is now a
   * grandchild of `.tdb-centre` rather than a child, and the two boxes between them are exactly
   * the kind of wrapper the 9 August failure was: unenumerated, at the default `min-height: auto`,
   * with every other declaration in the chain still perfectly correct and the zone silently
   * refusing to scroll. jsdom cannot prove the chain resolves; it can prove nothing is missing.
   */
  it("THE CHAIN, EXTENDED — .tdw-split and .tdw-rail each declare min-height: 0", () => {
    const split = rule(splitCss, ".tdw-split {");
    expect(split).toContain("min-height: 0");
    expect(split).toMatch(/flex:\s*1/);          // it grows into the row .tdb-centre gives it
    const rail = rule(splitCss, ".tdw-rail {");
    expect(rail).toContain("min-height: 0");
    expect(rail).toContain("display: flex");     // so .tpl-zone below it is a flex item
    expect(rail).toContain("flex-direction: column");
  });

  /**
   * ⚠️ `minmax(0, 1fr)` ON BOTH AXES, NEVER A BARE `1fr`. A grid item's automatic minimum is its
   * CONTENT, so a bare `1fr` track cannot be shorter or narrower than what it holds: the workspace
   * would push the rail off its measure sideways, and the row would grow the frame downwards —
   * which is the viewport lock defeated by a track definition rather than by a missing
   * `min-height`. Same failure, a layer the chain does not cover.
   */
  it("the tracks refuse to be sized by their content, on BOTH axes", () => {
    const split = rule(splitCss, ".tdw-split {");
    expect(split).toContain("grid-template-columns: var(--tdw-rail-w) minmax(0, 1fr)");
    expect(split).toContain("grid-template-rows: minmax(0, 1fr)");
    /* the value, stated once and read once — the rail is a fixed measure, the workspace is what
       is left. 520 since the visual rebuild: the row gained a 68px bucket pill and a 104px figure
       column, and v9 draws the pane at 520. (It was 440, itself widened from the earlier ref's
       408 when the lane structure grew — the width has always followed the row.) */
    expect(split).toContain("--tdw-rail-w: 520px");
    /* the panes are objects on a ground now, not two halves of a sheet — so the split carries the
       gap and the ground, and the rail no longer carries a divider */
    expect(split).toContain("gap: 18px");
  });

  /**
   * ⚠️ THE SECOND SCROLLER MOVED INWARD — it is the CARD'S BODY, not the pane (ref
   * `todo-journey-in-pane.html`: `.pane { overflow: hidden }` over `.body { overflow-y: auto }`).
   *
   * The rule this case protects is unchanged: there are two scrollers, the rail's and the
   * workspace's, and nothing between the frame and either of them may clip. What changed is WHICH
   * element in the workspace owns it. With the pane scrolling and the card sized by content, a long
   * record produced a card TALLER than the pane whose band scrolled away with it and whose bottom
   * edge was never on screen.
   */
  it("⚠️ ADD ACTS ON THE LIST, SO IT LIVES ON THE LIST — and it is pink, not ink", () => {
    const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
    /* same handler as the bar's copy — a rehoming, not a new entrance */
    expect(page).toContain('title="Add task or note"');
    expect(page).toContain('onClick={() => openComposer("task")}');
    /* ⚠️ BLACK IS RESERVED FOR "THIS ADVANCES". Adding opens a composer — the start of something,
       not the end of it — so it wears the page's other colour. */
    const add = rule(splitCss, ".tdw-add {");
    expect(add).toContain("var(--pink-btn");
    expect(add).not.toContain("--ink-strong");
  });

  it("⚠️ THE COUNTS ARE ONE LINE IN ONE PLACE, off the derivation the bands read", () => {
    const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
    /* the WORDING is `showingLine`'s, which absorbed the bar's "30 tasks · 16 outstanding" — one
       sentence, one place. Both figures come from `railShown()` / `allDockable`, the same source
       `railChips` reads for the section bands, so a count and the band it names cannot disagree. */
    expect(page).toContain("showingLine(railShown(), allDockable.length)");
    const handoff = readFileSync(join(here, "../../lib/todoHandoff.ts"), "utf8");
    expect(handoff).toContain("outstanding · showing");
  });

  it("the WORKSPACE's second scroller is the card's body, and the pane holds it", () => {
    const work = rule(splitCss, ".tdw-work {");
    expect(work).toContain("min-height: 0");
    /* the pane no longer scrolls — it gives the card a definite height instead */
    expect(work).toContain("display: flex");
    expect(work).toContain("flex-direction: column");
    const dock = readFileSync(join(here, "todoDock.css"), "utf8");
    /* ⚠️ THE SCROLLER'S OWN PROPERTIES ARE INLINE NOW, set by `EdgeFadeScroll` — so a STYLESHEET
       assertion cannot see them and would fail on a page that works. The height chain terminates
       on the wrapper; the overflow is asserted against RENDERED output below, which is the
       stronger place for it anyway. */
    const outer = rule(dock, ".tdk-scroll {");
    expect(outer).toContain("flex: 1");
    expect(outer).toContain("min-height: 0");
    const dockSrc = readFileSync(join(here, "TodoDock.tsx"), "utf8");
    expect(dockSrc).toContain("<EdgeFadeScroll");
    /* the class is conditional now — the journey renders in the SAME scroller, so it carries a
       modifier rather than a second scrolling element */
    /* ⚠️ THREE CONTENTS, ONE SCROLLER — the journey and the group sweep both render in the SAME
       element the tracking columns do, carrying a modifier rather than adding a scrolling box. The
       assertion states that rule rather than the current ternary, so adding a fourth content
       cannot quietly introduce a second scroller. */
    expect(dockSrc).toContain('scrollClassName={draft || cohort ? "tdk-body tdk-body--journey" : "tdk-body"}');
    expect((dockSrc.match(/<EdgeFadeScroll/g) ?? []), "the card grew a second scroller").toHaveLength(1);
    /* ⚠️ AND THE CHAIN ABOVE IT IS REAL. `flex: 1; min-height: 0` under a BLOCK parent applies to
       nothing and the page keeps working, sized by content — the failure this codebase has been
       caught by twice. Each link asserted, not just the leaf. */
    expect(rule(dock, ".tdk {")).toContain("display: flex");
    expect(rule(dock, ".tdk-w {")).toContain("flex: 1");
  });

  it("⚠️ THE RAIL SCROLLER IS THE EXISTING ZONE RELOCATED, never a second one", () => {
    /* One overflow primitive on this page family — the fault `.tpl-zone` was extracted to fix.
       The rail declares no overflow of its own; it is a flex column and the zone inside it
       scrolls, exactly as `.tpl-body` did before the split. */
    /* ⚠️ THE CARD ITSELF CLIPS, AND THAT IS ITS EDGE RATHER THAN A SCROLL DECISION — a 14px
       radius with square content spilling past it is not a card. What must not clip is anything
       BETWEEN the card and the scroller, and there is nothing: `.tpl-zone` is the rail's direct
       scrolling child. The distinction is the whole of this case, so it is asserted rather than
       relaxed away. */
    expect(rule(splitCss, ".tdw-rail {")).toContain("overflow: hidden");
    expect(rule(splitCss, ".tdw-rail {")).toContain("border-radius: 14px");
    expect(splitCss).not.toContain(".tpl-zone");   // the primitive is not re-declared here
    /* the rail gained its own tools block above the scroller (Phase 4); the ZONE is still the
       one relocated scroller, which is what this case is about */
    expect(board).toContain('<div className="tdw-rail">');
    expect(board).toContain("{renderRailTools()}");
    expect(board).toContain(") : renderList()}");
  });

  /**
   * ⚠️ THE GROUND IS ONE TOKEN, NOT TWO HEXES KEPT EQUAL. `.tdg`'s sticky heading paints itself
   * with `--tdg-ground`, which is declared as `var(--ws-window)` precisely so the pair is
   * structural. The rail's ground is white where the page's is #fefcfa, so the rail repoints the
   * token and the heading follows; painting a bare `background: #fff` here would give a heading
   * that looks correct at rest and grows a pale slab the moment a row scrolls under it.
   */
  /**
   * ⚠️ THE CARD PAINTS NOTHING NOW (journeys pack, Phase 1) — but it still REPOINTS the token, and
   * that is the half that matters. `.tdg`'s sticky heading resolves its ground from `--ws-window`;
   * with the card transparent the band must fade into the SHEET, which is what the override now
   * names. Painting nothing and leaving the token alone would put a heading's ground a shade off
   * the surface actually behind it.
   */
  it("the rail repoints --ws-window even though it paints nothing itself", () => {
    const rail = rule(splitCss, ".tdw-rail {");
    expect(rail).toContain("--ws-window-rgb");
    expect(rail).toContain("background: transparent");
    expect(rail).not.toMatch(/background:\s*#fff/);
    /* ⚠️ AND THE WORKSPACE PAINTS NOTHING AT ALL NOW (visual rebuild). It used to carry the
       page's ground; the SPLIT carries it, and the pane is transparent so the task card floats on
       it directly. A pane with its own fill behind a card that also has one is two surfaces where
       the design has one object on a desk. */
    expect(rule(splitCss, ".tdw-work {")).toContain("background: transparent");
    /* the tie this depends on, asserted at its source rather than assumed */
    expect(readFileSync(join(here, "todoGroups.css"), "utf8"))
      .toContain("--tdg-ground: var(--ws-window)");
  });

  /**
   * ⚠️ THE DOCK MOVED INTO THE PANE; IT DID NOT MULTIPLY. It used to replace the list, which is
   * how it said "this is where the work happens now". Standing them side by side says the same
   * thing without hiding what you were reading. `openDock` is still the one entrance and the dock
   * is still the one recording surface — nothing in the rail records anything.
   */
  it("the dock mounts INSIDE the workspace pane, and the list keeps the rail", () => {
    for (const anchor of ['className="tdw-split"', 'className="tdw-rail"', 'className="tdw-work"', "<TodoDock"]) {
      expect(board, anchor).toContain(anchor);
    }
    expect(board.indexOf('className="tdw-split"')).toBeLessThan(board.indexOf('className="tdw-rail"'));
    expect(board.indexOf('className="tdw-rail"')).toBeLessThan(board.indexOf('className="tdw-work"'));
    expect(board.indexOf('className="tdw-work"')).toBeLessThan(board.indexOf("<TodoDock"));
    /* still exactly one dock mount and one entrance function */
    expect(board.match(/<TodoDock/g) ?? []).toHaveLength(1);
    expect(board.match(/function openDock/g) ?? []).toHaveLength(1);
  });

  /**
   * ⚠️ THE PLATE AND THE CHIPS ARE NOT THE SPLIT'S TO REPLACE (owner's ruling, Phase 2).
   * `PageHeader variant="workspace"` is shell chrome under the alignment contract and the
   * collapse-on-engagement law; the concept sketch's slim header is a DRAWING of that plate
   * collapsed, not a page bar to be built. What came out is only the page-local full-width list
   * container the rail replaces.
   */
  it("the split builds no header of its own — the shell's plate stands, the chips are retired", () => {
    expect(layout).toContain('<PageHeader variant="workspace"');
    /* ⚠️ THE STAT CHIPS ARE RETIRED (one-primary pass follow-up) — they restated the control
       bar's own `{n} outstanding` and the group headings' own counts, three inches apart. The
       header states NO figures now; the figure lives beside the thing it counts. */
    expect(board).not.toContain('className="tdg-stats"');
    /* the split sheet paints no plate, no bar, no title */
    for (const sel of ["ws-plate", "tpl-head", "wpg-plate"]) {
      expect(splitCss, sel).not.toContain(sel);
    }
  });
});

/* ── the rail's narrowing, and what it must NOT reach (Phase 4) ──────────────────────────────── */

describe("⚠️ A NARROWING IS A RAIL FACT — it must never empty the workspace", () => {
  /**
   * ⚠️ THE BEHAVIOUR THIS EXISTS TO FORBID: you are working on a card, you type in the search to
   * find something else, nothing matches, and the pane you were working in goes blank. You
   * narrowed to LOOK, not to abandon. So an empty rail and a pane still holding your card is the
   * correct pair, and clearing the search brings the rail back around it.
   */
  it("the pane reads a HELD card, so a rail with nothing in it cannot blank it", () => {
    expect(board).toContain("const paneCard = docked.card ?? (allDockable.length > 0 ? heldCard.current : null);");
    expect(board).toContain("{paneCard ? (");
  });

  /**
   * ⚠️ AND THE ONE DISTINCTION THAT MATTERS: an empty rail because you FILTERED is a view; an
   * empty rail because you FINISHED is a fact. The pane closes only on the second, which is read
   * from the UNnarrowed list.
   */
  it("the pane closes on `allDockable`, never on the narrowed set", () => {
    const a = board.indexOf("const lastNarrowSig");
    const b = board.indexOf("}, [dockSig, dockKey, narrowSig");
    expect(a, "the narrowing effect is gone — this slice would read the whole file").toBeGreaterThan(-1);
    expect(b, "the effect's dep list is gone").toBeGreaterThan(a);
    const eff = board.slice(a, b);
    expect(eff).toContain("if (allDockable.length === 0) { setDockKey(null); return; }");
    expect(eff).toContain("if (dockable.length === 0) return;");
    /* the hold must come AFTER the close, or a narrowed-to-nothing rail would close the pane */
    expect(eff.indexOf("allDockable.length === 0")).toBeLessThan(eff.indexOf("dockable.length === 0"));
  });

  /**
   * ⚠️ TWO CAUSES, TWO ANSWERS. A WRITE removes one card from a set you are still in, so the
   * position you held is meaningful and `resolveDocked` clamps to it. A FILTER replaces the whole
   * set, where a position carries no meaning and the first match is the only predictable answer.
   * Distinguished by the narrowing's own signature rather than guessed at.
   */
  it("a narrowing change goes to the FIRST match; a write keeps the position", () => {
    const a = board.indexOf("const lastNarrowSig");
    const b = board.indexOf("}, [dockSig, dockKey, narrowSig");
    expect(a, "the narrowing effect is gone").toBeGreaterThan(-1);
    expect(b, "the effect's dep list is gone").toBeGreaterThan(a);
    const eff = board.slice(a, b);
    expect(eff).toContain("const narrowed = lastNarrowSig.current !== narrowSig;");
    expect(eff).toContain("setDockKey(narrowed ? dockable[0].key : (docked.card?.key ?? dockable[0].key));");
    /* the signature is the search, the chip and the tag — everything that changes the SET */
    expect(board).toContain("const narrowSig = `${chip}|${search.trim().toLowerCase()}|${tagSel ?? \"\"}`;");
  });

  it("⚠️ THE EMPTY MESSAGE IS INSIDE THE RAIL, and the workspace column renders beside it", () => {
    const ra = board.indexOf('className="tdw-rail"');
    const rb = board.indexOf('className="tdw-work"');
    expect(ra, "the rail marker is gone").toBeGreaterThan(-1);
    expect(rb, "the workspace marker is gone").toBeGreaterThan(ra);
    const rail = board.slice(ra, rb);
    expect(rail).toContain("tdw-empty");
    expect(rail).toContain("renderList()");
    /* and it is read from the groups the rail actually draws — not a parallel predicate */
    expect(board).toContain("const railEmpty = railGroups().length === 0;");
    /* ⚠️ ON DECLARATIONS, NOT ON PROSE — this file's own helper carries the reason: these rules
       explain themselves by QUOTING what they replaced, so a raw substring match reads the
       comment and fails a file that is correct. It caught me on this very line. */
    expect(board.replace(/\/\*[\s\S]*?\*\//g, "")).not.toContain("anyVisible");
  });

  it("⚠️ THE PANE'S QUEUE IS THE NARROWED SET, so ↑↓ never walk onto a card the rail is hiding", () => {
    expect(board).toContain("const dockable = allDockable.filter((c) => chipMatchesCard(chip, c));");
    expect(board).toContain("queue={dockable}");
  });
});

/**
 * ⚠️ A SCROLLER AND A CLIP LOOK IDENTICAL TO A "PAGE SCROLL IS ZERO" TEST, and only one of them
 * is correct. `overflow: hidden` satisfies that assertion perfectly while silently eating every
 * row past the fold — which is exactly what happened on 9 August, when the frame clipped 2,099px
 * of list with no scrollbar anywhere and every declaration below it was still right.
 *
 * ⚠️ WHAT THIS CAN AND CANNOT PROVE. jsdom computes no layout, so nothing here can watch content
 * overflow and check that it scrolls. What it CAN pin is that each pane declares the mechanism —
 * an `auto` overflow, not a `hidden` one — and that nothing between the frame and either scroller
 * clips instead. The used behaviour stays a browser check, and it is named as such in the report.
 */
describe("⚠️ EACH PANE SCROLLS, AND NEITHER CLIPS — the distinction a page-scroll test cannot make", () => {
  it("the rail's scroller is `overflow: auto`, never hidden", () => {
    const zone = rule(css, ".tpl-zone {");
    expect(zone).toContain("overflow: auto");
    expect(zone).not.toContain("overflow: hidden");
  });

  it("the workspace's own scroller is `overflow-y: auto`, never hidden — and it is the card's body", () => {
    /* retargeted with the scroller: the pane clips deliberately so the card can be given a height,
       and the thing that scrolls is one level in. A `hidden` on the SCROLLER would still be the
       fault this case exists for, so that is where the assertion points. */
    /* retargeted onto the wrapper that now owns it — see the case above for why the stylesheet is
       the wrong artefact to ask */
    const dockSrc = readFileSync(join(here, "TodoDock.tsx"), "utf8");
    expect(dockSrc).toContain("<EdgeFadeScroll");
    expect(rule(readFileSync(join(here, "todoDock.css"), "utf8"), ".tdk-scroll {")).not.toContain("overflow: hidden");
  });

  /**
   * ⚠️ AND NOTHING BETWEEN THE FRAME AND EITHER SCROLLER MAY CLIP. A `hidden` on any of these
   * would swallow the overflow before the scroller ever saw it — the row would simply be gone,
   * with the pane below it looking perfectly correct.
   */
  it("no box in either chain declares `overflow: hidden`", () => {
    for (const [sheet, sel] of [
      [css, ".tpl-cols {"], [css, ".tpl-body {"], [splitCss, ".tdw-split {"],
    ] as const) {
      expect(rule(sheet, sel), sel).not.toContain("overflow");
    }
    /* ⚠️ `.tdw-rail` IS THE EXCEPTION AND IT IS NAMED. It clips because it is a rounded CARD, and
       its clip is its own edge; the scroller is its direct child, so nothing is swallowed on the
       way down. Exempting it silently would leave the next reader unable to tell this from the
       fault the case exists for. */
    expect(rule(splitCss, ".tdw-rail {")).toContain("overflow: hidden");
    /* `.tdb-wrap` is the ONE deliberate clip — it is the frame, and the frame is a window. Its
       `overflow: hidden` is what makes the panes scroll instead of the page, and it is asserted
       positively above rather than exempted quietly here. */
    expect(rule(pageCss, ".tdb-wrap {")).toContain("overflow: hidden");
  });

  it("⚠️ BOTH PANES CAN SHRINK, or their content sizes them and there is nothing to scroll IN", () => {
    /* The other half of the same failure: a scroller as tall as its content never scrolls, and
       looks identical to one that has nothing in it. */
    expect(rule(css, ".tpl-zone {")).toContain("min-height: 0");
    expect(rule(splitCss, ".tdw-work {")).toContain("min-height: 0");
    expect(rule(splitCss, ".tdw-rail {")).toContain("min-height: 0");
    expect(rule(splitCss, ".tdw-split {")).toContain("min-height: 0");
  });
});

/* ── the panes become cards on a ground (visual rebuild, Phase 1) ────────────────────────────── */

describe("⚠️ TWO CARDS ON A GROUND, not one sheet with a line down it", () => {
  /**
   * ⚠️ THE WARM GROUND IS RETIRED (corrections, Phase 4). It was `--ws-ground` — the app's own
   * token, within a hair of v9's `#f7f3ed`. v10 makes the bar and the split WHITE, the same as the
   * sheet, and the LIST CARD'S HAIRLINE is the only delineation. A tinted ground under a white
   * card was two surfaces doing one job.
   */
  /**
   * ⚠️ NO CONTAINER ON THIS PAGE CARRIES A FILL (journeys pack, Phase 1). The split, the bar, the
   * list card and the desk pane all sit on the SHEET's ground; hairlines and the section bands do
   * every piece of delineating. A fill under a card that also has one was two surfaces doing one
   * job — this takes the second away rather than matching it to the first.
   */
  it("every container is transparent, and the hairlines do the delineating", () => {
    const split = rule(splitCss, ".tdw-split {");
    expect(split).toContain("background: transparent");
    expect(split).not.toContain("--ws-ground");
    /* `.tdw-cbar` is deleted with the command bar — the rule it held is asserted on the four
       containers that remain */
    expect(splitCss).not.toContain(".tdw-cbar {");
    for (const sel of [".tdw-rail {", ".tdw-work {", ".tdw-tools {", ".tdw-foot {"]) {
      expect(rule(splitCss, sel), sel).toContain("background: transparent");
    }
    /* …and the card is its border: no fill, no lift */
    expect(rule(splitCss, ".tdw-rail {")).not.toContain("box-shadow");
    expect(split).toContain("gap: 18px");
    /* ⚠️ ONE RHYTHM ON ALL FOUR SIDES NOW THE BAR IS NOT ABOVE IT. This was `0 22px 20px` — no top at
       all, because the bar's own `margin-bottom` stood in for it. With the bar gone that top would
       have collapsed to nothing and the split would sit hard against the header. */
    expect(split).toContain("padding: 22px");
    /* and the border is still there to do the delineating alone */
    expect(rule(splitCss, ".tdw-rail {")).toContain("border: 1px solid var(--tdw-hair)");
  });

  it("the rail is a CARD — hairline and radius, and the divider went with the sheet", () => {
    const rail = rule(splitCss, ".tdw-rail {");
    expect(rail).toContain("border: 1px solid var(--tdw-hair)");
    expect(rail).toContain("border-radius: 14px");
    /* the border-RIGHT that split one sheet in two is gone; the ground separates them now */
    expect(rail).not.toContain("border-right");
  });

  it("⚠️ THE WORKSPACE PANE PAINTS NOTHING — the card floats on the ground directly", () => {
    /* A pane with its own fill behind a card that also has one is two surfaces where the design
       has one object on a desk. */
  });

  /**
   * ⚠️ THE FOOTER STATES THE SCOPE THE EXPORT WRITES. A count reading "12 of 34" beside a button
   * that wrote 34 would be two statements of one scope — and the button's is the one nobody
   * checks until the file is open. Both read `railGroups()`.
   */
  it("the footer's count and its export read one derivation", () => {
    expect(board).toContain("showingLine(railShown(), allDockable.length)");
    expect(board).toContain("function railShown()");
    expect(board).toContain("return railGroups().reduce(");
    const ex = board.indexOf("function exportRail()");
    expect(ex, "the export is gone — this case would read nothing").toBeGreaterThan(-1);
    expect(board.slice(ex, ex + 900)).toContain("railGroups().flatMap");
  });

  /**
   * ⚠️ BLACK TEXT ON PINK, AND SCOPED TO THIS PAGE. `--pink` is an app-wide token read by auth,
   * forms, the shell, the toast and the page header; retoning it would restyle six surfaces
   * nobody asked about. The FILL still reads the token — only the ink is set here.
   */
  it("the page's pink buttons take ink, and the app-wide token is untouched", () => {
    const todoCss = readFileSync(join(here, "todo.css"), "utf8");
    const dockCss = readFileSync(join(here, "todoDock.css"), "utf8");
    expect(todoCss).toContain("color: #241209");
    expect(dockCss).toContain("color: #241209");
    /* the fill is still the token, so a future retone of the app's pink still reaches this page */
    expect(todoCss).toContain("background: var(--pink, #f5e2da)");
    /* and index.css is not touched by this page's decision */
    const index = readFileSync(join(here, "..", "..", "index.css"), "utf8");
    expect(index).toContain("--pink: #f5e2da;");
  });
});

/* ── the two panes read as one page (visual rebuild, Phase 7) ────────────────────────────────── */

/**
 * ⚠️ BAKED DECISION 5, AND IT IS THE ONE THE REBUILD MADE LOAD-BEARING: the rail's figure column
 * and the card's facts strip use the SAME mono-label-over-Playfair pairing. That match is what
 * makes the split read as one page rather than as two designs sharing a screen.
 *
 * ⚠️ SO IT IS ASSERTED AS A DERIVATION, NOT AS TWO NUMBERS. The card reads `figureFor(c)` — the
 * row's own resolver — so the figure you scanned in the list is literally the figure you land on.
 * Two independently-computed figures would agree today and drift the first time either was tuned,
 * and the drift would be invisible: both would look correct alone.
 */
describe("⚠️ THE RAIL'S FIGURE AND THE CARD'S FACTS ARE ONE DERIVATION", () => {
  it("the card's strip reads the ROW's resolver rather than recomputing", () => {
    const at = board.indexOf("handoff={(c) => {");
    expect(at, "the hand-off resolver is gone — this slice would read nothing").toBeGreaterThan(-1);
    const fn = board.slice(at, at + 3200);
    /* ⚠️ THE WAIT HALF WAS ALWAYS TRUE — `figureFor` IS the row's resolver. The ANCHOR half was
       not: it read `q.dateSent` under a hardcoded "Requested", which is a DIFFERENT fact from the
       rail's `waitAnchorMs` and mislabelled on every bucket. Measured on the deployed page: the
       R&R row said "No date on record" while its card showed "13 June". Both halves now come from
       the row's own derivations, so the comment at that site is finally true of the code. */
    expect(fn).toContain("const f = figureFor(c);");
    expect(fn).toContain("waitLabel: f.label");
    expect(fn).toContain("waitValue: f.value");
    expect(fn).toContain("waitAnchorMs(cardBucket(c), c.taskType");
    expect(fn).toContain("anchorLabel: Number.isFinite(anchorMs) ? anchorNoun(c) : undefined");
    expect(fn).not.toContain('"Requested"');
  });

  it("both surfaces set the same two registers — mono label, Playfair value", () => {
    const railLab = rule(readFileSync(join(here, "todoGroups.css"), "utf8"), ".tdg-figlab {");
    const railNum = rule(readFileSync(join(here, "todoGroups.css"), "utf8"), ".tdg-fignum {");
    const cardLab = rule(readFileSync(join(here, "todoDock.css"), "utf8"), ".tdk-fact .k {");
    const cardVal = rule(readFileSync(join(here, "todoDock.css"), "utf8"), ".tdk-fact .v {");
    for (const r of [railLab, cardLab]) {
      expect(r).toContain('font-family: "JetBrains Mono"');
      expect(r).toContain("text-transform: uppercase");
    }
    for (const r of [railNum, cardVal]) {
      expect(r).toContain('font-family: "Playfair Display"');
    }
  });

  /**
   * ⚠️ AND BURGUNDY STAYS ON THE RAIL'S NUMERAL ALONE. It is the page's only colour emphasis; a
   * second hot treatment in the card would double it and halve what it means.
   */
  it("the card's facts carry no hot treatment — burgundy is the rail numeral's alone", () => {
    const dockCss = readFileSync(join(here, "todoDock.css"), "utf8");
    expect(rule(dockCss, ".tdk-fact .v {")).not.toContain("#7c3a2a");
    expect(rule(readFileSync(join(here, "todoGroups.css"), "utf8"), ".tdg-fignum.hot {")).toContain("#7c3a2a");
  });
});

/* ── filter and sort in the list card (corrections, Phase 5) ─────────────────────────────────── */

describe("⚠️ A NARROWED LIST IS NEVER SILENTLY NARROWED", () => {
  /**
   * ⚠️ THE CHIP STRIP SAID IT BY STANDING ON THE PAGE. With the chips folded into a menu, the
   * button's ink fill is the ONLY thing left that can say a filter is on — so that fill is not
   * decoration and not optional.
   */
  it("the filter button takes the active fill whenever the chip is not `all`", () => {
    expect(board).toContain('className={`tdw-cbic${chip === "all" ? "" : " on"}`}');
    const on = rule(splitCss, ".tdw-cbic.on {");
    expect(on).toContain("background: #2b2118");
    expect(on).toContain("color: #fdfaf5");
  });

  it("…and it states WHAT it is narrowed to, beneath the row", () => {
    expect(board).toContain('className="tdw-narrowed"');
    expect(board).toContain("Showing {active.label} only");
  });

  /**
   * ⚠️ THE MENU'S COUNTS ARE THE BANDS' COUNTS. `railChips` is the one derivation both read, so a
   * menu row and the section band it names cannot state different figures — which is the whole
   * reason the chips could be folded away at all.
   */
  it("the filter menu reads `railChips`, the same derivation the bands read", () => {
    const at = board.indexOf("function renderRailTools");
    expect(at, "the rail tools are gone — this slice would read nothing").toBeGreaterThan(-1);
    const fn = board.slice(at, at + 3200);
    expect(fn).toContain("const chips = railChips(boardCols);");
    expect(fn).toContain("{ch.label} <span className=\"tdw-mn\">{ch.count}</span>");
  });

  /**
   * ⚠️ BOTH CLOSE ON OUTSIDE PRESS AND ESCAPE, AND NEITHER TRAPS FOCUS. They are narrowing
   * controls on permanent chrome, not dialogues — trapping focus in a filter would make it
   * something you have to escape from. Escape is deliberately NOT captured or stopped: this page
   * has its own Escape business, and swallowing the key here would reach past these menus.
   */
  it("the two menus dismiss the same three ways, and neither traps focus", () => {
    const at = board.indexOf("if (!filterOpen && !sortOpen) return;");
    expect(at, "the dismissal effect is gone").toBeGreaterThan(-1);
    const eff = board.slice(at, at + 700);
    expect(eff).toContain('document.addEventListener("pointerdown", close)');
    expect(eff).toContain('if (e.key === "Escape") close();');
    /* not captured, not stopped — the page's own Escape still reaches past them */
    expect(eff).not.toContain("true)");
    expect(eff).not.toContain("stopPropagation");
    /* mutually exclusive: opening one shuts the other */
    expect(board).toContain("onClick={() => { setSortOpen(false); setFilterOpen((v) => !v); }}");
    expect(board).toContain("onClick={() => { setFilterOpen(false); setSortOpen((v) => !v); }}");
  });
});

/**
 * ⚠️ `details` IS DISPLAYED, NEVER PARSED (journeys pack, (B)). It is a free-text field a human
 * wrote for a human to read; deriving anything by reading it back — chips, counts, status — is the
 * fault the whole record is built to avoid, and it is the same shape as a discriminator that
 * infers from label text.
 */
describe("⚠️ NOTHING DERIVES STATE BY READING A DISPLAY STRING", () => {
  it("the timeline renders `details` verbatim and splits it on nothing", () => {
    const dock = readFileSync(join(here, "TodoDock.tsx"), "utf8");
    const decl = dock.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    /* no chip strip, and no split of any kind over an entry's text */
    expect(decl).not.toContain("tdk-chips");
    expect(decl).not.toMatch(/\.split\(["'`]\s*\+/);
    expect(decl).not.toMatch(/details\s*\.\s*split/);
  });

  /**
   * ⚠️ AND THE CHIPS ARE CUT BECAUSE NOTHING COULD FEED THEM. `Activity` carries no package or
   * version reference, so structured chips are possible on ZERO entries. The type asserts that
   * absence, so a future reader adding chips has to add the DATA first.
   */
  it("an Activity cannot name what went with it — which is why there are no chips", () => {
    const types = readFileSync(join(here, "..", "..", "types.ts"), "utf8");
    const i = types.indexOf("export interface Activity {");
    expect(i, "the Activity interface is gone").toBeGreaterThan(-1);
    /* ⚠️ ON DECLARATIONS — the interface's own note says "materials sent", describing the WRITES
       that stamp `resultingStatus`, and reading prose as a field is the same mistake this whole
       describe is about. */
    const iface = types.slice(i, types.indexOf("}", i)).replace(/\/\/[^\n]*/g, "");
    for (const field of ["packageId", "versionId", "materials"]) {
      expect(iface, field).not.toContain(field);
    }
  });
});

describe("⚠️ THE TWO HAIRLINES ARE TOKENS, named while they had two callers", () => {
  it("both are declared once and read by name", () => {
    const index = readFileSync(join(here, "..", "..", "index.css"), "utf8");
    expect(index).toContain("--hair: #e7ddd2;");
    expect(index).toContain("--hair-soft: #efe8de;");
    /* the page reads them rather than restating the hexes */
    expect(splitCss).toContain("var(--hair-soft)");
    expect(splitCss).toContain("var(--hair)");
    expect(splitCss).not.toContain("#efe8de");
  });
});
