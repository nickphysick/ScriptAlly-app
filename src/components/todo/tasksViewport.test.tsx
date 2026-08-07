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

  it("⚠️ THE CALENDAR COMPRESSES: the grid takes the remaining height with 1fr rows", () => {
    const grid = rule(calCss, ".cal-grid {");
    expect(grid).toContain("grid-auto-rows: 1fr");
    expect(grid).toMatch(/flex:\s*1/);
    expect(grid).toContain("min-height: 0");
    expect(grid).not.toContain("overflow: auto");
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
