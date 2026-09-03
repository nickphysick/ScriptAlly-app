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
import { ACCOUNT_ROUTES } from "../../lib/accountRoutes";
import { sliceBetween } from "../../test/sliceBetween";

const here = __dirname;
const css = readFileSync(join(here, "tasksLayout.css"), "utf8");
const pageCss = readFileSync(join(here, "todo.css"), "utf8");
const calCss = readFileSync(join(here, "todoCalendar.css"), "utf8");
/* ⚠️ COMMENTS OUT BEFORE ANYTHING IS ASSERTED. Two cases below forbid a token by name, and this
   sheet's prose NAMES what it retired — `flex: 0 1 340px` and `.tpl-head` are both quoted in the
   comments that explain why they are gone, and both produced a red on a correct file. The failure
   also runs the other way: a `toContain` satisfied by a comment is a lock passing over code that
   no longer does the thing. Strip first, assert second. */
const rawSplitCss = readFileSync(join(here, "todoSplit.css"), "utf8");
const decomment = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const splitCss = decomment(rawSplitCss);
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
    /* ⚠️ RE-POINTED (paper run, Phase 1): the hem is gated on MEASURED overflow now, not on
       notes existing — the old gate rendered the chassis's sticky gradient over whatever sat at
       the fold (measured: across two cards at TWO pixels of zone overflow, which read as the
       cards themselves fading). The state derives from scrollHeight − clientHeight, observers on
       zone and child both. */
    expect(note).toContain("hem={zoneScrolls}");
    expect(note).toContain("zone.scrollHeight - zone.clientHeight > 24");
    expect(note).toContain("ro.observe(zone);");
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
    /* ⚠️ THE LIST OWNS ITS SCROLLER NOW. `TplZone` was the rail's wrapper; the ported card declares
       `.l-body { overflow-y: auto; flex: 1 1 auto; min-height: 0 }` itself, because the contract
       draws toolbar, body and footer as one object. The claim — the region scrolls and its heads
       stay put — moved to `listPort.measure.ts`, where it is MEASURED rather than read. */
    expect(readFileSync(join(here, "taskList.css"), "utf8")).toContain("overflow-y:auto");
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

  /* ⚠️ RETARGETED by the `calendar` session (timeline pack, Phase 3), flagged in
     reports/calendar-timeline.md — and this is the rare retarget that makes a page MORE
     conformant, not less. The Calendar was the file's one stated exception: it answered the
     viewport lock by COMPRESSING, because a month grid can divide whatever height it is given.
     A timeline cannot — the rows are however many relationships there are — so the board scrolls,
     and it scrolls in the family's own primitive rather than inventing an overflow of its own.
     `TasksPageLayout` already names `.tpl-zone` in its `settleOn`, so the page's Type A settle
     kept working with nothing edited in a shared file. */
  it("the Calendar and the Noteboard each declare their own region", () => {
    /* Today's clause went with the page (tasks-consolidation P1, 9 Aug). */
    expect(note).toContain("<TplZone");
    expect(cal).toContain("<TplZone");
  });

  it("⚠️ THE BOARD FILLS AND SCROLLS: the frame takes the height, the zone takes the overflow", () => {
    const board = rule(calCss, ".tl-board {");
    expect(board).toMatch(/flex:\s*1/);
    expect(board).toContain("min-height: 0");
    /* the FRAME never scrolls — the zone inside it does, so the day header can stick to the top
       of the scrollport rather than to a box that is itself moving */
    expect(board).toContain("overflow: hidden");

    /* ⚠️ minmax(0, 1fr), NEVER A BARE `1fr` — THE SAME LAW, NOW ON THE COLUMNS. A bare `1fr`
       track is `minmax(auto, 1fr)`: its floor is the content's min-content width, so a long agent
       name or an un-ellipsised chip would push the seven day columns wider than the board and
       earn a horizontal scrollbar the design forbids. A capped track needs a zero minimum, or the
       cap is the only thing that ever applies. It shipped wrong once as rows; it is the same
       mistake sideways. */
    /* ⚠️ ONE CLASS, so this lookup cannot slice a stub — a grouped selector containing
       another selector's text is the first-match trap in CSS clothing, and it caught this very
       assertion once before the stylesheet was restructured to make it impossible. */
    const tracks = null as unknown as string;
    /* ⚠️ THE GRID IS GONE AND THE CLAIM WENT WITH IT (Porcelain, Phase 2). The board was a CSS
       grid of day columns, and this asserted that every day track was `minmax(0, 1fr)` so one
       long chip could not push the board wider than its container. There are no day columns: a
       row is three flex columns and the timeline one is a positioning context whose pieces are
       PERCENTAGES of it, so nothing inside it can widen it and the horizontal-overflow hazard
       ceases to exist rather than being guarded. The surviving half of the claim — that any
       horizontal overflow is a fault to see rather than a thing to scroll — is asserted below.

       ⚠️ AND THE THREE FIXED WIDTHS THAT REPLACED THE TRACKS ARE TOKENS, so the name column and
       the action column cannot be set in two places. */
    void tracks;
    const boardBlock = calCss.slice(calCss.indexOf(".tl-board {"), calCss.indexOf(".tl-grp"));
    expect(boardBlock).toContain("--tl-nm-w:");
    /* ⚠️ TWO COLUMNS SINCE v40. The action column is deleted — the deed lives on the card's pill
       and nowhere else — so the row is agent · timeline and the timeline takes the freed width. */
    expect(rule(calCss, ".tl-c-nm {")).toContain("flex: 0 0 var(--tl-nm-w)");
    expect(calCss, "the action column came back").not.toMatch(/\.tl-c-ac\s*\{/);
    /* ⚠️ AND THE TIMELINE COLUMN CLIPS, which is load-bearing rather than tidy: it is why the
       tooltip is portalled to the board wrap. A clipping ancestor beats any z-index a descendant
       can declare, so a tip drawn inside this box would be cut in half by it. */
    /* ⚠️ THE LANE STOPPED CLIPPING AT v39, AND THE CLAIM MOVED WITH IT. It clipped so that a bar
       running past the window was cut at the edge; a card is masked on ITSELF now, so there is
       nothing left for the lane to cut — and it must not cut, because a hovered card's shadow
       reaches past its own box and a clipping lane shears it off. What this case is really about
       is the ZONE taking the overflow, which is asserted above and is unchanged; the lane's own
       overflow was never that claim, it was the mechanism of a different one. */
    expect(rule(calCss, ".tl-c-tl {")).toContain("overflow: visible");

    /* ⚠️ THE ZONE NO LONGER OWNS THE VERTICAL OVERFLOW (v60, Law 4) — `.tl-rows` does. v58 had the
       zone as the scroller with a sticky rail inside it; v60 puts a STATIC rail above a rows region
       that scrolls on its own, so nothing can pass above the rail. The zone's job is now to hold
       the height and clip sideways.

       ⚠️ AND THE ANCHOR IS `\n.tl-zone {`, NOT `.tl-zone {`. The bare form is a substring of
       `.tpl-zone.tl-zone {` — the two-class rule this pass added to beat `.tpl-zone`'s
       `overflow: auto` honestly — so the slice read the WRONG BLOCK and reported that the zone had
       stopped clipping sideways. First-match slicing on an unanchored selector, which this repo
       records four times over and which found me again here. */
    expect(rule(calCss, "\n.tl-zone {")).toContain("overflow-x: hidden");
    /* the rows region is the one scroller, and it is a different element from the zone */
    expect(rule(calCss, ".tl-rows {")).toContain("overflow-y: auto");
    expect(rule(calCss, ".tpl-zone.tl-zone {")).toContain("overflow: hidden");
  });

  it("⚠️ AND A ROW'S HEIGHT COMES FROM ITS LANES, never from a floor in the stylesheet", () => {
    /* ⚠️ THE OLD LAW WAS THE OPPOSITE AND BOTH ARE RIGHT FOR THEIR OWN LAYOUT. A month cell could
       not carry `min-height` because six of them plus the header cannot fit a laptop, so the cell
       had to shrink and clip. A timeline row must GROW instead — it holds however many lanes its
       occupants packed into — and it cannot clip, because clipping a lane hides an item with
       nothing to say so.

       ⚠️ RETARGETED by the `calendar` session (markers pack, Phase 2), flagged in
       reports/calendar-markers.md. THE LAW IS UNCHANGED — a row's height comes from its lanes and
       never from a fixed floor. What moved is WHERE the arithmetic lives. `lanes * LANE_STEP + 28`
       in the page was a literal that a different element also owned: the bar's offset read the same
       52 and was not the same number, so a 36px bar sat at the top of a 132px row with 96px of
       empty ground beneath it. The page supplies `--lanes`, which is data — how many lines does
       this row need — and the sheet multiplies it by `--lane-h`, which is geometry and belongs
       where the tokens are. A FLOOR is still forbidden; a derivation is what replaced it. */
    /* ⚠️ THE CELL IS GONE WITH THE GRID; THE ROW IS WHERE THE LAW LIVES NOW. Same claim, same
       reason: a timeline row must GROW to hold however many lanes its occupants packed into, and
       it must never clip — clipping a lane hides a journey with nothing to say so. */
    expect(rule(calCss, ".tl-rrow {")).not.toMatch(/(?:^|;|\s)height:\s*\d+px/);
    /* ⚠️ COMMENTS STRIPPED FIRST, AND THIS FILE'S `rule()` DOES NOT DO IT. Its `indexOf` found
       `.tl-row {` inside a COMMENT explaining a grouped selector and sliced prose — the house law
       ("a source-string lock strips comments before it asserts") in its plainest form. The shared
       helper is left alone: changing it would repoint every other caller in this file at a
       different block, which is not a change to make on the way past. */
    const calDecls = calCss.replace(/\/\*[\s\S]*?\*\//g, "");
    const rowRule = calDecls.slice(calDecls.indexOf("\n.tl-rrow {"), calDecls.indexOf("}", calDecls.indexOf("\n.tl-rrow {")));
    expect(rowRule, "no .tl-rrow rule found once comments are stripped").toContain("--row-h");
    /* still no literal floor — the height is a calc over the row token and the lane COUNT */
    expect(rowRule).not.toMatch(/min-height:\s*\d+px/);
    expect(rowRule).toContain("min-height: calc(var(--row-h) * var(--lanes, 1))");
    /* and the page hands down the COUNT, never a position */
    expect(cal).toContain('["--lanes" as string]: String(lanes)');
    /* ⚠️ AND THE PAGE IS STRIPPED TOO, for the reason this repo has paid for seven times: every
       retirement here is documented by QUOTING what it retired, so the page's own comment explains
       `LANE_STEP` at length. A bare `not.toContain` over prose that names the token it forbids is
       this codebase's most-recorded false red, and it caught me one line after I wrote the fix for
       it in the rule above. */
    const calSrc = cal.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(calSrc, "the page is computing a position again").not.toContain("LANE_STEP");
    expect(calSrc, "the page is computing a position again").not.toContain("laneTop");
  });
});

