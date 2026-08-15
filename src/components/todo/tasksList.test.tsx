/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE CONSOLIDATED TASKS PAGE'S BODY (tasks-consolidation, Phase 2; refs design-refs/tasks-page.html
 * and design-refs/tasks-states.html — the page body only; the chrome around them is another
 * surface's and is never copied from a ref).
 *
 * ⚠️ WHY THESE ARE RULE-TEXT AND RENDERED CASES SIDE BY SIDE. There is no jsdom here
 * (`vitest.config.ts` is `environment: 'node'`), so nothing can compute a used width — but the
 * GRAMMAR that produces one can be asserted exactly, and the rendered markup can prove which
 * elements exist and how they nest. The two failure modes this file exists for are both invisible
 * to a typecheck and to a green build: a row that stops being one element, and a CSS colour that
 * quietly stops matching the TypeScript map it was copied from.
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BoardCard } from "../../lib/todoBoard";
import { BoardColumns } from "../../lib/todoColumns";
import { taskGroups, groupSlice, HOUSEKEEPING_VISIBLE, tasksEyebrow } from "../../lib/todoGroups";
import { rowPill, rowPrimaryLabel, rowJourney, PillTone, splitMenu, rowReversalIcon, rowTitleParts } from "../../lib/taskRow";
import { rowDeed, cardBucket, BUCKET_LABEL } from "../../lib/todoBuckets";
import { FAMILY_PILL } from "../../lib/todoFamily";
import { laterHideKey } from "../../lib/todoHousekeeping";
import { TodoColumnId } from "../../lib/todoColumns";
import { SNOOZE_STOPS, reachableStops, snoozeDateLabel } from "../../lib/todoActions";
import { focusesSearch, isTypingTarget, ShortcutKey, KEY_MAP } from "../../lib/taskShortcuts";
import { dialDateLine, dialDateShort } from "./SnoozeDial";
import { TaskList, groupColumn } from "./TaskList";

const here = __dirname;
const css = readFileSync(join(here, "todoGroups.css"), "utf8");
const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
const list = readFileSync(join(here, "TaskList.tsx"), "utf8");
const dialSrc = readFileSync(join(here, "SnoozeDial.tsx"), "utf8");
const rowSrc = readFileSync(join(here, "..", "..", "lib", "taskRow.ts"), "utf8");
const tipSrc = readFileSync(join(here, "RowTip.tsx"), "utf8");
const dialCss = readFileSync(join(here, "snoozeDial.css"), "utf8");
const rule2 = (sel: string): string => {
  const i = dialCss.indexOf(sel);
  expect(i, `${sel} has no rule`).toBeGreaterThan(-1);
  return dialCss.slice(i, dialCss.indexOf("}", i));
};

/* ⚠️ STRIP THE COMMENTS BEFORE SLICING, NOT AFTER — and this bit me writing the sticky lock.
   The house style explains a rule by QUOTING the one it depends on ("must equal `.ws-work {
   background: #ffffff }`"), so a slicer that walks to the next `}` stops inside the prose and
   returns half a rule. It fails loudly here; the dangerous version is the `not.toContain` that
   silently passes because the declaration it was looking for fell outside the truncated slice.
   (tasksViewport's helper strips AFTER slicing and has the same latent flaw — flagged, not
   touched, because it is another pack's file and its rules carry no quoted braces today.) */