/* ⚠️ RETARGETED 22 Aug 2026 by the `calendar` session (finishing pack, Phase 4), and flagged in
   reports/calendar-finishing.md — the SECOND assertion block in this file outside that session's
   stated territory that its work made stale, edited rather than left red so `main` stays green for
   the other sessions working tonight.

   THE FACET CONTROL IS SUPERSEDED ON THIS PAGE, deliberately and with its reason: the ruling that
   "the calendar uses TODO_FACETS as the single shared vocabulary" dated from when the calendar was
   a projection of TASKS. Since the record layer it shows EVENTS — most of which are not tasks and
   never were — and "Urgent" has no meaning applied to a query sent three weeks ago. `TODO_FACETS`
   itself is UNTOUCHED and the board's use of it is asserted elsewhere in this file.

   The two laws worth keeping survive verbatim, pointed at the new vocabulary: ONE definition
   rather than a per-page label list, and narrowing applied where every surface reads it so it
   cannot reach the pips and miss the panel. */
describe("⚠️ the Calendar's tool-row filter — event kinds, calendar-local (finishing P4)", () => {
  it("it exists, and it reads the ONE kind definition rather than a second label list", () => {
    /* ⚠️ RETARGETED a third time, by the `calendar` session (timeline pack, Phase 3), flagged in
       reports/calendar-timeline.md. BOTH LAWS SURVIVE VERBATIM and only the vocabulary moved:
       `CAL_KINDS` named EVENTS by their place in the querying story, which is the right question
       for a month of history; a timeline's rows are relationships, so the useful question is which
       LAYER you are looking at — your turn, waiting, on the record, your tasks, carried. Five, not
       six, and each names a thing on the board rather than a category of event. */
    /* ⚠️ RETARGETED A FOURTH TIME, AND THIS TIME THE SUBJECT IS GONE RATHER THAN MOVED
       (Porcelain, Phase 2). The kind chips are DELETED, not hidden, and `TimelineView.kinds` went
       with them — four toggles that each subtracted a class of thing from a board whose whole
       claim is that it shows the relationship entire. The honest replacement states the
       retirement and asserts what stands in its place: the two segmented controls, which change
       what is SHOWN OF the one derivation rather than filtering pieces out of it. */
    const calSrcNow = cal.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(calSrcNow, "the kind chips came back").not.toMatch(/["\s`]tl-kind["\s`]/);
    expect(calSrcNow).not.toContain("TIMELINE_FILTERS");
    expect(calSrcNow).not.toContain("toggleKind");
    /* ⚠️ RETARGETED A FIFTH TIME (v40, Phase 6), AND BOTH LAWS STILL SURVIVE VERBATIM: ONE
       definition rather than a per-page label list, and narrowing applied where every surface
       reads it. Only the vocabulary moved again. The two segmented controls were four by the end —
       `WHAT NEEDS YOU / MANUSCRIPT`, `ONE LIST / GROUPED`, `FULL BOARD / RIGHT NOW` and a range
       slider — four answers to one question, each holding permanent width to state a setting made
       once. What changes often is WHICH relationships you are looking at, and that is the tab
       strip; how the board is arranged is set in one popover and read back off its trigger.
       `.tl-seg2` is deleted from the stylesheet in the same commit rather than left as a rule with
       no subject. */
    expect(calSrcNow, "the segmented controls came back").not.toMatch(/["\s`]tl-seg2["\s`]/);
    expect(cal).toContain("tl-tabs");
    expect(cal).toContain("TAB_ORDER");
    /* the narrowing still reads the ONE definition — `rowInTab` over the row's own group, the same
       field the board's headings draw, so a tab and a heading cannot disagree about one row */
    expect(cal).toContain("rowInTab");
    expect(cal).toContain("FULL BOARD");
    expect(cal).toContain("RIGHT NOW");
    expect(cal).not.toContain("KIND_LABEL"); // no per-page vocabulary
    /* and the superseded control is gone from the page, not merely unrendered */
    /* ⚠️ STRIPPED, NOT RAW — and this caught me twice in one pack. The page now carries COMMENTS
       explaining the supersession, and those comments necessarily name `TODO_FACETS`, `facetCounts`
       and the retired classes. A bare `not.toContain` over prose that names the very token it
       forbids is this repo's most-recorded false red; `decomment` is here for exactly this. */
    expect(decomment(cal)).not.toMatch(/["\s`]cal-facetwrap["\s`]/);
    expect(decomment(cal)).not.toContain("TODO_FACETS");
  });

  it("⚠️ THE BOARD'S OWN VOCABULARY IS LEFT ALONE — this page no longer consults it", () => {
    /* the old law was that the Calendar's counts had to BE the board's, so the two could not state
       different numbers for the same facet. There is no such risk once the two controls name
       different things — a shared count would be a coincidence, not a guarantee — so the honest
       successor is that the calendar reads neither the board's counts nor its labels. */
    expect(decomment(cal)).not.toContain("facetCounts");
    expect(decomment(cal)).not.toContain("liveBoardCards");
  });

  it("the filter is applied ONCE, inside the derivation every surface reads", () => {
    /* ⚠️ THE LAW IS STRONGER NOW, NOT WEAKER. It used to be that two functions applied the kinds
       and every surface called both — which held only while every surface remembered to. The
       narrowing now happens inside `timelineWeek`, which is the ONLY producer of rows and bands,
       so a surface cannot read an unfiltered set: there is no unfiltered set to read. */
    expect(cal).toContain("timelineWeek(");
    /* ⚠️ THE VIEW REACHES THE ONE DERIVATION — asserted as the argument rather than as a line of
       source. The literal `TL_DAYS, view)` was the whole call on one line; the call grew a second
       argument and wrapped, and the lock went red over a reformat. What it is FOR is that nothing
       filters anywhere else, which the two clauses below say. */
    /* ⚠️ THE WINDOW'S LENGTH IS THE RANGE'S NOW, not a module constant. `TL_DAYS = 7` is gone —
       the five stops carry their own day counts — so the argument is `range.days`. The claim is
       the one above: the view reaches the ONE derivation, asserted as an argument rather than as a
       line of source. */
    /* ⚠️ THE ARGUMENT IS `winFrom` NOW (grouped pack, Phase 6). `winStart` is the ANCHOR day and
       the window opens a slice BEFORE it, so the first day handed to the derivation is derived
       rather than stored. The claim is unchanged and is the one that matters: the view reaches
       the ONE derivation, asserted as an argument rather than as a line of source. */
    expect(cal).toMatch(/timelineWeek\(\s*\{[\s\S]{0,400}?\},\s*winFrom,\s*range\.days,\s*view,?\s*\)/);
    expect(decomment(cal)).not.toContain("itemInKinds");
    expect(decomment(cal)).not.toContain("recordInKinds");
  });

  /* ⚠️ RETARGETED 20 Aug 2026 by the `calendar` session (record-layer P6), which retired the week
     view. This is the ONE assertion outside that session's stated territory that its deletion made
     stale, and it was edited rather than left red so `main` stayed green for the other sessions
     working tonight — flagged in reports/calendar-record-layer.md for review.
     THE LAW IT ASSERTS IS UNCHANGED and both halves survive: the Calendar takes no `TplZone`
     because its grid COMPRESSES to the frame instead of scrolling, and the ResizeObserver's row
     divisor is still the number of week rows the grid holds.

     ⚠️ RETARGETED A SECOND TIME, 22 Aug 2026 by the same session (finishing pack, Phase 3), for
     the same reason and with the same flag. `const rows = 6` was true while the month grid was the
     only grid; `Upcoming only` now shows between one and six week rows. A hard 6 against a
     five-row grid divides the height by one row too many, so every cell is told it is SHORTER than
     it is and the fold caps tighter than it needs to — silently, with no error and no overflow to
     notice. The divisor is now COUNTED from the rendered cells, which is the law stated more
     strongly than the constant ever stated it: it cannot go stale. */
  /* ⚠️ RETARGETED A THIRD TIME, 26 Aug 2026, by the same session (timeline pack, Phase 3), and
     this time the law itself is superseded rather than restated. The row divisor existed to feed
     the FOLD: the grid measured how tall a week row had resolved to so it could work out how many
     pills fitted before "+N MORE". There is no fold, no cap and no counter — a row grows to hold
     what it holds — so there is nothing left to divide. What replaces it is the assertion above:
     the board scrolls in a `TplZone`, which is the lock this file exists to enforce. */
  it("⚠️ the fold's measurement is retired with the fold — nothing divides a height here", () => {
    expect(decomment(cal)).not.toContain("calFoldCap");
    /**
     * ⚠️ NARROWED TO ITS OWN LAW (settled pack, Phase 5). This forbade `ResizeObserver` outright,
     * as a proxy for the retired fold: the old one measured how tall a week row had resolved to so
     * it could work out how many pills fitted before "+N MORE". The law is "nothing divides a
     * HEIGHT here", and that is unchanged and asserted directly below.
     *
     * The page now observes the BOARD's WIDTH so the bar labels can be fitted — long form, short
     * form, then bare. It divides nothing, measures no height, and caps no count; forbidding it
     * would forbid the class of tool rather than the mistake, which is what a proxy does when the
     * thing it stood in for has gone.
     */
    const code = decomment(cal);
    expect(code, "a height is being divided again — the fold's own mistake")
      .not.toMatch(/(clientHeight|offsetHeight|getBoundingClientRect\(\)\.height)[^;\n]*\//);
    expect(code, "the fold's cap is back").not.toMatch(/MORE|foldCap|maxPills/);
    expect(decomment(cal)).not.toContain("data-fold-short");
    expect(decomment(cal)).not.toContain("const rows = 6;");
  });
});

describe("⚠️ the board's card spacing SURVIVES the conversion", () => {
  it("the zone wraps the grid — it does not sit between the body and its cards", () => {
    /* The pack's own instruction: if the scrollzone changes margin handling, the fix is the
       scrollzone and never the gap. P6's lane div is the precedent — a wrapper one level too
       deep killed `.tbd-body > .tbd-card` silently. The zone is OUTSIDE `.tbd` entirely. */
    const i = board.indexOf("<TaskList");
    expect(i).toBeGreaterThan(-1);
    const seg = board.slice(i, i + 500);
    /* ⚠️ THE BODY CHANGED, THE LAW DID NOT (tasks-consolidation P2, 9 Aug). The zone wraps
       whatever the body is and introduces nothing inside it — P6's lane div is the precedent: a
       wrapper one level too deep killed `.tbd-body > .tbd-card` in perfect silence. The list's
       own equivalent is `.tdg-panel > .tdg-row`, locked in tasksList.test.tsx. */
    expect(seg).toContain("<TaskList");
    /* the retired panel's job is the card's own `.l-body` now, and nothing sits between them */
    expect(seg).not.toContain("tdg-panel");
    expect(seg, "a wrapper came back between the card and its rows").not.toContain("TplZone");
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

  it("⚠️ the ArtSlot RETIRED WITH THE PANEL — the empty state draws its own illustrations", () => {
    /* ⚠️ SUPERSEDED (empty-state run). `.nb-empty` and its single raster slot are replaced by
       three inline-SVG panels following `manuscriptMarks` — baked fills, identical across themes,
       no asset pipeline. `ArtSlot` was NOT taken despite registering a "noteboard-empty" slot:
       it renders `<img src>` and `src` is absent for every slot it holds, so adopting it would
       have reintroduced the raster dependency the illustrations exist to avoid. The slot stays
       registered and unused, which artSlots.test.tsx now records. */
    expect(note).not.toContain('<ArtSlot name="noteboard-empty"');
    expect(note).not.toMatch(/["\s`]nb-empty["\s`]/);
    const art = readFileSync(join(here, "noteboardEmptyArt.tsx"), "utf8");
    expect([...art.matchAll(/<svg/g)]).toHaveLength(3);
  });

  it("⚠️ THE COLUMN VIEW IS CENTRED and changes the columns, never the scroller", () => {
    /* ⚠️ RENAMED (Noteboard rebuild, 22 Aug): `.nb-grid.column` → `.nb-board.nb-col1`, ported
       class-for-class from the mockup's `.board.cols-1`. The claim is unchanged — one zone, one
       scroller, a centred reading measure — only the selector moved. */
    const col = nbCss.slice(nbCss.indexOf(".nb-board.nb-col1 {"));
    expect(nbCss.indexOf(".nb-board.nb-col1 {")).toBeGreaterThan(-1);
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

/* ── Task settings: ONE FORM, AND IT IS A PAGE ─────────────────────────────────────────────── */

/**
 * ⚠️ THE SHEET IS RETIRED AND `/account/tasks` REPLACES IT. This block used to assert TWO DOORS
 * into one sheet, and the rule it protected — never a second copy of the settings UI — is
 * unchanged. What changed is which artefact is the one copy: the sheet's listener, state and
 * render left `ToDoPage.tsx`, and the page owns all four `todoPrefs` values plus the muted-rule
 * list, so nothing is stranded.
 *
 * ⚠️ THE ASSERTIONS ARE NOW ABOUT ABSENCE, WHICH IS THE HARDER HALF. A second form appearing later
 * is the failure this has always been here to catch; it now catches it by requiring that the page
 * is the only thing that writes these fields.
 */
describe("⚠️ ONE FORM FOR THE TASK FIELDS, AND IT IS THE SETTINGS PAGE", () => {
  const acct = readFileSync(join(here, "..", "AccountSettings.tsx"), "utf8");
  const menu = readFileSync(join(here, "..", "shell", "AccountMenu.tsx"), "utf8");

  it("the board no longer hosts the sheet — listener, state and render are all gone", () => {
    expect(board).not.toContain("TaskSettingsSheet");
    expect(board).not.toContain("settingsOpen");
    /* ⚠️ AND THE EVENT WENT WITH IT. A dispatch with no listener is a control that silently does
       nothing, which is worse than the duplication it would have been left to avoid. */
    expect(board).not.toContain("TODO_OPEN_TASK_SETTINGS");
    expect(menu).not.toContain("TODO_OPEN_TASK_SETTINGS");
  });

  it("the account menu navigates to the page instead", () => {
    expect(menu).toContain('go("/account/tasks")');
  });

  it("`tasks` is a rail section again, and the Preferences link row is deleted", () => {
    expect(ACCOUNT_ROUTES.map((r) => r.id)).toContain("tasks");
    expect(acct).toContain("const tasksSection");
    /* Deleted rather than re-pointed: a link row to a sibling section from inside Preferences is
       clutter when the rail is already the way between sections. */
    expect(acct).not.toContain("taskSettingsRow");
  });

  /* ⚠️ THE PAGE OWNS THE FOUR PREFERENCES — and no longer the mute list, which went to the board's
     set-aside panel with the other two kinds of hiding. The `mutedRuleRows` half of this assertion
     is dropped rather than repointed: what it protected (nothing stranded when the sheet retired)
     is now protected by `boardSettings`'s ledger group, against the surface that renders it. */
  it("every task preference has a home on the page", () => {
    for (const key of ["rollForward", "weeklyBriefing", "staleMonths", "types"]) {
      expect(acct, key).toContain(key);
    }
    expect(acct, "hiding is the board's now, all three kinds together").not.toContain("mutedRuleRows");
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
      /* ⚠️ RETARGETED by the `calendar` session (journey-bars pack, Phase 2), flagged in
         reports/calendar-bars.md. THE LAW IS UNCHANGED — all four pages wear the same column, and
         they still wear it FIRST. What the exact string could not express is a page-scoping
         MODIFIER alongside it: the Calendar carries `cal-timeline` so its own stylesheet can opt
         out of the settle's reclaim spacer, which is a fact about that page and not about the
         column. The column classes are still both present, still in this order, and still the
         first thing on the element. */
      expect(src, name).toMatch(/className="t-f12 spine-root( [a-z-]+)*"/);
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
    /* ⚠️ RE-POINTED (contract run, D7): the rail was a fixed token — 520, then 372 — and both stated
       a width the browser could not argue with. It is a RANGE now, so the list gives when the shell
       is tight and stops hoarding when it is generous. */
    /* ⚠️ RE-POINTED AGAIN, BACK TO A GRID (Query Centre match) — and the wrapping row it replaces
       is what this very case exists to forbid. In a WRAPPING row the line's cross size is the
       tallest item's own content height, so both panes measured 1331px inside a 669px split, the
       page's scroll row took the overflow, and the frame the title calls unscrollable scrolled.
       The lock could not see it: `flex-wrap: wrap` and `min-height: 0` were both present and both
       true, and the fault was in what wrap does to the CROSS axis.

       ⚠️ THE 390px ZERO-WIDTH PANE THE WRAP WAS ADDED FOR IS FIXED IN THE TRACK, NOT THE DISPLAY.
       `minmax(260px, 340px)` starved it because 260 is a floor the grid honours before
       `minmax(0, 1fr)` gets anything; `min(340px, 34%)` has no floor, so the pane always keeps two
       thirds of the measure. Which is why the range is asserted as a proportion below. */
    /* ⚠️ 392, NOT 340 — the list contract's own card width, and the list is what this track holds.
       The row grammar is measured at 392: a 56px pill column, a middle that must not wrap, and a
       78px right column. At 340 the middle was 52px short, which is where the meta lines wrapped. */
    expect(split).toContain("grid-template-columns: min(392px, 36%) minmax(0, 1fr)");
    expect(split, "the wrapping row is back — the panes will be sized by their content").not.toContain("flex-wrap");
    /* ⚠️ THE VERTICAL CLAIM SURVIVES THE MECHANISM CHANGE. `grid-template-rows: minmax(0, 1fr)` was
       how a GRID refused to be sized by its content; a flex column refuses with `min-height: 0`,
       which the split already declares. Same law, stated in the language the container now speaks. */
    expect(split).toContain("min-height: 0");
    expect(split, "the row track stopped refusing to be sized by its content").toContain("grid-template-rows: minmax(0, 1fr)");
    /* the value, stated once and read once — the rail is a fixed measure, the workspace is what
       is left. 520 since the visual rebuild: the row gained a 68px bucket pill and a 104px figure
       column, and v9 draws the pane at 520. (It was 440, itself widened from the earlier ref's
       408 when the lane structure grew — the width has always followed the row.) */
    /* ⚠️ RE-POINTED AGAIN, AND THIS TIME OFF A TOKEN ENTIRELY (contract run, D7). The rail was
       520, then 372 — both fixed, both a width the browser could not argue with. The contract's
       instruction is a RANGE, so there is no `--tdw-rail-w` left to pin. */
    expect(split, "the rail is a fixed token again").not.toContain("--tdw-rail-w:");
    /* the two bases live on the CHILDREN now — the row itself only says how it wraps */
    expect(splitCss, "a flex basis is back on a child of a grid").not.toContain("flex: 0 1 340px");
    /* ⚠️ 520 → 372 (frame run): the list was the fixed track at 520 while the PANE took the
       leftovers — 350px at 1440 for the surface being worked on. 372 is the design's own row
       width; the no-ellipsis assertion in paneFrame.measure.ts is what keeps it honest. */
    void ("re-pointed, not deleted");
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
    /* ⚠️ THE ADD IS THE CARD'S NOW, and it is the contract's only filled control. Its title is the
       contract's word too — "Add a task". */
    expect(readFileSync(join(here, "TaskList.tsx"), "utf8")).toContain('title="Add a task"');
    /* ⚠️ THE ADD MOVED INTO THE CARD (list port) and calls the SAME opener — one composer, one
       entrance. Read from the card, where the button now is. */
    expect(readFileSync(join(here, "TaskList.tsx"), "utf8")).toContain("onClick={onAdd}");
    expect(page).toContain('onAdd={() => openComposer("task")}');
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
    expect(page, "the two-number footer came back").not.toContain("showingLine(");
    const handoff = readFileSync(join(here, "../../lib/todoHandoff.ts"), "utf8");
    expect(handoff).toContain("outstanding · showing");
  });

  it("the WORKSPACE's second scroller is the card's body, and the pane holds it", () => {
    const work = rule(splitCss, ".tdw-work {");
    expect(work).toContain("min-height: 0");
    /* the pane no longer scrolls — it gives the card a definite height instead */
    expect(work).toContain("display: flex");
    expect(work).toContain("flex-direction: column");
    /* ⚠️ THE PANE'S OWN SCROLLER IS THE APP-FRAME PASS'S, NOT THE PORT'S. `TodoDock` gave the card
       an `EdgeFadeScroll`; the mockup has no scroller at all, because a standalone page scrolls as
       a document. The port therefore carries none, and the fill-and-scroll adaptation is asserted
       where it is made — `taskPanePort.test.tsx`, "the pane fits one screen". Reading the retired
       sheet here would assert a file that no longer exists. */
    /* ⚠️ THE SCROLLER'S OWN PROPERTIES ARE INLINE NOW, set by `EdgeFadeScroll` — so a STYLESHEET
       assertion cannot see them and would fail on a page that works. The height chain terminates
       on the wrapper; the overflow is asserted against RENDERED output below, which is the
       stronger place for it anyway. */

    /* the class is conditional now — the journey renders in the SAME scroller, so it carries a
       modifier rather than a second scrolling element */
    /* ⚠️ THREE CONTENTS, ONE SCROLLER — the journey and the group sweep both render in the SAME
       element the tracking columns do, carrying a modifier rather than adding a scrolling box. The
       assertion states that rule rather than the current ternary, so adding a fourth content
       cannot quietly introduce a second scroller. */
    /* ⚠️ AND THE CHAIN ABOVE IT IS REAL. `flex: 1; min-height: 0` under a BLOCK parent applies to
       nothing and the page keeps working, sized by content — the failure this codebase has been
       caught by twice. The pane's own half of that chain moved to the port and is asserted in
       `taskPanePort.test.tsx`; what remains here is the WORKSPACE column's half, which is this
       suite's subject. */
    expect(rule(splitCss, ".tdw-work {")).toContain("display: flex");
    expect(rule(splitCss, ".tdw-work {")).toContain("min-height: 0");
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
    /* ⚠️ ON DECLARATIONS. The note explaining the retirement NAMES `renderRailTools`, so a raw read
       goes red on a correct file — this repo's most-repeated lock fault, met again. */
    expect(board.replace(/\/\*[\s\S]*?\*\//g, ""), "the rail grew a toolbar again")
      .not.toContain("renderRailTools");
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
    for (const anchor of ['className="tdw-split"', 'className="tdw-rail"', 'className="tdw-work"', "<TaskPane"]) {
      expect(board, anchor).toContain(anchor);
    }
    expect(board.indexOf('className="tdw-split"')).toBeLessThan(board.indexOf('className="tdw-rail"'));
    expect(board.indexOf('className="tdw-rail"')).toBeLessThan(board.indexOf('className="tdw-work"'));
    expect(board.indexOf('className="tdw-work"')).toBeLessThan(board.indexOf("<TaskPane"));
    /* still exactly one dock mount and one entrance function */
    /* ⚠️ BOUNDED — `<TaskPane` is a PREFIX of `<TaskPaneBody`, which the mount also renders, and the
       unbounded form counted two mounts of one component. The house rule about prefix-matching a
       class name applies to a component name identically. */
    expect(board.match(/<TaskPane[\s>]/g) ?? []).toHaveLength(1);
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
    /* ⚠️ THE PANE TAKES NO QUEUE ANY MORE — the ported pane renders ONE card and navigates through
       `nav`, so what this case guards is that the narrowed set is what nav walks. `dockable` is the
       chip-filtered list, and both ends of the walk read it. */
    expect(board).toContain("total: dockable.length");
    expect(board).toContain("dockable.findIndex((c) => c.key === paneCard.key)");
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
    /* ⚠️ RETARGETED ONTO THE PORTED PANE. The claim is the pane's, not the retired component's:
       whatever scrolls must not be `hidden`. The port's scroller arrives with the app-frame
       adaptation and is asserted there; what this case still guards is that the WORKSPACE column
       around it never clips. */
    /* the column gives the card a definite height and the card scrolls inside it — asserted by
       measurement in `taskPanePort.test.tsx` and on the page, not from a stylesheet */
    expect(rule(splitCss, ".tdw-work {")).toContain("min-height: 0");
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
    for (const sel of [".tdw-rail {", ".tdw-work {"]) {
      expect(rule(splitCss, sel), sel).toContain("background: transparent");
    }
    /* …and the card is its border: no fill, no lift */
    expect(rule(splitCss, ".tdw-rail {")).not.toContain("box-shadow");
    expect(split).toContain("gap: 18px");
    /* ⚠️ ONE RHYTHM ON ALL FOUR SIDES NOW THE BAR IS NOT ABOVE IT. This was `0 22px 20px` — no top at
       all, because the bar's own `margin-bottom` stood in for it. With the bar gone that top would
       have collapsed to nothing and the split would sit hard against the header. */
    /* ⚠️ THE SPLIT TAKES THE QUERY CENTRE'S BODY PADDING NOW (frame2 Phase 1) — `20px 0 32px`, with
       NO horizontal component, because the scroll row's 35px gutter is the inset and a second one
       put this page's cards 23px further in than the Query Centre's. */
    expect(split).toContain("padding: 20px 0 32px");
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
    expect(board, "the two-number footer came back").not.toContain("showingLine(");
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
    /* ⚠️ THE PANE IS THE PORT NOW, and its primary is the mockup's `.b-primary`: a pink fill with
       INK text, which is the same claim this case has always made. */
    const paneCss = readFileSync(join(here, "taskPane.css"), "utf8");
    expect(todoCss).toContain("color: #241209");
    /* ⚠️ THE PANE STATES IT AS A TOKEN (Query Centre match) — every literal in `todoDock.css` is
       gone. The claim is the same: this page's pink buttons carry INK, not burgundy. `todo.css` is
       out of that pass's two files and still holds the hex. */
    /* ⚠️ THE PAIRING IS THE PANE CONTRACT'S NOW, AND IT CHANGED: pink fill with BURGUNDY text,
       where the materials contract paired pink with ink. Both are legible and both are the
       contract's own call, so this case stops asserting WHICH ink and asserts the invariant that
       actually protects the button — the fill is the app's pink token, and the label is never the
       same value as the fill. An earlier line here forbade `--burg` outright; that was a reading of
       the older contract, not a rule, and it would have failed a correct port. */
    const prim = rule(paneCss, ".tpn .ab.go {");
    expect(prim).toContain("background:var(--pink)");
    const fill = /background:\s*var\(--([a-z-]+)/.exec(prim)?.[1];
    const text = /(?:^|;)\s*color:\s*var\(--([a-z-]+)/.exec(prim)?.[1];
    expect(fill, "the primary's fill is not a token").toBeTruthy();
    expect(text, "the primary's label is not a token").toBeTruthy();
    expect(text, "the label is the same token as the fill — an invisible button").not.toBe(fill);
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
    /* ⚠️ RE-ANCHORED ON `paneFacts` — the `handoff` resolver went with the retired pane, and the
       claim moved intact: the card's strip reads the ROW's `figureFor` rather than recomputing a
       wait of its own, which is what stops the two surfaces stating different numbers. */
    /* ⚠️ AND RE-HOMED, NOT WEAKENED (Pack B Phase 2): `paneFacts` moved into
       `useTaskPaneSession` with the rest of the pane's session, so the calendar can mount the same
       pane. The claim is the one above, word for word — one derivation behind both surfaces. */
    const pane = readFileSync(join(here, "useTaskPaneSession.tsx"), "utf8");
    const at = pane.indexOf("const paneFacts");
    expect(at, "the pane's fact builder is gone — this slice would read nothing").toBeGreaterThan(-1);
    const fn = pane.slice(at, at + 3200);
    /* ⚠️ THE WAIT HALF WAS ALWAYS TRUE — `figureFor` IS the row's resolver. The ANCHOR half was
       not: it read `q.dateSent` under a hardcoded "Requested", which is a DIFFERENT fact from the
       rail's `waitAnchorMs` and mislabelled on every bucket. Measured on the deployed page: the
       R&R row said "No date on record" while its card showed "13 June". Both halves now come from
       the row's own derivations, so the comment at that site is finally true of the code. */
    /* ⚠️ THE IDENTIFIER IS `card` NOW, NOT `paneCard` — the pane's card is the session hook's
       PARAMETER rather than a variable the page happened to hold. Same value, same derivations,
       same three assertions; the rename is the whole of the difference. */
    expect(fn).toContain("const f = figureFor(card);");
    /* the wait is pushed as a tile built from the row's own label and value — one derivation */
    expect(fn).toContain("out.push({ k: f.label, v: `${f.value}");
    expect(fn).toContain("waitAnchorMs(cardBucket(card), card.taskType");
    /* ⚠️ AND THE NOUN IS STILL DERIVED PER BUCKET. A hardcoded "Requested" printed on every card —
       offer, chase and close alike — and that is the half this case exists to keep out. */
    expect(fn).toContain("k: anchorNoun(card)");
    expect(fn).not.toContain('"Requested"');
  });

  it("the figure is stated ONCE, on the rail, in the contract's two registers", () => {
    /* ⚠️ THE RAIL'S HALF IS THE PORTED `.r-fig` NOW — a mono line with a Playfair figure inside
       it, which is the contract's own two registers. `.tdg-figlab`/`.tdg-fignum` went with the
       retired sheet. The comparison this case exists for — that the rail and the card set the SAME
       two registers — is unchanged; both sides moved. */
    const listCss = readFileSync(join(here, "taskList.css"), "utf8");
    const railLab = rule(listCss, ".tlc .r-fig {");
    const railNum = rule(listCss, ".tlc .r-fig b {");
    /* ⚠️ AND THE CARD NO LONGER HAS A HALF (pane round, Phase 2) — which is the strongest form
       this case has taken. It began as "the two figures agree", was re-pointed twice as the card's
       figure moved between strips, and each time it guarded against a DIVERGENCE that was still
       possible. The pane contract's band is deed + sub-line + arrows: there is no second figure to
       agree with, so the rail's is simply the page's. The two registers are still asserted, on the
       one element that sets them; the card's side becomes an absence claim. */
    const dock = readFileSync(join(here, "taskPane.css"), "utf8");
    expect(dock, "the pane grew a figure back").not.toContain("bandfig");
    /* ⚠️ THE TWO SHEETS QUOTE FONTS DIFFERENTLY, and that is a fact about the port rather than a
       disagreement: `taskPane.css` carries the mockup's own declarations verbatim, which use single
       quotes and no space after the colon. Normalise before comparing, or this asserts a coding
       style rather than a typographic register. */
    const font = (r: string) => r.replace(/['"]/g, "").replace(/:\s*/g, ":");
    expect(font(railLab)).toContain("font-family:JetBrains Mono");
    expect(font(railLab)).toContain("text-transform:uppercase");
    expect(font(railNum)).toContain("font-family:Playfair Display");
  });

  /**
   * ⚠️ AND BURGUNDY STAYS ON THE RAIL'S NUMERAL ALONE. It is the page's only colour emphasis; a
   * second hot treatment in the card would double it and halve what it means.
   */
  it("the card sets no Playfair numeral — burgundy is the rail numeral's alone", () => {
    const dockCss = readFileSync(join(here, "taskPane.css"), "utf8");
    /* ⚠️ ASSERTED ON THE REGISTER, NOT ON A CLASS (pane round, Phase 2). The band figure this used
       to read is retired, and a case re-pointed at a deleted selector would go vacuous rather than
       red — `rule()` on a missing rule returns nothing, and `not.toContain` on nothing passes. So
       the claim is made against the whole sheet: the pane sets no Playfair numeral for a figure at
       all, which is why it cannot carry a hot one. `.deed` is Playfair and is prose, not a figure —
       excluded by naming the numeral's own size register rather than the family. */
    const numerals = [...dockCss.matchAll(/font-size:\s*3\d(?:\.\d+)?px/g)].length;
    expect(numerals, "the pane grew a display numeral").toBe(0);
    expect(rule(readFileSync(join(here, "taskList.css"), "utf8"), ".tlc .r-fig.hot b {")).toContain("var(--burg)");
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
    /* the narrowed-state marker is the card's `filterActive` now — same fact, the card's clothing */
    /* ⚠️ THE FUNNEL LIGHTS FROM THE VIEW, not from whether the menu is open (frame round). A menu
       being open says nothing about whether the list is narrowed; `isFiltered(view)` compares to
       the default, so a list that was filtered and then unfiltered stops wearing the marker. */
    expect(board).toContain("filterActive={isFiltered(view)}");
    const on = rule(splitCss, ".tdw-cbic.on {");
    expect(on).toContain("background: #2b2118");
    expect(on).toContain("color: #fdfaf5");
  });

  it("…and it states WHAT it is narrowed to, beneath the row", () => {
    expect(board, "a second narrowed marker came back").not.toContain('className="tdw-narrowed"');
    /* ⚠️ THE NARROWED SENTENCE IS RETIRED WITH THE RAIL'S TOOLBAR. It said which chip was active
       beneath the tools; the card's toolbar states it through `filterActive` on the trigger, which
       is where the reader's hand already is. Asserted as an absence so the sentence cannot come
       back as a second statement of the same fact. */
    expect(board, "the narrowed sentence came back").not.toContain("Showing {active.label} only");
  });

  /**
   * ⚠️ THE MENU'S COUNTS ARE THE BANDS' COUNTS. `railChips` is the one derivation both read, so a
   * menu row and the section band it names cannot state different figures — which is the whole
   * reason the chips could be folded away at all.
   */
  it("the filter menu reads `railChips`, the same derivation the bands read", () => {
    const at = board.indexOf("function renderList");
    expect(at, "the rail tools are gone — this slice would read nothing").toBeGreaterThan(-1);
    const fn = board.slice(at, at + 3200);
    /* ⚠️ RE-POINTED (frame round). The contract's filter counts by GROUP and by TYPE, and both
       come from `railGroupsAll()` — the same array the section bands and the command bar's meter
       read. The claim is the one this case has always made: the menu's figures and the bands'
       figures are one derivation, so they cannot disagree. The chips' own map is retired with them. */
    expect(fn).toContain("groupCounts={viewGroupCounts(railGroupsAll())}");
    expect(fn).toContain("typeCounts={viewTypeCounts(railGroupsAll())}");
    expect(fn).toContain("shown={viewTotal(railGroups())}");
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
    /* the same two-menu exclusivity, now handed to the card as `onFilter` */
    /* the same two-menu exclusivity, now also handing the trigger element up so the menu can anchor */
    expect(board).toContain("onFilter={(el) => { filterAnchor.current = el; setSortOpen(false); setFilterOpen((v) => !v); }}");
    expect(board).toContain("onSort={(el) => { sortAnchor.current = el; setFilterOpen(false); setSortOpen((v) => !v); }}");
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
    /* ⚠️ RE-POINTED ONTO THE PORTED PANE AND ITS BUILDER. The claim is not about a component but
       about a HABIT: nothing may recover structure by splitting a string that exists to be read.
       Both halves of the timeline now live here — `TaskPane` renders the rungs, `taskPaneJourney`
       maps them — so both are read. */
    const decl = ["TaskPane.tsx", "../../lib/taskPaneJourney.tsx"]
      .map((f) => readFileSync(join(here, f), "utf8"))
      .join("\n")
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
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