const cssDecls = css.replace(/\/\*[\s\S]*?\*\//g, "");
const rule = (sel: string): string => {
  const i = cssDecls.indexOf(sel);
  expect(i, `${sel} has no rule`).toBeGreaterThan(-1);
  return cssDecls.slice(i, cssDecls.indexOf("}", i));
};

/* ⚠️ ASSERT ON DECLARATIONS, NOT ON RAW FILE TEXT — the house style explains a rule by naming
   what it forbids, so a naive `not.toContain` fails on a correct file that documents itself.
   (The lesson is written into tasksViewport's rule-text helper; this is the same one.) */
const decls = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const code = decls;

const card = (over: Partial<BoardCard> = {}): BoardCard => ({
  key: "k1", stream: "do", title: "Send your full to Jonathan Marsh", who: "", subtitle: "The Marsh Agency",
  due: "26 DAYS", kind: "AGENT WAITING", warn: false, snoozes: 0, hk: false, initials: "JM",
  record: "The Marsh Agency", committed: false, done: false,
  taskType: "full_requested", relatedRecordId: "q1", ...over,
});

/** ⚠️ A SWEEP IS A CARD WITH `sweepOf` — `isSweepCard` is a type guard on that field, so a
 *  fixture without it is an ordinary housekeeping card wearing a sweep's title. */
const sweepCard = (over: Partial<BoardCard> = {}): BoardCard => ({
  ...card({
    key: "s", stream: "hk", title: "Materials sweep", subtitle: "16 agents · one sitting each",
    kind: "MATERIALS", due: "16 TO FIX", taskType: "data_quality_poor", relatedRecordId: undefined,
    ...over,
  }),
  sweepOf: 16, sweepRule: "dq_materials",
} as BoardCard);

const cols = (over: Partial<BoardColumns> = {}): BoardColumns =>
  ({ todo: [], today: [], snoozed: [], done: [], ...over });

const render = (c: BoardColumns) =>
  renderToStaticMarkup(
    <TaskList
      groups={taskGroups(c)}
      hkExpanded={false}
      onToggleHk={() => {}}
      onOpen={() => {}}
      onTick={() => {}}
      onVerb={() => {}}
      onSnooze={() => {}}
      figure={() => ({ label: "You've waited", value: "12", unit: "days", side: "them", hot: false })}
    />,
  );

/* ── 1. the row ─────────────────────────────────────────────────────────────────────────────── */

describe("⚠️ THE ROW IS ONE ELEMENT CARRYING ITS OWN GRID — never `display: contents`", () => {
  /* THE FAULT THIS FORBIDS: `display: contents` on the row, with the six cells promoted to grid
     items of the panel, lays out identically at rest — and then deletes the row's box. Hover,
     focus and any selected band fracture into six separate rectangles with the grid gaps showing
     between them, and the `::after` divider has nothing to hang off. It is a change that looks
     free in a screenshot and is not, which is exactly why it needs a test rather than a comment. */
  it("the row declares the grid ON ITSELF, and `display: contents` appears nowhere in the sheet", () => {
    const row = rule(".tdg-row {");
    expect(row).toContain("display: grid");
    expect(decls(css)).not.toContain("display: contents");
    expect(decls(list)).not.toContain("display: contents");
  });

  /**
   * ⚠️ FOUR TRACKS SINCE THE RAIL (P3) — checkbox · StatusDot · content · actions. Six lanes at
   * the pack's own sizes left the TITLE 33px inside a 440px rail, and the title is the only part
   * of a row that says what the row is. The pill and the age became caption clauses and the
   * journey meter moved inside the content cell; neither was ever a column of facts you scan
   * down.
   */
  /**
   * ⚠️ FOUR TRACKS, RE-MEASURED (visual rebuild, Phase 2): checkbox · BUCKET PILL · content ·
   * FIGURE. The StatusDot lane became the pill — it said where a QUERY stood in a pipeline, a fact
   * about the record rather than about the work — and the actions stopped being a track of their
   * own, because they now sit inside the figure's slot.
   */
  it("the four tracks, exactly — checkbox · bucket pill · content · figure", () => {
    expect(rule(".tdg-row {")).toContain("grid-template-columns: 17px 68px minmax(0, 1fr) 104px");
  });

  it("ONE flexible track: the content's. The two marks are fixed and the cluster sizes itself", () => {
    const tracks = rule(".tdg-row {").match(/grid-template-columns:([^;]*)/)![1];
    expect(tracks.match(/fr\b/g)).toHaveLength(1);
    expect(tracks).toContain("minmax(0, 1fr)"); // ⚠️ the ZERO min — a bare 1fr floors at min-content
  });

  /**
   * ⚠️ THE LANES ALIGN TO THE CONTENT'S FIRST LINE, NOT ITS MIDDLE. The content cell is three
   * stacked things now (title, caption, meter) while its neighbours are single marks — `center`
   * would float the checkbox and the dot against the middle of a three-line cell, which reads as
   * two controls that have slipped rather than two marks belonging to the title.
   */
  /**
   * ⚠️ CENTRED AGAIN, AND THE REASON REVERSED WITH THE ROW. It was `start` because the content
   * cell held three stacked things (title, caption, meter) while its neighbours were single marks.
   * The caption and the meter are gone from the row; content is two tight lines, and its
   * neighbours — a 17px box, a pill, a two-line figure — read as a row of things on one line.
   */
  it("the row centres its lanes", () => {
    expect(rule(".tdg-row {")).toContain("align-items: center");
    expect(rule(".tdg-cc {")).toContain("align-items: center");
  });

  it("the divider is the ROW's own inset line, and it yields to hover rather than cutting across it", () => {
    expect(rule(".tdg-row::after {")).toContain("bottom: -1px");
    expect(css).toContain(".tdg-row:last-child::after { display: none; }");
    expect(css).toContain(".tdg-row:hover::after { background: transparent; }");
  });

  it("rendered: the row is a single element with the class, and the cells are its children", () => {
    const html = render(cols({ todo: [card()] }));
    expect(html).toContain('class="tdg-row"');
    // one row → one opening tag; the cells never carry the row class themselves
    expect(html.match(/class="tdg-row"/g)).toHaveLength(1);
  });
});

describe("⚠️ THE TITLE WRAPS AND IS NEVER ELLIPSISED, and the why-line sits BENEATH it", () => {
  /* Carried from the retired Up-next rail (tasks-viewport): the title is the only part of a row
     that says what the row IS, so the measure is paid for out of the flexible track rather than
     the title being shortened to fit, and the subtitle never competes for the same line's width. */
  it("no ellipsis, no line clamp, no nowrap on the title", () => {
    const t = rule(".tdg-t {");
    expect(t).not.toContain("text-overflow");
    expect(t).not.toContain("-webkit-line-clamp");
    expect(t).not.toContain("white-space: nowrap");
    expect(t).toContain("overflow-wrap: anywhere");
  });

  it("the subtitle is its own block under the title", () => {
    expect(rule(".tdg-sub {")).toContain("margin-top: 5px");
    const html = render(cols({ todo: [card({ who: "Ada Vane", record: "Vane Literary" })] }));
    expect(html).toContain("tdg-sub");
    expect(html.indexOf("tdg-sub")).toBeGreaterThan(html.indexOf("tdg-t"));
  });

  /**
   * ⚠️ THE NAME IS THE ONLY THING BOLDED, AND THE SPLIT IS DATA-BACKED (P3). `who` is the card's
   * own "emphasised name inside the title" field, so nothing is parsed or guessed. The ref bolds
   * the VERB too, but its fixtures carry `<b>` inside the title string; this app composes the
   * title as one sentence and records only the name, so bolding a leading word count would break
   * on the first title that does not start with its verb ("Bethany Carter has made an offer").
   */
  /**
   * ⚠️ LINE ONE IS THE DEED ALONE (visual rebuild, Phase 2) — "Send your full", never "Send your
   * full to Ada Vane". The agent moved to line two so line one scans as a column of verbs, which
   * is what makes a long list readable at a glance.
   *
   * ⚠️ SO THE TWO-WEIGHT TITLE IS RETIRED WITH THE NAME IT EMPHASISED. `rowTitleParts` bolded
   * `who` inside the sentence; there is no sentence now. It survives in `taskRow` unmounted — the
   * workspace card's band still names the agent — and the row asks `rowDeed` instead.
   */
  it("line one is the deed alone, in Inter — never Playfair, never a burgundy italic", () => {
    const t = rule(".tdg-t {");
    expect(t).not.toContain("Playfair");
    expect(t).not.toContain("italic");
    const html = render(cols({ todo: [card({ title: "Send your full to Ada Vane", who: "Ada Vane", taskType: "full_requested" })] }));
    expect(html).toContain("Send your full");
    /* the agent is on line two, and NOT on line one */
    const deed = html.slice(html.indexOf('class="tdg-t"'), html.indexOf('class="tdg-sub"'));
    expect(deed).not.toContain("Ada Vane");
    expect(html).toContain("tdg-sub");
  });

  it("⚠️ THE DEED IS DERIVED, NOT SLICED OUT OF THE TITLE", () => {
    /* Cutting a composed sentence at " to " would break the first time one was phrased
       differently, and silently. A writer's own item keeps its own words — it is the one card
       whose text the writer wrote. */
    expect(rowDeed(card({ taskType: "full_requested" }))).toBe("Send your full");
    expect(rowDeed(card({ taskType: "partial_requested" }))).toBe("Send your partial");
    expect(rowDeed(card({ taskType: "offer_received" }))).toBe("Answer the offer");
    expect(rowDeed(card({ taskType: "no_response_close" }))).toBe("Log the close");
    expect(rowDeed(card({ userTaskId: "u1", title: "Water the plants" }))).toBe("Water the plants");
  });

  /**
   * ⚠️ NO PLAYFAIR AND NO BURGUNDY ITALIC ANYWHERE IN A ROW (P3). The stationery register belongs
   * to the workspace card; the rail is a directory. Asserted over the row's whole block rather
   * than one selector, because the fault would arrive on whichever child someone reached for.
   */
  it("the row's block carries no serif and no italic at all", () => {
    const i = css.indexOf("/* ── THE ROW ");
    expect(i, "the row's block marker is gone — this case reads nothing").toBeGreaterThan(-1);
    const block = decls(css.slice(i, css.indexOf("── THE ROW'S ACTIONS", i)));
    expect(block).not.toContain("Playfair");
    expect(block).not.toContain("italic");
  });
});

/* ── 2. the four-slot action grid ───────────────────────────────────────────────────────────── */

/**
 * ⚠️ THE SPLIT BUTTON IS RETIRED, AND SO IS EVERY GUARD IT NEEDED (icon-cluster pack; ref
 * design-refs/todo-iconcluster-v2.html, which SUPERSEDES the splitguard and weight-slider sheets
 * for row actions).
 *
 * The 3px dead seam, the arm-before-press pair of `:hover`s, the 34px caret minimum and the
 * filled/outlined weights were four guards around ONE problem: a compound control repeated sixteen
 * times down a list. Four separate targets have no seam to defend, so the guards are DELETED
 * rather than carried across — a guard kept past the hazard it guarded is the next reader's puzzle.
 */
describe("⚠️ THE SPLIT BUTTON AND ITS FOUR GUARDS ARE EXTINCT", () => {
  it("every `.tdg-split*` rule is gone from the sheet — except the menu, which the cluster kept", () => {
    for (const gone of [".tdg-split {", ".tdg-split-p", ".tdg-split-c", ".tdg-split-seam", ".tdg-split.ghost"]) {
      expect(cssDecls, `${gone} survives`).not.toContain(gone);
    }
    /* ⚠️ THE MENU'S WIDTH SURVIVES ON PURPOSE — icon 4 opens the same portalled menu, and the
       snooze dial inside it still needs the room. */
    expect(cssDecls).toContain(".tdg-splitmenu { width: 258px; }");
  });

  it("…and out of the markup: no seam, no caret, no weight, no arrow-down-opens-menu", () => {
    expect(code(list)).not.toContain("tdg-split-");
    expect(code(list)).not.toContain("splitWeight");
    expect(code(list)).not.toContain('e.key === "ArrowDown"');
    expect(rowSrc, "the weight derivation goes with the button").not.toContain("splitWeight");
    /* the group thread existed ONLY to carry weight — the glyph derives from the KIND instead */
    expect(code(list)).not.toContain("TaskGroupId");
    expect(code(list)).toContain("renderRow(c, column)");
  });

  it("the four-slot grid before it stays extinct too", () => {
    expect(cssDecls).not.toContain(".tdg-verbs");
    expect(cssDecls).not.toContain(".tdg-slot");
    expect(code(list)).not.toContain("tdg-slot");
  });

  /* carried over unchanged — these were never about the split */
  it("every verb still comes through ONE door, which resolves against `cardMenu`", () => {
    expect(list).toContain("const fire = (c: BoardCard, column: TodoColumnId, id: MenuItemId) => {");
    expect(list).toContain("const leaf = cardMenu(c, column)");
    expect(list).toContain("onVerb(c, leaf ?? { kind: \"leaf\", id, label: id }, column);");
  });

  it("a row that CANNOT be completed draws no tick — `isTickable` decides, never the render", () => {
    expect(render(cols({ todo: [sweepCard({ key: "s1" })] }))).not.toContain("tdg-tick");
    expect(list).toContain("const tickable = isTickable(c);");
  });
});

/**
 * ⚠️ THREE ICONS ON A KIND ROW, FOUR ON A STATE ROW (P3).
 *
 * The varying first glyph is retired. On urgent and housekeeping it fired `openDock`, which
 * CLICKING THE ROW does; on `yours` it fired the tick, which the checkbox in lane one does. With
 * the workspace pane showing the row's deed, all three were controls repeating a neighbour.
 * Done and Snoozed keep ONE CONSTANT verb each — undo, return — so nothing varies within a group.
 */
describe("⚠️ THE ROW'S ACTIONS ARE A CLUSTER, AND IT NEVER REFLOWS", () => {
  /**
   * ⚠️ TWO VERBS NOW, IN THE FIGURE'S OWN SLOT (visual rebuild, Phase 2). v9 draws two and the
   * column is 104px; a four-icon cluster does not fit over a figure it is overlaying. The ⋯ and
   * the reversal moved to the COMMAND BAR, the page's one action surface — so nothing became
   * unreachable, it went where the pack put it.
   */
  it("a row carries two — snooze and dismiss", () => {
    const html = render(cols({ todo: [card({ key: "n1" })] }));
    expect((html.match(/class="tdg-ic/g) ?? [])).toHaveLength(2);
    expect(html).not.toContain('class="tdg-ic prim"');
    expect(rule(".tdg-ic {")).toContain("width: 30px");
    expect(rule(".tdg-ic {")).toContain("height: 30px");
    expect(rule(".tdg-ic {")).toContain("border-radius: 8px");
    /* ⚠️ 3px, NOT 5px — and the 5 was never what rendered. `.tdg-acts` was declared TWICE; this
       sliced the FIRST block, which set `gap: 5px` and was overridden by the real rule's 3px forty
       lines below. The duplicate is folded into one rule now, so this asserts what the browser
       uses. The FIRST-MATCH SLICE is the hazard: the value was wrong for as long as the duplicate
       existed and the lock stayed green throughout. */
    expect(rule(".tdg-acts {")).toContain("gap: 3px");
  });

  /**
   * ⚠️ THE VERBS ARE HIDDEN AT REST — the swap was only ever half built. The figure stack faded to
   * 0.14 on hover as designed, but nothing hid the verbs, so at REST the clock and dismiss icons
   * were drawn at full opacity ON TOP of a full-opacity figure: both visible, neither readable.
   */
  it("⚠️ the verbs and the figure never share legible pixels", () => {
    const acts = rule(".tdg-acts {");
    expect(acts).toContain("opacity: 0");
    /* ⚠️ `visibility` TOO — an `opacity: 0` control still takes the pointer, and this one sits
       directly over the figure it replaces. */
    expect(acts).toContain("visibility: hidden");
    expect(acts).toContain("position: absolute");          // the same slot, so no reflow
    const css = readFileSync(join(here, "todoGroups.css"), "utf8");
    expect(css).toContain(".tdg-row:focus-within .tdg-acts { opacity: 1; visibility: visible; }");
    /* and the figure still fades, so the two are a swap rather than a stack */
    expect(css).toContain(".tdg-row:focus-within .tdg-figstack { opacity: 0.14; }");
  });

  /**
   * ⚠️ THE FIRST SLOT IS CONDITIONAL NOW, AND THE RULE IT BREAKS NO LONGER APPLIES. The
   * icon-cluster pack fixed that slot so every primary in a panel started at the same x. The
   * cluster is RIGHT-aligned, so a three-icon row and a four-icon row still END on the same edge
   * — and Done and Snoozed are whole GROUPS, not rows scattered through one, so no panel ever
   * mixes the two counts.
   */
  /**
   * ⚠️ THE REVERSAL ICON LEFT THE ROW WITH THE ⋯ (visual rebuild, Phase 2). Done and Snoozed kept
   * one constant verb each while the cluster had four slots; at two slots over a 104px figure the
   * survivors are the two that apply to EVERY row. Undo and Return are on the command bar, which
   * is where every other verb now lives — the same move, not a loss.
   */
  it("a STATE row carries the same two — the reversal is on the command bar now", () => {
    /* Snoozed and Done both render COLLAPSED, so their rows are not in the markup to count (see
       the fold cases below). The claim that matters is that no row anywhere draws a `prim` slot. */
    const html = render(cols({ todo: [card({ key: "k1" })], done: [card({ key: "s-done", done: true })] }));
    expect(html).not.toContain('class="tdg-ic prim');
    expect((html.match(/class="tdg-ic/g) ?? [])).toHaveLength(2); // the one live row's two
  });

  it("⚠️ NEITHER STATE GLYPH VARIES WITHIN ITS GROUP — that is why these two survived the cut", () => {
    expect(rowReversalIcon(card({ done: true }), "done")).toBe("undo");
    expect(rowReversalIcon(card({ taskType: "offer_received", done: true }), "done")).toBe("undo");
    expect(rowReversalIcon(card({}), "snoozed")).toBe("return");
    expect(rowReversalIcon(sweepCard({}), "snoozed")).toBe("return");
    /* and it is absent on all three KIND groups, whatever the card is */
    for (const c of [card({}), card({ taskType: "offer_received" }), sweepCard({}), card({ userTaskId: "t1" })]) {
      expect(rowReversalIcon(c, "todo")).toBeNull();
    }
  });

  it("⚠️ AN INAPPLICABLE ICON DIMS IN PLACE — it is NEVER removed, or the column would reflow", () => {
    /* An offer cannot be dismissed. The slot stays, greyed, with the reason in its label — an
       absent slot would shift every icon on that row out of line with the rows above it. */
    const offer = render(cols({ todo: [card({ key: "o1", taskType: "offer_received" })] }));
    expect((offer.match(/class="tdg-ic/g) ?? [])).toHaveLength(2);
    expect(offer).toContain("tdg-ic dz off");
    expect(offer).toContain("Offers cannot be dismissed");
    expect(rule(".tdg-ic.off")).toBeTruthy();
  });

  /**
   * ⚠️ THE DUPLICATION THAT WAS ONCE ACCEPTED IS NOW THE REASON THE SLOT IS GONE. This case used
   * to assert that a writer's own item completed from icon 1 AND from its tick, stated as a
   * decision: the slot was fixed and always drawn, so the alternative was a permanently dead icon
   * down the whole of "Your tasks". The slot is no longer fixed, so the alternative is simply not
   * drawing it — and a control that repeats the checkbox beside it has no argument left.
   */
  it("⚠️ A WRITER'S OWN ITEM HAS ONE COMPLETION CONTROL: THE CHECKBOX", () => {
    const mine = card({ key: "u1", userTaskId: "t1", kind: "", taskType: undefined, relatedRecordId: undefined, stream: "do", nature: "task" });
    const html = render(cols({ todo: [mine] }));
    expect(html).toContain("tdg-tick");                        // the circle, and only the circle
    expect(html).not.toContain('class="tdg-ic prim"');
    expect((html.match(/class="tdg-ic/g) ?? [])).toHaveLength(2);
    expect(rowReversalIcon(mine, "todo")).toBeNull();
    /* the WORD survives for the workspace pane's action row (Phase 5) — only the icon went */
    expect(rowPrimaryLabel(mine, "todo")).toBe("Complete");
  });

  it("⚠️ NOTHING AT REST, AND IT ARRIVES FOR A KEYBOARD TOO", () => {
    /* `:focus-within` is not decoration: hover alone would make the cluster a set of controls only
       a mouse can find. */
    expect(rule(".tdg-ic {")).toContain("opacity: 0");
    expect(cssDecls).toContain(".tdg-row:hover .tdg-ic,\n.tdg-row:focus-within .tdg-ic { opacity: 1; }");
    expect(cssDecls).toContain(".tdg-row:hover .tdg-ic.off,\n.tdg-row:focus-within .tdg-ic.off { opacity: 0.32; }");
  });

  it("⚠️ ON A COARSE POINTER IT IS PERMANENT — a hidden control on a phone is an absent one", () => {
    /* Keyed on the INPUT, never on the screen's width: a narrow desktop window still has a
       pointer, and a wide tablet still has none. */
    const i = cssDecls.indexOf("@media (pointer: coarse)");
    expect(i, "the coarse-pointer rule must exist").toBeGreaterThan(-1);
    const block = cssDecls.slice(i, cssDecls.indexOf("\n}", i));
    expect(block).toContain(".tdg-ic { opacity: 1; }");
    expect(block).toContain(".tdg-ic.off { opacity: 0.32; }");
  });
});

/**
 * ⚠️ TWO GLYPHS, NOT SEVEN (P3). The five KIND marks — send, close, offer, task, sweep — went with
 * the varying first icon. What is left is one constant reversal per STATE group.
 */
describe("⚠️ THE REVERSAL GLYPH IS THE STATE'S, AND THERE ARE ONLY TWO", () => {
  it("Done undoes, Snoozed returns, and every kind row has none", () => {
    expect(rowReversalIcon(card({ done: true }), "done")).toBe("undo");
    expect(rowReversalIcon(card({}), "snoozed")).toBe("return");
    expect(rowReversalIcon(card({}), "todo")).toBeNull();
    expect(rowReversalIcon(card({ taskType: "no_response_close" }), "todo")).toBeNull();
    expect(rowReversalIcon(card({ taskType: "offer_received" }), "todo")).toBeNull();
    expect(rowReversalIcon(sweepCard({}), "todo")).toBeNull();
  });

  it("⚠️ GLYPH AND WORD STILL CANNOT DISAGREE on the two rows that have both", () => {
    expect(rowReversalIcon(card({ done: true }), "done")).toBe("undo");
    expect(rowPrimaryLabel(card({ done: true }), "done")).toBe("Undo");
    expect(rowReversalIcon(card({}), "snoozed")).toBe("return");
    expect(rowPrimaryLabel(card({}), "snoozed")).toBe("Return");
  });

  /**
   * ⚠️ `rowPrimaryLabel` KEEPS ITS FIVE KIND BRANCHES ON PURPOSE — the workspace pane's action
   * row needs the named verb in Phase 5. Deleting the words with the glyphs would have taken the
   * pane's copy with them, and `TodoDock` currently derives the same verb a SECOND time
   * (`primaryLabel`); Phase 5 reconciles toward this one.
   */
  it("the WORDS survive the glyph cut, because the pane needs them", () => {
    expect(rowPrimaryLabel(sweepCard({}), "todo")).toBe("Start");
    expect(rowPrimaryLabel(card({ taskType: "no_response_close" }), "todo")).toBe("Close");
    expect(rowPrimaryLabel(card({}), "todo")).toBe("Action");
  });
});

/**
 * ⚠️ THE GLYPH CENSUS RETIRES WITH THE MAP IT COUNTED (visual rebuild, Phase 2). `REVERSAL_GLYPH`
 * existed so a key in the derivation could not render `undefined`; the row draws no kind glyph at
 * all now, and `rowReversalIcon` survives in `taskRow` for the command bar. What is left worth
 * asserting is that nothing was merely UNREFERENCED — an unused import is a map somebody re-wires.
 */
describe("⚠️ NO GLYPH MAP SURVIVES IN THE ROW", () => {
  it("the map and every icon it read are gone from the component, imports included", () => {
    expect(list).not.toContain("REVERSAL_GLYPH");
    expect(list).not.toContain("PRIMARY_GLYPH");
    /* ⚠️ ON DECLARATIONS — the file's own note names the six buckets ("Send · Decide · Chase …"),
       and reading prose as code fails a component that is correct. Fifth time this session. */
    for (const glyph of ["Send", "Archive", "Award", "ListChecks", "Undo2", "RotateCcw", "MoreHorizontal"]) {
      expect(code(list), glyph).not.toMatch(new RegExp(`\\b${glyph}\\b`));
    }
    /* the derivations themselves survive for the surfaces that DO draw them */
    const rowLib = readFileSync(join(here, "..", "..", "lib", "taskRow.ts"), "utf8");
    expect(rowLib).toContain("export function rowReversalIcon");
    expect(rowLib).toContain("export function rowPrimaryLabel");
  });
});

/**
 * ⚠️ THE TOOLTIP IS THE MITIGATION FOR USING GLYPHS AT ALL — not decoration, and not optional.
 * Four glyphs replaced a button that said "Action" in words; a paper plane does not carry "record
 * that you sent it". Every icon names its deed and teaches its key.
 */
describe("⚠️ EVERY ICON CARRIES A TOOLTIP, ON FOCUS AS WELL AS HOVER", () => {
  it("it is a component, never a `title` attribute", () => {
    /* `title` never appears on keyboard focus and never appears on touch — so on the two inputs
       that most need the teaching, it teaches nothing. */
    expect(tipSrc).toContain("export const RowTip");
    expect(list).toContain("onFocus={show}");
    expect(list).toContain("onMouseEnter={show}");
    const icon = list.slice(list.indexOf("const RowIcon"), list.indexOf("const SplitMenu") >= 0 ? list.indexOf("const SplitMenu") : list.length);
    expect(icon).not.toContain("title=");
  });

  it("⚠️ IT BUILDS ON `lib/deskTooltip` AND DOES NOT IMPORT THE DASHBOARD'S TOOLTIP", () => {
    /* Importing `StatTooltip` was permitted and would have worked — but it lives in
       components/dashboard/ with its CSS in dashboardV37.css, so the To-do page would have taken a
       dependency on the dashboard's component folder AND its stylesheet to draw a 30px tip. The
       placement maths is the part worth sharing and is already pure and unit-tested. */
    expect(tipSrc).toContain('from "../../lib/deskTooltip"');
    expect(code(tipSrc), "no dashboard IMPORT — the prose may name it, the code may not").not.toContain("dashboard");
    expect(code(list)).not.toContain("StatTooltip");
    /* …and it portals, or the top row's tip would be clipped by the scroll zone */
    expect(tipSrc).toContain("createPortal");
    expect(rule(".tdg-tip {")).toContain("position: fixed");
  });

  it("⚠️ A DIM ICON STAYS HOVERABLE AND FOCUSABLE — its tooltip is the only thing explaining it", () => {
    /* `disabled` on a button removes hover AND focus, so the explanation would be unreachable by
       either input. `aria-disabled` on a live button, with the click refused in the handler. */
    expect(list).toContain("aria-disabled={enabled ? undefined : true}");
    expect(code(list)).not.toContain("disabled={!enabled}");
    expect(list).toContain("if (enabled) onFire(e.currentTarget);");
    /* and the dim tooltip says WHY rather than repeating the name */
    expect(list).toContain("label={enabled ? label : (why ?? label)}");
  });

  it("the tip names the deed and shows the key, in the ref's two registers", () => {
    expect(tipSrc).toContain("{hint && <span className=\"tdg-tipk\">{hint}</span>}");
    expect(rule(".tdg-tipk")).toContain("JetBrains Mono");
    /* ⚠️ THREE KEYS, NOT FOUR (P3). `↵` left the cluster with the varying first icon: it is bound
       to OPEN now, on every group, so advertising it on a button that exists on two groups out of
       five would teach a key that means something else everywhere else. The reversal icon carries
       no hint for exactly that reason. */
    /* two keys now — `.` went to the command bar with the ⋯ it opened */
    for (const k of ['hint="S"', 'hint="X"']) expect(list).toContain(k);
    expect(list).not.toContain('hint="↵"');
    expect(list).not.toContain('hint="."');
  });
});

describe("⚠️ THE MENU: SAFE VERBS FIRST, DANGER BEHIND A DEAD ZONE", () => {
  const sections = (c: BoardCard, col: TodoColumnId = "todo") => splitMenu(c, col, laterHideKey(c.taskType));

  it("the ref's shape, in the ref's order — THIS QUERY, THIS ROW, then danger", () => {
    const secs = sections(card({}));
    expect(secs.map((x) => x.head)).toEqual(["THIS QUERY", "THIS ROW", null]);
    expect(secs[0].items.map((i) => i.label)).toEqual(["Open the query", "Edit last entry"]);
    expect(secs[1].items.map((i) => i.label)).toEqual(["Snooze…"]);
    expect(secs[2].items.map((i) => i.label)).toEqual(["Dismiss", "Stop showing this kind"]);
    expect(secs[2].danger).toBe(true);
  });

  it("⚠️ IT DUPLICATES SNOOZE AND DISMISS IN PLAIN LANGUAGE, WITH THEIR KEYS — deliberately", () => {
    /* That duplication is the safety net rather than a redundancy. The cluster asks the writer to
       learn a clock and a cross; anyone who never does reaches the same two deeds here, in words.
       And the keys are PRINTED, because the menu is where the glyphs are taught — a shortcut
       nobody is told about is a shortcut nobody has. */
    const flat = sections(card({})).flatMap((x) => x.items);
    expect(flat.find((i) => i.label === "Snooze…")!.hint).toBe("S");
    expect(flat.find((i) => i.label === "Dismiss")!.hint).toBe("X");
    expect(flat.find((i) => i.label === "Open the query")!.hint).toBe("O");
    expect(flat.find((i) => i.label === "Edit last entry")!.hint).toBe("E");
    /* the sheet prints them — the rule came BACK for this reason, having gone with the presets */
    expect(cssDecls).toContain(".tdg-mkey");
    expect(list).toContain('{it.hint && <span className="tdg-mkey" aria-hidden>{it.hint}</span>}');
  });

  it("⚠️ `Snooze…` OPENS THE DIAL — it does not snooze, and the MODEL says so", () => {
    /* `snooze-1` is only what the PERMISSION is asked about. Deciding "which id opens the dial" in
       the renderer would put that knowledge in a second place. */
    const snooze = sections(card({})).flatMap((x) => x.items).find((i) => i.label === "Snooze…")!;
    expect(snooze.opens).toBe("dial");
    expect(snooze.id).toBe("snooze-1");
    expect(list).toContain('onClick={() => (it.opens === "dial" ? onOpenDial() : onPick(it.id))}');
  });

  it("⚠️ A FINISHED CARD CANNOT BE SNOOZED, and the row says why rather than vanishing", () => {
    /* Planning verbs on a finished thing imply it is not finished — `cardMenu` collapses Done to
       its way back, and this takes its answer from there rather than deciding again. */
    const snooze = sections(card({ done: true }), "done").flatMap((x) => x.items).find((i) => i.label === "Snooze…")!;
    expect(snooze.enabled).toBe(false);
    expect(snooze.why).toMatch(/nothing left to put off/);
  });

  it("⚠️ THE 12px DEAD ZONE TAKES NO CLICK — Dismiss is never one slip from the row above it", () => {
    const dz = rule(".tdg-deadzone {");
    expect(dz).toContain("height: 12px");
    expect(dz).toContain("pointer-events: none");
    expect(dz).toContain("border-bottom: 1px solid");
  });

  it("⚠️ AN OFFER KEEPS ITS SNOOZE AND LOSES ITS DISMISS — greyed, never absent", () => {
    /* The ceiling still lives in `clampSnooze` and the dial still shows it; what the menu carries
       is the permission, and dismiss is the one an offer genuinely does not have. */
    const secs = sections(card({ taskType: "offer_received" }));
    const flat = secs.flatMap((x) => x.items);
    expect(flat.map((i) => i.label)).toHaveLength(5);             // nothing is hidden
    expect(flat.find((i) => i.label === "Snooze…")!.enabled).toBe(true);
    expect(reachableStops(card({ taskType: "offer_received" }))).toHaveLength(1);
    expect(flat.find((i) => i.label === "Dismiss")!.enabled).toBe(false);
    expect(flat.find((i) => i.label === "Dismiss")!.why).toMatch(/not yours to move/);
  });

  it("⚠️ THE PERMISSIONS ARE `cardMenu`'s — one answer to 'may this card do this'", () => {
    const stale = sections(card({ taskType: "no_response_close" })).flatMap((x) => x.items);
    expect(stale.find((i) => i.label === "Dismiss")!.enabled).toBe(true);
    /* "Edit last entry" maps to `edit-task`: on a derived card there is no entry of YOURS to
       edit, so it greys and says why rather than vanishing. */
    expect(stale.find((i) => i.label === "Edit last entry")!.enabled).toBe(false);
    const mine = sections(card({ userTaskId: "t1", taskType: undefined, relatedRecordId: undefined }));
    expect(mine.flatMap((x) => x.items).find((i) => i.label === "Edit last entry")!.enabled).toBe(true);
  });

  /**
   * ⚠️ "NOTHING IS PRE-FOCUSED" IS BACK, AND THAT IS A RETURN RATHER THAN A NEW RULE.
   *
   * It was suspended for exactly one pack, while this menu WORE the snooze dial: a control that
   * opens on tomorrow and commits on Enter earns its focus, and the act was reversible from its
   * own receipt. The menu is a column of VERBS again, so a pre-focused item would put Enter a slip
   * from Dismiss. Focus goes to the box, which answers Escape and fires nothing.
   */
  it("⚠️ NOTHING IS PRE-FOCUSED — Enter straight after opening does nothing", () => {
    expect(list).toContain("el.focus({ preventScroll: true });");
    expect(list).not.toContain("items[0]?.focus()");
    expect(code(list)).not.toContain("sec.dial");
  });

  /**
   * ⚠️ THE NUMBER KEYS STAY EXTINCT — `.tdg-mkey` DOES NOT, AND THE DISTINCTION MATTERS.
   *
   * `1` and `2` fired two preset snooze rows and went when the presets did. The CLASS that printed
   * them is back, for a different reason: the cluster made this menu the place the glyphs are
   * taught, so rows print the key they answer to. What must not come back is a binding to a row
   * that no longer exists.
   */
  it("the number-key constant and its handler are still gone", () => {
    expect(code(rowSrc)).not.toContain("SPLIT_NUMBER_KEYS");
    expect(code(list)).not.toContain("SPLIT_NUMBER_KEYS");
    /* the menu's keydown answers Escape and nothing else */
    expect(list).toContain('if (e.key === "Escape") { e.stopPropagation(); onClose(true); }');
    /* …and no hint anywhere is a bare digit: the keys printed are the CLUSTER's letters */
    for (const it of sections(card({})).flatMap((x) => x.items)) {
      if (it.hint) expect(it.hint).not.toMatch(/^[0-9]$/);
    }
  });

  /**
   * ⚠️ AND THE `?` OVERLAY IS GENUINELY UNAFFECTED — confirmed rather than assumed.
   *
   * The two tables were always separate: `KEY_MAP` (taskShortcuts) drives the overlay AND the
   * window handler, `SPLIT_NUMBER_KEYS` (taskRow) drove the menu alone. The overlay therefore
   * never advertised `1` or `2`, which is why removing them cannot leave it teaching a key that
   * does nothing — the exact failure the shell packs keep hitting from the other direction.
   */
  it("`KEY_MAP` never listed the number keys, so nothing in the map went stale", () => {
    const shortcuts = readFileSync(join(here, "..", "..", "lib", "taskShortcuts.ts"), "utf8");
    expect(shortcuts).not.toContain("SPLIT_NUMBER_KEYS");
    for (const k of KEY_MAP) expect(k.key).not.toMatch(/^[12]$/);
    /* the overlay is still built FROM the map, so handler and sheet cannot list different keys */
    expect(list).toContain("KEY_MAP.map((k) => (");
    expect(KEY_MAP.map((k) => k.key)).toContain("S");   // the dial's own key, still advertised
  });

  it("the menu wears the shell it always wore — consumed from todoBoard.css, never edited", () => {
    expect(list).toContain('className="t-f12 tbd-menu2 tdg-splitmenu"');
    const boardCss = readFileSync(join(here, "todoBoard.css"), "utf8");
    expect(boardCss).toContain(".tbd-menu2 {"); // live despite the retired board — see STATE.md
  });
});

/**
 * ⚠️ ONE SNOOZE SURFACE, FOUR DOORS ONTO IT (icon-cluster P2).
 *
 * The dial was worn INLINE in this menu for exactly one pack. That was the right shape while the
 * menu was the row's only control; with the cluster it would have been a SECOND snooze surface
 * beside icon 2 — and two surfaces for one act is how they come to disagree about a ceiling. The
 * body extraction survives (the popover still uses it), but only the popover mounts it.
 */
describe("⚠️ ONE SNOOZE SURFACE, AND FOUR WAYS IN", () => {
  it("the inline mount is RETIRED — the menu hands off, it does not wear a dial", () => {
    expect(code(list)).not.toContain("SnoozeDialBody");
    expect(code(list)).not.toContain("tdg-mdial");
    expect(cssDecls).not.toContain(".tdg-mdial");        // deleted, not left unreferenced
    /* the extraction itself stays: the popover is a wrapper around the body, and the body owns
       no popover machinery of its own */
    expect(dialSrc).toContain("export const SnoozeDialBody");
    const body = dialSrc.slice(dialSrc.indexOf("export const SnoozeDialBody"), dialSrc.indexOf("export const SnoozeDial:"));
    expect(body).not.toContain("createPortal");
    expect(body).not.toContain("addEventListener");
  });

  it("⚠️ ALL FOUR DOORS REACH THE SAME POPOVER — none was lost in the swap", () => {
    /* icon 2, the menu's `Snooze…` row, the `S` key, and Snoozed's "Change the date…". A refactor
       that quietly cost an entry point would be a regression wearing a tidy-up's clothes. */
    expect(list).toContain("<SnoozeDial");
    expect(list).toContain('onFire={(el) => setDial({ card: c, anchor: el })}');            // icon 2
    expect(list).toContain("onOpenDial={() => { setSplit(null); setDial({ card: split.card, anchor: split.anchor }); }}");
    expect(list).toContain('setDial({ card: c, anchor: el })');                             // the S key
    expect(dialSrc).toContain("<BrandDatePicker");                                          // the exact date
  });

  it("the write is still the page's own `onSnooze`, clamped inside the body", () => {
    expect(list).toContain("onSnooze={(days, when) => { setDial(null); onSnooze(dial.card, days, when); }}");
    expect(dialSrc).toContain("clampSnooze(card, days,");
  });

  it("258px — the one thing this menu overrides on the shell it consumes", () => {
    expect(rule(".tdg-splitmenu {")).toContain("width: 258px");
    const boardCss = readFileSync(join(here, "todoBoard.css"), "utf8");
    expect(boardCss).toContain("width: 228px");           // the shell's own, untouched
  });

  it("⚠️ AN INAPPLICABLE ROW STILL REUSES `.tbd-mi.dim` — no state rule of its own", () => {
    expect(cssDecls).toContain(".tbd-mi.dim, .tbd-mi:disabled");
    expect(list).toContain('className={`tbd-mi${it.enabled ? "" : " dim"}`}');
  });
});

/* ── 3. the panels and their headings ───────────────────────────────────────────────────────── */

describe("the panels: white sheets separated by SPACE, with the heading outside and above", () => {
  /**
   * ⚠️ THE PANEL DISSOLVED WITH THE SPLIT (P3). It was a white sheet of paper on a CREAM page; the
   * rail is white now, so a white card with a hairline and a lift sat on its own colour and read
   * as a box drawn for no reason. The element survives — the fold's stagger and the skeleton both
   * hang off it — but it paints nothing, and it keeps no horizontal padding either, because a
   * second inset would push the selected row's bleeding edge rule off the rail's gutter.
   */
  it("the panel paints nothing — the rail IS the sheet now", () => {
    const p = rule(".tdg-panel {");
    expect(p).not.toContain("background");
    expect(p).not.toContain("border");
    expect(p).not.toContain("box-shadow");
    expect(p).toContain("padding: 2px 0");
  });

  it("26px between sections, and NO hairline doing the separating", () => {
    expect(rule(".tdg-sect {")).toContain("margin-bottom: 26px");
    expect(rule(".tdg-shd {")).not.toContain("border-bottom");
  });

  /**
   * ⚠️ NO PLAYFAIR IN A GROUP HEADING (rail + workspace, Phase 1). The heading is a label saying
   * which pile you are in; the ROWS are the content. An 18px serif over every panel gave the
   * five headings the same weight as the work under them, and on a 440px rail that is the whole
   * left-hand column shouting its own filing system. Both headings demote — `.tdg-fold` is
   * Snoozed's, and one grammar for four panels plus a fold is the point.
   */
  /**
   * ⚠️ THE HEADING IS A TINTED BAND NOW (visual rebuild, Phase 3) — filled and bordered in the
   * group's own colour, with the label in that colour and the count at 60% of it. It stopped
   * being a line of text over a panel and became the panel's lid, which is what lets the subtitle
   * go: a band you can see is a section, and a section you can see does not need a sentence.
   */
  it("the heading is a band — fill, border and label all from one group triple", () => {
    const r = rule(".tdg-shd {");
    expect(r).toContain("background: var(--gband)");
    expect(r).toContain("border: 1px solid var(--gbd)");
    expect(r).toContain("padding: 7px 12px");
    expect(r).toContain("border-radius: 9px");
    expect(r).toContain("margin: 16px 2px 7px");
    const h = rule(".tdg-shd h3 {");
    expect(h).toContain('font-family: "JetBrains Mono"');
    expect(h).toContain("text-transform: uppercase");
    expect(h).toContain("color: var(--gfg)");
    expect(h).not.toContain("Playfair");
    /* the count is the label at lower volume, never a second colour */
    expect(rule(".tdg-shd .tdg-n {")).toContain("opacity: 0.6");
  });

  it("every live group carries its triple, and the class is on the SECTION", () => {
    for (const g of ["urgent", "housekeeping", "yours", "snoozed"]) {
      expect(cssDecls, g).toContain(`.tdg-sect.g-${g} {`);
    }
    expect(render(cols({ todo: [card()] }))).toContain('class="tdg-sect g-urgent"');
  });

  /**
   * ⚠️ THE SUBTITLES COME OUT, AND THE DERIVATION KEEPS THEM. `TaskGroup.description` is untouched
   * in `todoGroups` — other copy reads that module — but the rail does not render it. The band
   * and the count say what the sentence said.
   */
  it("⚠️ NO SUBTITLE REACHES A ROW GROUP", () => {
    const html = render(cols({ todo: [card()] }));
    expect(html).not.toContain("An agent is waiting");
    expect(html).not.toContain("tdg-desc");
    expect(code(list)).not.toContain("g.description");
  });

  it("rendered: the heading precedes its panel and is not inside it", () => {
    const html = render(cols({ todo: [card()] }));
    expect(html.indexOf("tdg-shd")).toBeLessThan(html.indexOf("tdg-panel"));
    expect(html).toContain("Urgent");
    /* the description is NOT rendered any more — the band and the count say it (Phase 3) */
    expect(html).not.toContain("An agent is waiting, or a date is.");
  });

  it("an EMPTY group renders nothing at all — not a panel with a heading over it", () => {
    const html = render(cols({ todo: [card()] }));
    expect(html).not.toContain("Housekeeping");
    expect(html).not.toContain("Your tasks");
  });
});

describe("⚠️ FIVE FAMILY TONES, AND THE CSS COPY IS LOCKED TO `todoFamily`'s MAP", () => {
  /* ⚠️ SUPERSEDES P3's NINE PER-KIND TONES — and it is not the reversal it looks like. That set
     was written against a real fault: a family-coloured pill "said one thing twice while the thing
     a pill is FOR, which kind of work this is, went unsaid". The complaint was about a pill
     carrying the family in BOTH its colour and its words. Here the WORDS still name the kind —
     Offer, Chase, Data gap, Stale — and only the hue drops to the family, so the kind is still
     said, in the register that can actually say it. Nine hues were never legible as nine meanings.

     CSS cannot read TypeScript, so the tones are restated in the stylesheet, and the moment they
     are restated they are a second copy. This is what stops it being a silent one — the same
     arrangement FAMILY_BAND has lived under since the board. */
  const TONES: PillTone[] = ["urgent", "housekeeping", "yours", "done", "snoozed"];

  it("every tone has a rule, every rule has a tone, and no `tone-` class survives", () => {
    for (const t of TONES) expect(rule(`.tdg-pill.fam-${t} {`), t).toContain("background:");
    const declared = [...css.matchAll(/\.tdg-pill\.fam-([a-z]+) \{/g)].map((m) => m[1]);
    expect(declared.sort()).toEqual([...TONES].sort());
    expect(css).not.toContain(".tdg-pill.tone-");
  });

  it("⚠️ THE CSS VALUES ARE `FAMILY_PILL`'s, ASSERTED AGAINST IT rather than against literals", () => {
    /* A hex on each side goes green the day someone changes both in the same wrong direction. */
    for (const t of TONES) {
      const r = rule(`.tdg-pill.fam-${t} {`);
      expect(r, t).toContain(`background: ${FAMILY_PILL[t].bg}`);
      expect(r, t).toContain(`color: ${FAMILY_PILL[t].tx}`);
      expect(r, t).toContain(`border: 1px solid ${FAMILY_PILL[t].bd}`);
    }
  });

  it("⚠️ THE TONE IS `liveFamily`'s ANSWER, not a fourth derivation of the same facts", () => {
    /* The pill, the group heading and the sidebar badge cannot file one card three ways. */
    expect(rowPill(card({ kind: "OFFER", stream: "do" }), "todo")!.tone).toBe("urgent");
    expect(rowPill(card({ kind: "STALE", stream: "hk" }), "todo")!.tone).toBe("housekeeping");
    expect(rowPill(card({ kind: "NOTE", userTaskId: "t1" }), "todo")!.tone).toBe("yours");
    /* …and the two STATES still beat the family, as they always did */
    expect(rowPill(card({ kind: "OFFER", stream: "do", done: true }), "done")!.tone).toBe("done");
    expect(rowPill(card({ kind: "OFFER", stream: "do" }), "snoozed")!.tone).toBe("snoozed");
  });

  it("the pill is an inline clause now — no fixed width to pad every short kind", () => {
    const r = rule(".tdg-pill {");
    expect(r).not.toContain("width: 124px");
    expect(r).toContain("white-space: nowrap");
  });

  /**
   * ⚠️ THE WORDS ARE THE CARD'S OWN `kind`, AND THAT IS WHAT MAKES THE FAMILY TONE HONEST. A
   * per-kind label table here would be a SECOND vocabulary beside the one the facet chips, the
   * snoozed band and the counting law all already speak — and it is precisely because the words
   * still carry the kind that the HUE is free to carry the family. The two halves of the pill say
   * different things; that is the whole arrangement.
   */
  it("⚠️ THE WORDS ARE THE CARD'S OWN `kind` — five kinds, one family, one tone", () => {
    expect(rowPill(card({ kind: "AGENT WAITING", stream: "do" }), "todo")).toEqual({ label: "AGENT WAITING", tone: "urgent" });
    /* five DIFFERENT kinds inside the housekeeping lane, each keeping its own word */
    for (const kind of ["CHASE", "CLOSE", "DATA GAP", "MATERIALS", "STALE"]) {
      const pill = rowPill(card({ kind, stream: "hk" }), "todo")!;
      expect(pill.label, kind).toBe(kind);
      expect(pill.tone, kind).toBe("housekeeping");
    }
    expect(rowPill(card({ kind: "YOUR TASK", userTaskId: "t" }), "todo")?.tone).toBe("yours");
    expect(rowPill(card({ kind: "NOTE", nature: "note" }), "todo")?.tone).toBe("yours");
  });

  it("⚠️ STATE BEATS KIND — done and snoozed are consulted before the task type", () => {
    /* A finished thing is finished whatever it was; a sleeping one reads as sleeping. Same
       precedence `cardFamily` uses for the band families, restated for the finer set. */
    expect(rowPill(card({ kind: "OFFER", taskType: "offer_received", done: true }), "done")?.tone).toBe("done");
    expect(rowPill(card({ kind: "AGENT WAITING · 🕐" }), "snoozed")?.tone).toBe("snoozed");
  });

  it("⚠️ A SNOOZED CARD KEEPS ITS OWN KIND IN THE WORDS — only its tone sleeps", () => {
    /* The ref draws a bare "SNOOZED" pill. tasksAuditGrammar locks the opposite WITH ITS REASON:
       a row that forgets what it is while it sleeps tells you nothing about what will return. */
    expect(rowPill(card({ kind: "AGENT WAITING · 🕐" }), "snoozed")?.label).toBe("AGENT WAITING · 🕐");
  });

  it("an empty kind draws NO pill — chrome with nothing in it reads as a load failure", () => {
    expect(rowPill(card({ kind: "" }), "todo")).toBeNull();
    expect(render(cols({ todo: [card({ key: "u2", userTaskId: "t2", kind: "" })] }))).not.toContain("tdg-pill");
  });
});

describe("⚠️ THE METER NAMES THE STAGE, and it is a function of the TASK TYPE", () => {
  /* The engine only raises a `full_requested` task for a query that IS at full-requested — the
     status is what produced the task — so reading the query again to place the marker would be a
     second derivation of a fact the first already carries. Same argument todoGroups is built on. */
  it("the three stages are the submission's own, and an offer lights all of them", () => {
    expect(rowJourney(card({ taskType: "offer_received" }), "todo"))
      .toEqual({ stages: ["done", "done", "done"], label: "OFFER ON THE TABLE" });
    expect(rowJourney(card({ taskType: "partial_requested" }), "todo"))
      .toEqual({ stages: ["done", "now", "todo"], label: "PARTIAL REQUESTED" });
    expect(rowJourney(card({ taskType: "full_requested" }), "todo"))
      .toEqual({ stages: ["done", "done", "now"], label: "FULL REQUESTED" });
    expect(rowJourney(card({ taskType: "revise_resubmit" }), "todo"))
      .toEqual({ stages: ["done", "done", "now"], label: "REVISION IN HAND" });
  });

  it("a pile, a writer's own task and a silence have NO journey — the track simply stays empty", () => {
    for (const c of [sweepCard(), card({ taskType: "no_response_close" }), card({ userTaskId: "t", taskType: undefined }), card({ taskType: "nudge_overdue" })]) {
      expect(rowJourney(c, "todo"), c.taskType ?? "user").toBeNull();
    }
    expect(rowJourney(card({ taskType: "full_requested" }), "done")).toBeNull();
    expect(rowJourney(card({ taskType: "full_requested" }), "snoozed")).toBeNull();
  });

  it("⚠️ THE METER LEFT THE ROW, AND ITS DERIVATION DID NOT (visual rebuild, Phase 2)", () => {
    /* The row is four tracks now — checkbox, bucket pill, content, figure — and the meter had no
       lane and no room inside the content cell beside a two-line deed. `rowJourney` is untouched
       and the WORKSPACE CARD draws it, where a journey is something you read rather than scan. */
    expect(code(list)).not.toContain("rowJourney");
    expect(code(list)).not.toContain("tdg-jrny");
    const rowLib = readFileSync(join(here, "..", "..", "lib", "taskRow.ts"), "utf8");
    expect(rowLib).toContain("export function rowJourney");
  });

  it("(retired) a journey and a pile never appeared together", () => {
    expect(true).toBe(true);
  });
});

describe("⚠️ THE PRIMARY'S NAME IS PER KIND; WHETHER IT EXISTS IS THE MENU'S ANSWER", () => {
  it("the ref's verbs, each on its own kind", () => {
    expect(rowPrimaryLabel(sweepCard(), "todo")).toBe("Start");
    expect(rowPrimaryLabel(card({ taskType: "no_response_close" }), "todo")).toBe("Close");
    expect(rowPrimaryLabel(card({ taskType: "full_requested" }), "todo")).toBe("Action");
    expect(rowPrimaryLabel(card({}), "snoozed")).toBe("Return");
    expect(rowPrimaryLabel(card({ done: true }), "done")).toBe("Undo");
  });

  it("⚠️ THE VERB IS NO LONGER ON THE ROW AT ALL — the derivation stands, its icon does not", () => {
    /* ⚠️ THE WORD MOVED TWICE. The split button PRINTED it; the cluster drew it as a glyph with
       the name in `aria-label`; the rail draws neither, because on a kind row the deed is what
       clicking the row does. `rowPrimaryLabel` survives untouched for the workspace pane's action
       row (Phase 5) — which is the surface that will print the word again. */
    const stale = render(cols({ todo: [card({ key: "st", stream: "hk", kind: "STALE", taskType: "no_response_close" })] }));
    expect(stale).not.toContain('aria-label="Close"');
    expect(render(cols({ todo: [sweepCard({ key: "sw" })] }))).not.toContain('aria-label="Start"');
    /* the derivation is intact — this is a RENDER change, not a model one */
    expect(rowPrimaryLabel(card({ taskType: "no_response_close" }), "todo")).toBe("Close");
    expect(rowPrimaryLabel(sweepCard({}), "todo")).toBe("Start");
  });

  /* ⚠️ TWO OF THE REF'S THIRTEEN ROWS ARE NOT BUILT, AND THAT IS THE LAW RATHER THAN AN OMISSION.
     DEADLINE ("Review") has no task type — nothing in the engine raises an expiring exclusive —
     and DISMISSED ("Restore") belongs to the Task-settings ledger, not to a group on this page.
     The shell renders what exists, never what is planned. */
  it("no verb exists for a kind nothing can raise", () => {
    const lib = readFileSync(join(here, "..", "..", "lib", "taskRow.ts"), "utf8");
    expect(code(lib)).not.toContain("Review");
    expect(code(lib)).not.toContain("Restore");
  });
});

/* ── 4. the folds ───────────────────────────────────────────────────────────────────────────── */

describe("⚠️ ONLY HOUSEKEEPING FOLDS — and the urgent group and Done never do", () => {
  const hk = (n: number) => Array.from({ length: n }, (_, i) =>
    card({ key: `h${i}`, stream: "hk", kind: "STALE", taskType: "no_response_close", title: `Silent ${i}` }));

  it("`groupSlice` refuses every group but housekeeping — the component does not decide it", () => {
    const g = taskGroups(cols({ todo: hk(9) }));
    const house = g.find((x) => x.id === "housekeeping")!;
    expect(groupSlice(house, false).more).toBe(9 - HOUSEKEEPING_VISIBLE);
    const urgent = taskGroups(cols({ todo: Array.from({ length: 9 }, (_, i) => card({ key: `u${i}` })) }))
      .find((x) => x.id === "urgent")!;
    expect(groupSlice(urgent, false).more).toBe(0);
  });

  it("the fold states the figure it is holding back, so it is a choice rather than a surprise", () => {
    expect(render(cols({ todo: hk(9) }))).toContain("SHOW 5 MORE");
  });

  /**
   * ⚠️ SUPERSEDED, AND IT IS A REAL REVERSAL — flagged in the run report rather than slipped in.
   *
   * This asserted that Done rendered its rows OPEN, on the grounds that "hiding the only evidence
   * the day went anywhere was a concession to a 250px panel that no longer exists". The v9 pack
   * asks for the opposite: completed rows leave their group and gather under a collapsible
   * `Done today` header at the foot.
   *
   * ⚠️ THE OLD LAW'S CONCERN IS HONOURED RATHER THAN OVERRULED. Its worry was that the day's work
   * would become invisible; the header STATES THE COUNT whether it is open or shut, so the
   * evidence is still on the page. What changes is that cleared work is stated rather than
   * displayed — which is the pack's own argument: a ticked row sitting among live ones is a row
   * you have to re-read to know you have finished it.
   */
  it("⚠️ DONE GATHERS AT THE FOOT, COLLAPSED — and still states its count", () => {
    const html = render(cols({ done: [card({ key: "d2", done: true, title: "Reply to Curtis Vane" })] }));
    expect(html).toContain("tdg-dnhead");
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain("Reply to Curtis Vane");   // stated, not displayed
    expect(html).toContain('class="n">1<');               // …and the count is the statement
  });

  it("SNOOZED is the one group that collapses — you asked for less of it on purpose", () => {
    const html = render(cols({ snoozed: [card({ key: "z2", title: "Marcus Reed — back Monday" })] }));
    expect(html).toContain("tdg-fold");
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain("Marcus Reed — back Monday");
  });
});

describe("⚠️ THE RIGHT LANE NEVER MIRRORS ITS NEIGHBOUR — one figure, stated once", () => {
  /* The board's band grammar carried this law and the list inherited the fault: a sweep nobody
     has started takes `c.due` as its METER label ("16 TO FIX"), and the age lane read the same
     field — so the row printed one figure twice, side by side. Browser-measured, 9 Aug. */
  it("⚠️ THE AGE LANE'S WHOLE PROBLEM WENT WITH THE LANE (visual rebuild, Phase 2)", () => {
    /* The fault this guarded: a sweep nobody has started takes `c.due` as its METER label ("16 TO
       FIX") and the age lane read the same field, so the row printed one figure twice. There is no
       age lane and no meter on the row now — the FIGURE column derives from the clock and the
       stated window, never from `due`. The mirror is impossible rather than merely absent. */
    expect(code(list)).not.toContain("tdg-age");
    expect(code(list)).not.toContain("c.due");
  });

  it("⚠️ THE AGE IS A CAPTION CLAUSE NOW, and its old right-aligned cell is gone with its lane", () => {
    /* `.tdg-cr`'s whole job was keeping a right-aligned figure off the primary button's ink fill.
       The age sits on the caption line and the button it was avoiding is gone from four groups
       out of five, so the cell has nothing left to do. */
    expect(css).not.toContain(".tdg-cr {");
    expect(rule(".tdg-age {")).toContain("white-space: nowrap");
    /* it inherits the caption's type rather than restating it — one voice on that line */
    expect(rule(".tdg-age {")).not.toContain("font-size");
  });
});

describe("⚠️ THE STRIKE GOES ON THE TITLE, NEVER THE ROW", () => {
  /* If the row is struck, the completion time and the Undo control are struck with it — the two
     things a finished row exists to offer. (Carried from todoFinishing, whose host page changed
     twice while the primitive never did.) */
  it("the line-through is scoped to the title inside a done row — BOTH its weights", () => {
    /* ⚠️ THE BOLD NAME TAKES IT TOO, or a struck sentence keeps one word standing upright. */
    const r = rule(".tdg-row.done .tdg-t,");
    expect(r).toContain("text-decoration: line-through");
    expect(r).toContain(".tdg-t b");
    expect(css).not.toMatch(/\.tdg-row\.done \{[^}]*line-through/);
  });
});

/* ── 5. the page's wiring ───────────────────────────────────────────────────────────────────── */

describe("the page wires the list to its EXISTING primitives, and to nothing new", () => {
  it("the ⋯ verbs go to the same performer the board's menu used", () => {
    expect(page).toContain("onVerb={(c, v, column) => performCardVerb(c, v, column)}");
  });

  it("the tick is the page's ONE completion path, and the row's door is the dock", () => {
    expect(page).toContain("onTick={(c) => void quickDone(c)}");
    expect(page).toContain("onOpen={(c) => openDock(c.key)}");
  });

  it("the group → column map exists because the MENU speaks states, not columns", () => {
    expect(groupColumn("urgent")).toBe("todo");
    expect(groupColumn("housekeeping")).toBe("todo");
    expect(groupColumn("yours")).toBe("todo");
    expect(groupColumn("snoozed")).toBe("snoozed");
    expect(groupColumn("done")).toBe("done");
  });

  it("the icon doors are gone; the split's caret is the one way to the menu (Fix 4)", () => {
    /* P2 gave the row three icon buttons and routed each through a pre-opened submenu. Fix 4
       replaces all three with one control, so the doors went with them. The DIAL survives — it is
       still the snooze surface the ⋯ grammar reaches — and the split's own tiers resolve through
       the same `clampSnooze` ceiling, so there is still one ceiling. */
    expect(code(list)).not.toContain("openMenu(e, c, column");
    expect(list).toContain("<SplitMenu");
    expect(list).toContain("<SnoozeDial");
  });
});

describe("the header block: mono eyebrow → Playfair title → tool row → stat chips", () => {
  it("⚠️ THE EYEBROW IS RETIRED (corrections, Phase 4) — its derivation is not", () => {
    /* A date line above a page that shows dates on every row is chrome restating its own content.
       `tasksEyebrow` stays pure and locked in `todoGroups`; the page stopped passing it. */
    expect(page).not.toContain("eyebrow={");
    expect(tasksEyebrow("MONDAY 4 AUGUST", "week nine")).toBe("MONDAY 4 AUGUST · WEEK NINE OF QUERYING");
  });


  it("the chips stand at 38px on a full radius, with Playfair figures", () => {
    const s = rule(".tdg-stat {");
    expect(s).toContain("height: 38px");
    expect(s).toContain("border-radius: 99px");
    expect(rule(".tdg-stat b {")).toContain('font-family: "Playfair Display"');
  });

  it("⚠️ THE HEADER STATES NO FIGURES AT ALL — so a first-run panel cannot state any", () => {
    /* ⚠️ THE STAT CHIPS ARE RETIRED (one-primary pass follow-up) — they restated the control
       bar's own `{n} outstanding` and the group headings' own counts, three inches apart. The
       header states NO figures now; the figure lives beside the thing it counts. */
    expect(code(page)).not.toContain("tdg-stats");
    expect(code(page)).not.toContain("taskStats(");
    /* the desk states remain the page's own branch, unchanged */
    expect(page).toContain('desk === "new-desk" ? renderNewDesk()');
  });
});

describe("⚠️ THE DESK STATES READ UNFILTERED — a search can never fake a clear desk", () => {
  it("`deskState` is fed the raw lanes, never the narrowed ones", () => {
    expect(page).toContain("deskState({ queryCount: queries.length, agentCount: agents.length, urgent: board.do.length");
    expect(page).not.toContain("deskState({ queryCount: narrow");
  });

  it("desk-clear's mount is RE-EARNED here, and first-run-board stays distinct from it", () => {
    /* The two states are NOT YET and WELL DONE — same page, opposite meanings, so they stay two
       briefs and never one asset reused. */
    const cleared = page.slice(page.indexOf("function renderDeskCleared"), page.indexOf("function renderDeskCleared") + 1400);
    expect(cleared).toContain('<ArtSlot name="desk-clear"');
    expect(cleared).not.toContain("first-run-board");
  });
});

/* ── 6. the snooze dial (Phase 4) ───────────────────────────────────────────────────────────── */

describe("⚠️ THE DIAL NAMES THE DATE BEFORE YOU COMMIT TO IT", () => {
  /* That is the whole reason it replaced a tier menu: "Give it a week" is a promise about a date
     you then have to work out yourself, and the one thing a writer wants to know before putting
     an agent's request away is exactly which morning it comes back. */
  it("the resulting day is spelled, weekday first", () => {
    const monday = new Date(2026, 7, 10); // Monday 10 August 2026
    expect(dialDateLine(1, monday)).toBe("Tuesday 11 August");
    expect(dialDateLine(7, monday)).toBe("Monday 17 August");
  });

  it("it is the HEADLINE, in Playfair, above the track — not a caption under it", () => {
    const v = rule2(".snz-v {");
    expect(v).toContain('font-family: "Playfair Display"');
    expect(v).toContain("font-size: 19px");
    expect(dialSrc.indexOf('className="snz-v"')).toBeLessThan(dialSrc.indexOf('className="snz-track"'));
  });
});

describe("⚠️ THE CEILING IS THE TRACK'S OWN LENGTH — the knob cannot reach what it may not write", () => {
  const offer = card({ taskType: "offer_received" });

  it("an offer's dial has ONE stop, and says why", () => {
    expect(reachableStops(offer).map((s) => s.days)).toEqual([1]);
    expect(dialSrc).toContain("Offers stop at tomorrow — an offer left waiting is an offer at risk.");
  });

  it("a deadline stops at the deadline; every tier below it survives", () => {
    expect(reachableStops(card({}), 10).map((s) => s.days)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(reachableStops(card({}), 0)).toEqual([]);   // already past — nothing honest to offer
  });

  /**
   * ⚠️ THE TRACK IS THE WHOLE SCALE AND THE HATCH IS THE CEILING (Fix 4 revision, Phase 3).
   *
   * The dial used to render ONLY the reachable stops, so a shortened track was the sole sign a
   * ceiling existed — and a track that quietly ends early reads as "there is nothing past here"
   * rather than "you may not go past here". Those are different sentences, and only one of them
   * is true. `reachableStops` still decides what may be WRITTEN; the hatch is presentation over
   * that same answer.
   */
  it("the full twelve are drawn, and `reachableStops` decides only how far the knob goes", () => {
    /* ⚠️ ANCHOR BEFORE YOU SLICE — and this case caught itself doing the opposite. It first read
       `dialSrc.toContain("SNOOZE_STOPS.map")` and PASSED with the track neutered back to the
       pre-fix `reach.map`, because the AXIS block a few lines below walks the same table and the
       whole-file search found that instead. Two blocks, two maps; the assertion has to say which
       one it means. */
    const a = dialSrc.indexOf('<div className="snz-track">');
    const b = dialSrc.indexOf('<div className="snz-ticks">');
    expect(a, "the track block must exist").toBeGreaterThan(-1);
    expect(b, "the ticks block must follow it").toBeGreaterThan(a);
    const track = dialSrc.slice(a, b);

    expect(track).toContain("SNOOZE_STOPS.map((s, n) =>");     // the track walks the WHOLE scale
    expect(track).not.toContain("reach.map(");                 // …never the reachable subset
    expect(dialSrc).toContain("const maxI = reach.length - 1");// and the reach walks the ceiling
    expect(track).toContain("max={maxI}");                     // the knob physically stops there
    /* the stop past the ceiling stays drawn, faintly — the scale is the same scale on every card */
    expect(track).toContain('${n > maxI ? " out" : ""}');
    expect(rule2(".snz-stop.out")).toContain("background:");
  });

  it("⚠️ THE HATCH TAKES NO POINTER EVENTS — the operable range sits beneath it", () => {
    /* An overlay that swallowed clicks would make the dial feel broken at exactly the moment a
       limit applies: the reachable part of the track must still take a click. */
    const bar = rule2(".snz-bar");
    expect(bar).toContain("repeating-linear-gradient(-45deg");
    expect(bar).toContain("pointer-events: none");
    expect(bar).toContain("right: 0");
  });

  it("⚠️ AND THE CLAMP IS STILL CALLED ON THE WAY OUT, though the knob should never reach it", () => {
    /* A guard you rely on being unnecessary is a guard you have stopped having. */
    expect(dialSrc).toContain("clampSnooze(card, days,");
  });
});

describe("⚠️ THE DIAL SAYS TWO THINGS, AND THE DATE IS ONE OF THEM EVERYWHERE IT MATTERS", () => {
  it("Playfair says how LONG, mono says WHICH DAY — two facts, not one twice", () => {
    /* The readout used to be the spelled date alone. At five stops the duration was nearly
       guessable from the knob; at twelve it is not, so it is stated — and printing the same date
       in two fonts would have said one fact twice and left the other unsaid. */
    expect(dialSrc).toContain('<span className="snz-v">{stopTitle(cur.tick)}</span>');
    expect(dialSrc).toContain('<span className="snz-date">{dialDateShort(cur.days)}</span>');
    expect(dialDateShort(1, new Date(2026, 7, 10))).toBe("TUE 11 AUG");
    /* the spelled form survives where it is worth most: spoken to assistive technology */
    expect(dialSrc).toContain("aria-valuetext={`${cur.tick} — ${dialDateLine(cur.days)}`}");
  });

  it("⚠️ THE BUTTON CARRIES THE DATE IT WILL WRITE — one formatter with the receipt", () => {
    expect(dialSrc).toContain("Snooze until {snoozeDateLabel(cur.days)}");
    expect(snoozeDateLabel(1, new Date(2026, 7, 10))).toBe("Tuesday");   // a weekday at one day
    expect(snoozeDateLabel(21, new Date(2026, 7, 10))).toBe("31 August");
  });

  it("⚠️ IT OPENS ON TOMORROW — the commonest move stays open-then-Enter", () => {
    expect(dialSrc).toContain("const [i, setI] = useState(0);");
    expect(SNOOZE_STOPS[0].days).toBe(1);
    expect(dialSrc).toContain('if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); commit(cur.days); return; }');
  });

  it("⚠️ SHIFT+ARROW TRAVELS THE PRINTED AXIS, and is clamped like every other movement", () => {
    /* A jump whose destination the reader cannot see is a jump they have to learn; these four are
       drawn on the ruler. Plain arrows stay the platform's — the range input already moves one
       stop per press, and reimplementing that would be worse than free. */
    expect(dialSrc).toContain("if (!e.shiftKey) return;                       // plain arrows are the platform's");
    expect(dialSrc).toContain("setI(Math.max(0, Math.min(next, maxI)));");
    for (const k of ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"]) expect(dialSrc).toContain(k);
  });

  it("the axis marks are positioned on their stops, not spaced evenly", () => {
    /* 1D is index 0 of 12, 1W is 6, 1M is 9 — evenly spaced would put "1M" at a third of the
       track while its stop sits at four fifths. A ruler with its numbers in the wrong places is
       worse than no ruler. (The one deliberate departure from the ref, which draws them
       `space-between` — a static mockup's shortcut.) */
    expect(dialSrc).toContain('style={{ left: `${pctOf(n)}%` }}');
    expect(rule2(".snz-ticks")).toContain("position: relative");
    expect(rule2(".snz-ticks span")).toContain("position: absolute");
  });

  it("an ordinary card gets the whole ladder", () => {
    expect(reachableStops(card({})).map((s) => s.days)).toEqual(SNOOZE_STOPS.map((s) => s.days));
  });

  it("⚠️ AND THE CLAMP IS STILL CALLED ON THE WAY OUT — a guard you rely on being unnecessary", () => {
    expect(dialSrc).toContain("clampSnooze(card, days,");
  });

  it("a dial with nothing to choose says so rather than drawing an unusable track", () => {
    expect(dialSrc).toContain("This one cannot be put off — its date has already passed.");
  });
});

describe("⚠️ TWO REGISTERS OF ONE FACT, PAIRED AT THE SOURCE", () => {
  it("every stop carries BOTH its prose and its terse tick — never a second table in the view", () => {
    for (const s of SNOOZE_STOPS) {
      expect(s.label.length, s.label).toBeGreaterThan(0);
      expect(s.tick, s.label).toMatch(/^[A-Z0-9 ]+$/);
    }
    expect(SNOOZE_STOPS.find((s) => s.days === 1)).toMatchObject({ label: "tomorrow", tick: "TOMORROW" });
  });
});

describe("⚠️ THE OPERABLE LAYER IS A REAL RANGE INPUT UNDER A PAINTED TRACK", () => {
  /* Dragging, clicking the track, arrow keys, Home/End and assistive technology all come from the
     platform. A bespoke `pointermove` gives the first two and reimplements the rest badly. */
  it("the control is a range input, transparent, over the painted track", () => {
    expect(dialSrc).toContain('type="range"');
    expect(rule2(".snz-range {")).toContain("opacity: 0");
    expect(rule2(".snz-range {")).toContain("position: absolute");
    expect(code(dialSrc)).not.toContain("pointermove"); // on declarations — the head note names it
  });

  it("it announces the value in words, since the thing you operate is invisible", () => {
    expect(dialSrc).toContain("aria-valuetext=");
    expect(dialSrc).toContain('aria-label="How long to put it off"');
  });

  it("⚠️ AND FOCUS IS PAINTED ON THE KNOB — a keyboard-operable dial that shows nothing is worse", () => {
    expect(dialCss).toContain(".snz-range:focus-visible + .snz-knob");
  });
});

describe("the dial writes through the page's ONE snooze primitive", () => {
  it("it hands over an already-clamped value; the page performs it", () => {
    expect(page).toContain("onSnooze={(c, days, when) => snoozeCard(c, days, when)}");
  });

  it("ONE PICKER app-wide for the exact date, with the ceiling as its max", () => {
    expect(dialSrc).toContain("<BrandDatePicker");
    expect(dialSrc).toContain("max={ymd(new Date(Date.now() + ceiling * 86400000))}");
  });
});

/* ── 7. the sticky group headings ───────────────────────────────────────────────────────────── */

describe("⚠️ THE GROUP HEADING STICKS, BOUNDED BY ITS OWN SECTION", () => {
  const shd = () => rule(".tdg-shd {");

  it("it is sticky to the zone's top, above the panel", () => {
    expect(shd()).toContain("position: sticky");
    expect(shd()).toContain("top: 0");
    expect(shd()).toContain("z-index: 2");
    /* `fixed` would take it out of flow and leave a hole where the heading was — and it would
       never release, because a fixed box has no parent to be bounded by. */
    expect(shd()).not.toContain("position: fixed");
  });

  it("⚠️ THE RELEASE IS THE PARENT'S DOING — no listener, no observer, nothing to keep in step", () => {
    /* Sticky is bounded by its containing block, so `.tdg-sect` is what pushes the heading out as
       its own rows run out — which is exactly "release when the next group's heading arrives".
       The heading must therefore be a CHILD of the section, not a sibling of it. */
    const html = render(cols({ todo: [card()] }));
    const at = html.indexOf('class="tdg-sect g-');
    expect(at, "the section marker is gone — this slice would read the whole document").toBeGreaterThan(-1);
    const sect = html.slice(at);
    expect(sect.indexOf("tdg-shd")).toBeLessThan(sect.indexOf("tdg-panel"));
    expect(decls(list)).not.toContain("IntersectionObserver");
    expect(decls(list)).not.toContain("scrollTop");
  });

  it("⚠️ NOTHING BETWEEN THE HEADING AND THE ZONE MAY DECLARE OVERFLOW", () => {
    /* THE SILENT FAILURE THIS FORBIDS: `position: sticky` resolves against the nearest ancestor
       with a scroll mechanism. An `overflow: hidden` on `.tdg` or `.tdg-sect` — added for any
       innocent reason — makes THAT box the reference instead of `.tpl-zone`. It never scrolls, so
       the heading simply stops sticking: no error, no warning, and the page looks correct at rest.
       `.tpl-zone` is the one declared scroller (locked in tasksViewport). */
    for (const sel of [".tdg {", ".tdg-sect {"]) {
      expect(rule(sel), sel).not.toContain("overflow");
    }
  });

  /**
   * ⚠️ THE FADE IS RETIRED AND ITS JOB IS NOT (visual rebuild, Phase 3). The heading painted a
   * gradient of the page ground so rows slid UNDER it rather than reading through the words. It is
   * a filled, bordered BAND now — a solid fill does that job better than a fade, and it does it
   * without having to keep two ends of a gradient agreeing about a colour.
   *
   * The requirement that survives is the one that mattered: the heading must be OPAQUE where the
   * words are. A transparent band would put a row's text through a group label at every scroll.
   */
  it("⚠️ IT PAINTS ITS OWN GROUND — a solid band, so rows cannot read through the words", () => {
    const r = shd();
    expect(r).toContain("background: var(--gband)");
    expect(r).not.toContain("linear-gradient");
    /* every group's fill is opaque — no alpha channel anywhere in the triples */
    for (const g of ["urgent", "housekeeping", "yours", "snoozed"]) {
      const t = rule(`.tdg-sect.g-${g} {`);
      expect(t, g).toMatch(/--gband:\s*#[0-9a-f]{6}/i);
      expect(t, g).not.toContain("rgba");
    }
  });

  it("⚠️ AND THAT GROUND MUST EQUAL THE SHELL'S CONTENT CAPSULE — a cross-file pair", () => {
    /* CSS cannot read another sheet. If the capsule stops being the ground, a heading that looks
       right at rest grows a pale slab the moment a row passes under it — visible only while
       scrolling, which is the hardest state to notice in a screenshot.
       ⚠️ THE PAIR IS NOW ONE TOKEN, NOT TWO MATCHED LITERALS. They read `--ws-window` each, so the
       ground can be retoned without either side being remembered — which is what happened: both
       said `#ffffff` and the capsule moved to #fefcfa. A matched-hex assertion would have caught
       that, and only after someone had already shipped the mismatch to find out. */
    const shell = readFileSync(join(here, "..", "shell", "workspaceShell.css"), "utf8");
    const ground = rule(".tdg {").match(/--tdg-ground:\s*([^;]+)/)?.[1].trim();
    expect(ground, "the heading's ground is a literal — it will drift from the capsule silently").toBe("var(--ws-window)");
    expect(shell, "the content capsule stopped reading the ground token")
      .toContain(".ws-work { flex: 1 0 auto; display: flex; flex-direction: column; background: var(--ws-window); }");
  });

  it("⚠️ NO LAYOUT CHANGE CAME WITH IT — the resting rhythm is untouched", () => {
    /* A sticky box stays in flow, so the resting page is what it was. The temptation is to add top
       padding for the stuck state; that would move every heading down in the state you spend most
       of your time in. The ref's own rhythm stands. */
    /* ⚠️ THE BAND'S OWN RHYTHM (Phase 3): 7px 12px inside it, 16/2/7 around it. Still no top
       padding added FOR the stuck state — that would move every heading down in the state you
       spend most of your time in, which is the rule this case has always carried. */
    expect(shd()).toContain("padding: 7px 12px");
    expect(shd()).toContain("margin: 16px 2px 7px");
    expect(rule(".tdg-sect {")).toContain("margin-bottom: 26px");
  });

  /* ⚠️ SNOOZED IS DELIBERATELY NOT STICKY. Its fold row is not a heading over rows — it IS the
     group while closed, and it sits OUTSIDE any `.tdg-sect`, so it has no section to be bounded
     by and would stick to the whole zone until the page ended. */
  it("the snoozed fold is not sticky", () => {
    expect(rule(".tdg-fold {")).not.toContain("position: sticky");
  });
});

describe("⚠️ SEARCH STAYS REACHABLE FROM ANYWHERE ON THE PAGE", () => {
  const K = (key: string, mods: Partial<ShortcutKey> = {}): ShortcutKey => ({ key, ...mods });

  it("⌘K and ^K focus the field, typing or not — a modifier cannot collide with text entry", () => {
    expect(focusesSearch(K("k", { metaKey: true }), false)).toBe(true);
    expect(focusesSearch(K("K", { ctrlKey: true }), true)).toBe(true);
    expect(focusesSearch(K("k"), false)).toBe(false); // bare k is a letter
  });

  it("⚠️ `/` STANDS DOWN WHILE YOU ARE TYPING — else it is the one key you cannot enter", () => {
    expect(focusesSearch(K("/"), false)).toBe(true);
    expect(focusesSearch(K("/"), true)).toBe(false);
  });

  it("⚠️ AND UNDER ANY MODIFIER — ⇧/ is `?` on a UK layout, and ⌘/ belongs to the browser", () => {
    for (const mod of ["metaKey", "ctrlKey", "altKey", "shiftKey"] as const) {
      expect(focusesSearch(K("/", { [mod]: true }), false), mod).toBe(false);
    }
  });

  it("the typing test names the surfaces that own a keystroke", () => {
    for (const tagName of ["INPUT", "TEXTAREA", "SELECT"]) {
      expect(isTypingTarget({ tagName } as unknown as EventTarget), tagName).toBe(true);
    }
    expect(isTypingTarget({ tagName: "DIV", isContentEditable: true } as unknown as EventTarget)).toBe(true);
    expect(isTypingTarget({ tagName: "BUTTON" } as unknown as EventTarget)).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });

  it("the page ASKS the predicate and listens on the WINDOW — not on the field or the tool row", () => {
    expect(page).toContain("focusesSearch(e, isTypingTarget(e.target))");
    expect(page).toContain('window.addEventListener("keydown", onKey)');
    expect(page).toContain("searchRef.current?.focus()");
  });

  it("⚠️ AND IT NO-OPS WHILE THE PAGE IS HIDDEN — the Tasks slots stay MOUNTED", () => {
    /* `display: none` keeps the component alive, so without this guard a hidden Tasks page would
       steal the key from whichever page is actually on screen. */
    expect(page).toContain("wrapRef.current.offsetParent === null");
  });

});
