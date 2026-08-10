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
import { taskGroups, groupSlice, HOUSEKEEPING_VISIBLE, tasksEyebrow, TASK_GROUP_ORDER, TaskGroupId } from "../../lib/todoGroups";
import { rowPill, rowPrimaryLabel, rowJourney, PillTone, splitMenu, splitWeight } from "../../lib/taskRow";
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

  it("the six tracks, exactly — tick · title · pill · journey · age · verbs", () => {
    expect(rule(".tdg-row {")).toContain(
      "grid-template-columns: 34px minmax(0, 1fr) 144px 172px 104px 118px",  // 216 → 118 with the split (Fix 4)
    );
  });

  it("ONE flexible track: the title's. Everything else is fixed, so figures line up down the panel", () => {
    const tracks = rule(".tdg-row {").match(/grid-template-columns:([^;]*)/)![1];
    expect(tracks.match(/fr\b/g)).toHaveLength(1);
    expect(tracks).toContain("minmax(0, 1fr)"); // ⚠️ the ZERO min — a bare 1fr floors at min-content
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
    const html = render(cols({ todo: [card()] }));
    expect(html.indexOf("tdg-sub")).toBeGreaterThan(html.indexOf("tdg-t"));
  });
});

/* ── 2. the four-slot action grid ───────────────────────────────────────────────────────────── */

/**
 * ⚠️ THE FOUR-SLOT GRID IS RETIRED (fix pack Fix 4; ref design-refs/todo-splitguard-v1.html).
 *
 * It existed so a missing verb left its place standing and every primary began at the same x.
 * Every row carries ONE identical control now, so there is nothing left to align — and the device
 * is DELETED rather than disabled, because one kept past its reason is the next reader's puzzle.
 * Snooze and dismiss moved into the split's menu; the standalone icon buttons went with them.
 */
describe("⚠️ ONE CONTROL PER ROW, AND ITS SEAM IS DEFENDED FOUR WAYS", () => {
  it("the four-slot grid and its empty slot are EXTINCT, in the sheet and in the markup", () => {
    expect(cssDecls).not.toContain(".tdg-verbs");
    expect(cssDecls).not.toContain(".tdg-slot");
    expect(code(list)).not.toContain("tdg-slot");
    expect(code(list)).not.toContain("tdg-verbs");
    /* the standalone snooze and dismiss buttons went with them */
    expect(list).not.toContain('aria-label={`Snooze');
    expect(list).not.toContain('aria-label={`Dismiss');
  });

  it("118px total, so the column NARROWS rather than grows: 81 + 3 + 34", () => {
    expect(rule(".tdg-split {")).toContain("width: 118px");
    expect(rule(".tdg-split {")).toContain("height: 34px");
    expect(rule(".tdg-split-p {")).toContain("width: 81px");
    expect(rule(".tdg-split-seam {")).toContain("width: 3px");
  });

  it("⚠️ GUARD 1 — the caret is 34px, not 28: it sits flush against a high-consequence primary", () => {
    /* anchored on the STANDALONE rule — the shared `.tdg-split-p, .tdg-split-c` block above it
       ends in the same selector text, and a naive indexOf lands there instead */
    expect(cssDecls).toContain(".tdg-split-c { width: 34px; }");
  });

  it("⚠️ GUARD 2 — each half arms ALONE, which two separate `:hover`s guarantee", () => {
    /* Two elements, two hovers: they can never both light, and never both stay dark while one is
       hovered. That is the reader's confirmation of what is loaded before the press lands. */
    expect(cssDecls).toContain(".tdg-split-p:hover, .tdg-split-c:hover");
    expect(cssDecls).not.toContain(".tdg-split:hover");
  });

  it("⚠️ GUARD 3 — the seam fires nothing, and commit is on RELEASE", () => {
    /* The seam is a plain span and NOTHING above the halves takes a click, so a press landing on
       it has nothing to fall through to. `onClick` fires only when press and release land on the
       same element — so pressing a half and sliding off does nothing, by the browser's own rule
       rather than by a handler of ours. */
    const split = list.slice(list.indexOf('className={`tdg-split'), list.indexOf("</span>\n          )}"));
    expect(split).toContain('className="tdg-split-seam" aria-hidden');
    expect(split).not.toContain("onMouseDown");
    expect(split).not.toContain("onPointerDown");
    expect(code(list)).not.toContain('className={`tdg-split${weight === "outlined" ? " ghost" : ""}`} onClick');
  });

  it("⚠️ THE SPLIT IS ONE TAB STOP, and the caret is never the only route in", () => {
    expect(list).toContain('tabIndex={-1}');           // the caret leaves the tab order
    expect(list).toContain('if (e.key === "ArrowDown")'); // …and ↓ opens the menu from the primary
  });

  it("every verb still comes through ONE door, which resolves against `cardMenu`", () => {
    expect(list).toContain("const fire = (c: BoardCard, column: TodoColumnId, id: MenuItemId) => {");
    expect(list).toContain("const leaf = cardMenu(c, column)");
    expect(list).toContain("onVerb(c, leaf ?? { kind: \"leaf\", id, label: id }, column);");
  });

  it("THE TICK IS THE ACT for a writer's own item — so it draws no split beside the circle", () => {
    const mine = card({ key: "u1", userTaskId: "t1", kind: "", taskType: undefined, relatedRecordId: undefined, stream: "do", nature: "task" });
    const html = render(cols({ todo: [mine] }));
    expect(html).toContain("tdg-tick");
    expect(html).not.toContain("tdg-split");
  });

  it("a row that CANNOT be completed draws no tick — `isTickable` decides, never the render", () => {
    expect(render(cols({ todo: [sweepCard({ key: "s1" })] }))).not.toContain("tdg-tick");
    expect(list).toContain("const tickable = isTickable(c);");
  });

  it("Done offers its way BACK — outlined, and now for the GROUP's reason rather than the row's", () => {
    /* ⚠️ THE PIXELS ARE UNCHANGED AND THE RULE BEHIND THEM IS NOT. `primary.ghost` used to set
       this from ROW STATE ("Undo is a way back, not an act"); the class is the group's weight
       now, and Done reaches it by not being the urgent group. Asserted so the fold is proven to
       have kept the appearance it inherited, not merely to have compiled. */
    const done = render(cols({ done: [card({ key: "d1", done: true, userTaskId: "t9", title: "Reply to Curtis Vane" })] }));
    expect(done).toContain("Undo");
    expect(done).toContain("tdg-split ghost");
    expect(code(list)).not.toContain("primary.ghost");   // the row-state flag is gone, not shadowed
    expect(rowPrimaryLabel(card({}), "snoozed")).toBe("Return");
  });
});

/**
 * ⚠️ WEIGHT FOLLOWS THE GROUP (Fix 4 revision; ref design-refs/todo-weight-slider-v1.html, panel
 * 1 — which SUPERSEDES the splitguard sheet's all-filled treatment).
 *
 * The page has already sorted urgency into groups and stated it in each heading. Weighting per row
 * would put that judgement in a second place, and two judgements about one thing eventually
 * disagree. So: filled ink inside Needs you now, outlined everywhere else.
 */
describe("⚠️ THE SPLIT'S WEIGHT IS THE GROUP'S, AND THE FOOTPRINT IS IDENTICAL", () => {
  it("filled in the urgent group; outlined in every other one", () => {
    /* rendered, not read from source: this is about which class reaches the markup */
    const urgent = render(cols({ todo: [card({ key: "n1" })] }));
    expect(urgent).toContain("tdg-split");
    expect(urgent).not.toContain("tdg-split ghost");

    /* ⚠️ SNOOZED IS ABSENT FROM THIS LOOP ON PURPOSE, and it is not an oversight: that group is a
       slim fold whose open/closed state is the component's own, closed by default, so a static
       render produces its heading and NO rows. There is nothing to assert a class on. Its weight
       is covered by the pure case below, where it is reachable. */
    for (const c of [
      cols({ todo: [sweepCard({ key: "h1" })] }),                                   // housekeeping
      cols({ done: [card({ key: "d1", done: true, userTaskId: "t9" })] }),          // done
    ]) expect(render(c)).toContain("tdg-split ghost");
  });

  it("⚠️ IT ASKS 'IS THIS THE URGENT ONE' — so a group added later is outlined by DEFAULT", () => {
    /* A list of the quiet groups is a list a new group joins by being forgotten, and the
       forgotten default would be filled ink — the loud one. Stated positively, the default is
       quiet. The cast is the point of the case: it stands in for a group id that does not exist
       yet, which is precisely what a future addition is. */
    expect(splitWeight("now")).toBe("filled");
    for (const g of ["housekeeping", "yours", "snoozed", "done"] as TaskGroupId[]) {
      expect(splitWeight(g)).toBe("outlined");
    }
    expect(splitWeight("a-group-invented-tomorrow" as TaskGroupId)).toBe("outlined");
  });

  it("…and every group id the page can actually render is answered", () => {
    /* Total over the real domain, so the two cannot drift apart silently. */
    for (const g of TASK_GROUP_ORDER) expect(["filled", "outlined"]).toContain(splitWeight(g));
  });

  it("⚠️ THE OUTLINED HAIRLINE TAKES NO LAYOUT — or the caret would breach Guard 1", () => {
    /* `border: 1px` on a border-box element leaves 116px of content while the children ask for
       81 + 3 + 34. The seam is `flex: none`, so the primary and the CARET absorb the 2px — and
       34px is a stated minimum. An inset shadow paints the same hairline and occupies nothing. */
    const g = rule(".tdg-split.ghost {");
    expect(g).toContain("box-shadow: inset 0 0 0 1px");
    expect(g).not.toContain("border:");
    /* the footprint is declared ONCE, on the shared rule, so neither weight can restate it */
    expect(rule(".tdg-split {")).toContain("width: 118px");
    expect(cssDecls).not.toContain(".tdg-split.ghost .tdg-split-c { width");
  });
});

describe("⚠️ THE MENU: SAFE VERBS FIRST, DANGER BEHIND A DEAD ZONE", () => {
  const sections = (c: BoardCard, col: TodoColumnId = "todo") => splitMenu(c, col, laterHideKey(c.taskType));

  it("the ref's shape, in the ref's order — and SNOOZE is a control, not two rows", () => {
    const secs = sections(card({}));
    expect(secs.map((x) => x.head)).toEqual(["SNOOZE UNTIL", "THIS QUERY", null]);
    /* ⚠️ THE PRESET ROWS ARE GONE, AND THE EMPTY `items` IS THE POINT. Tomorrow and Next week
       asked the writer to round their intention to the nearer of two dates, and the day they
       wanted was usually neither. */
    expect(secs[0].items).toEqual([]);
    expect(secs[0].dial).toEqual({ enabled: true, why: undefined });
    expect(secs[1].items.map((i) => i.label)).toEqual(["Open the query", "Edit last entry"]);
    expect(secs[2].items.map((i) => i.label)).toEqual(["Dismiss", "Stop showing this kind"]);
    expect(secs[2].danger).toBe(true);
  });

  it("⚠️ IN SNOOZED THE HEAD CHANGES SHAPE — a sleeping card is MOVED, not snoozed", () => {
    /* `cardMenu` already made this decision, swapping "Snooze…" for "Change the date…" there;
       "Snooze until" over a card that is already asleep reads as a no-op. */
    expect(sections(card({}), "snoozed")[0].head).toBe("MOVE IT TO");
    expect(sections(card({}), "snoozed")[0].dial!.enabled).toBe(true);
  });

  it("⚠️ A FINISHED CARD HAS NO DIAL, and says so rather than drawing a dead track", () => {
    /* Planning verbs on a finished thing imply it is not finished — `cardMenu` collapses Done to
       its way back, and the dial takes its answer from there rather than deciding again. */
    const done = sections(card({ done: true }), "done")[0];
    expect(done.dial!.enabled).toBe(false);
    expect(done.dial!.why).toMatch(/nothing left to put off/);
  });

  it("⚠️ THE 12px DEAD ZONE TAKES NO CLICK — Dismiss is never one slip from the caret", () => {
    const dz = rule(".tdg-deadzone {");
    expect(dz).toContain("height: 12px");
    expect(dz).toContain("pointer-events: none");
    expect(dz).toContain("border-bottom: 1px solid");
  });

  it("⚠️ AN OFFER STILL GETS A DIAL — its CEILING is what says one day, not a greyed row", () => {
    /* The greyed `Next week` row used to carry this; the dial carries it better, because the
       limit is visible ON the control (one stop, and a caption saying why) rather than stated
       beside a row you cannot press. The dismiss line keeps the greyed-not-absent treatment. */
    const secs = sections(card({ taskType: "offer_received" }));
    expect(secs[0].dial!.enabled).toBe(true);
    expect(reachableStops(card({ taskType: "offer_received" }))).toHaveLength(1);
    const flat = secs.flatMap((x) => x.items);
    expect(flat.map((i) => i.label)).toHaveLength(4);             // nothing is hidden
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
   * ⚠️ "NOTHING IS PRE-FOCUSED" IS SUPERSEDED, DELIBERATELY — and it is restated rather than
   * deleted so the change reads as a decision.
   *
   * That rule was written when this menu was a column of VERBS, where a pre-focused item meant
   * Enter could fire something a slip away from Dismiss. The snooze section is a CONTROL now: it
   * opens on tomorrow, Enter commits, and open-then-Enter is the commonest move on the page. What
   * makes a one-key commit honest is that it is reversible from its own receipt — which it is.
   *
   * Where the dial is greyed there is nothing to drive, so focus falls back to the box and Enter
   * still does nothing. No verb is ever pre-focused, in either case.
   */
  it("⚠️ THE SLIDER TAKES FOCUS WHERE THERE IS ONE — and no VERB ever does", () => {
    expect(list).toContain("if (!sections.some((sec) => sec.dial?.enabled)) el.focus({ preventScroll: true });");
    expect(list).not.toContain("items[0]?.focus()");
    /* the child's autoFocus lands in the commit phase, BEFORE the parent's layout effect — so the
       guard is what stops the box taking focus straight back off the slider */
    expect(list).toContain("autoFocus />");
    expect(dialSrc).toContain("autoFocus={autoFocus}");
  });

  /**
   * ⚠️ THE NUMBER KEYS ARE EXTINCT, IN ALL FOUR PLACES THEY LIVED (Phase 4).
   *
   * `1` and `2` fired the two preset snooze rows. A continuous twelve-stop scale has no two stops
   * worth a shortcut — picking tomorrow is open-then-Enter now, which is FEWER keys than it was —
   * so the binding has nothing left to select. Deleted rather than left unreferenced: a binding
   * kept past the thing it selected is the next reader's puzzle, and worse, an invitation to
   * re-point it at something arbitrary.
   */
  it("the constant, the hint field, the handler and the CSS are all GONE, not merely unused", () => {
    /* on DECLARATIONS, not raw text — this sheet's house style explains a rule by naming what it
       forbids, so a naive whole-file search fails on a correct file that documents itself */
    expect(code(rowSrc)).not.toContain("SPLIT_NUMBER_KEYS");
    expect(code(rowSrc)).not.toContain("hint");        // the field the two rows carried
    expect(code(list)).not.toContain("SPLIT_NUMBER_KEYS");
    expect(code(list)).not.toContain("tdg-mkey");
    expect(cssDecls).not.toContain(".tdg-mkey");       // its rule AND its dim-state override
    /* the menu's keydown answers Escape and nothing else */
    expect(list).toContain('if (e.key === "Escape") { e.stopPropagation(); onClose(true); }');
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
 * ⚠️ THE DIAL, WORN INLINE (Fix 4 revision, Phase 2; ref todo-weight-slider-v1.html panels 2–3).
 *
 * The two preset rows are replaced by the snooze dial itself. The rule that made this safe to do
 * is that there is still exactly ONE dial: `SnoozeDialBody` was extracted from the popover so the
 * menu could wear the same control, rather than a second slider being built for the menu — which
 * is the thing the pack forbade in as many words.
 */
describe("⚠️ ONE DIAL, TWO SURFACES — the menu wears the control, it does not copy it", () => {
  it("the menu renders `SnoozeDialBody`, and the popover renders the very same component", () => {
    expect(list).toContain("<SnoozeDialBody card={card} onSnooze={onSnooze} autoFocus />");
    expect(dialSrc).toContain("export const SnoozeDialBody");
    /* the popover is now a wrapper around it — portal, placement and closers, nothing more */
    expect(dialSrc).toContain("<SnoozeDialBody card={card} daysUntilDeadline={daysUntilDeadline} onSnooze={onSnooze} autoFocus />");
    /* …and the body itself owns no popover machinery, or the inline copy would fight the menu's */
    const body = dialSrc.slice(dialSrc.indexOf("export const SnoozeDialBody"), dialSrc.indexOf("export const SnoozeDial:"));
    expect(body).not.toContain("createPortal");
    expect(body).not.toContain("addEventListener");
  });

  it("⚠️ BOTH ENTRY POINTS SURVIVE — the dial gained a surface, it did not lose one", () => {
    /* `s` on the focused row, and Snoozed's "Change the date…". A refactor that quietly cost an
       entry point would be a regression wearing a tidy-up's clothes. */
    expect(list).toContain("<SnoozeDial");
    expect(list).toContain('setDial({ card: c, anchor: el })');
    expect(dialSrc).toContain("<BrandDatePicker");        // the exact-date route, kept
  });

  it("the write is the page's own `onSnooze`, already clamped inside the body", () => {
    expect(list).toContain("onSnooze={(days, when) => { setSplit(null); onSnooze(split.card, days, when); }}");
    expect(dialSrc).toContain("clampSnooze(card, days,");
  });

  it("258px — the one thing this menu overrides on the shell it consumes", () => {
    expect(rule(".tdg-splitmenu {")).toContain("width: 258px");
    const boardCss = readFileSync(join(here, "todoBoard.css"), "utf8");
    expect(boardCss).toContain("width: 228px");           // the shell's own, untouched
  });

  it("⚠️ THE GREYED DIAL REUSES THE EXISTING `.tbd-mi.dim` GRAMMAR — no fourth state rule", () => {
    expect(list).toContain('className="tbd-mi dim" role="menuitem" aria-disabled');
    /* the state rules that already existed, still the only ones */
    expect(cssDecls).toContain(".tbd-mi.dim, .tbd-mi:disabled");
    expect(cssDecls).not.toContain(".tdg-mdial.dim");
    /* and it is not a <button disabled>: a button takes the shape of something pressable and
       then refuses, where a plain row with `aria-disabled` never offered */
    expect(list).not.toContain('className="tbd-mi dim" disabled');
  });
});

/* ── 3. the panels and their headings ───────────────────────────────────────────────────────── */

describe("the panels: white sheets separated by SPACE, with the heading outside and above", () => {
  it("the panel's own measures", () => {
    const p = rule(".tdg-panel {");
    expect(p).toContain("background: #fff");
    expect(p).toContain("border: 1px solid #ece4d6");
    expect(p).toContain("border-radius: 16px");
    expect(p).toContain("padding: 6px 16px");
  });

  it("26px between sections, and NO hairline doing the separating", () => {
    expect(rule(".tdg-sect {")).toContain("margin-bottom: 26px");
    expect(rule(".tdg-shd {")).not.toContain("border-bottom");
  });

  it("rendered: the heading precedes its panel and is not inside it", () => {
    const html = render(cols({ todo: [card()] }));
    expect(html.indexOf("tdg-shd")).toBeLessThan(html.indexOf("tdg-panel"));
    expect(html).toContain("Needs you now");
    expect(html).toContain("An agent is waiting, or a date is."); // the group's own description
  });

  it("an EMPTY group renders nothing at all — not a panel with a heading over it", () => {
    const html = render(cols({ todo: [card()] }));
    expect(html).not.toContain("Housekeeping");
    expect(html).not.toContain("Your tasks");
  });
});

describe("⚠️ ONE TONE PER LIVE KIND, AND THE CSS COPY IS LOCKED TO THE TONE UNION", () => {
  /* ⚠️ SUPERSEDES P2's FOUR FAMILY TONES (9 Aug, P3). The families answer "how urgent is this" —
     which the group headings already answer, permanently and in words — so a pill repeating it
     said one thing twice while the thing a pill is FOR went unsaid. The values are the ref's own.

     CSS cannot read TypeScript, so the tones have to be restated in the stylesheet, and the
     moment they are restated they are a second copy. This is what stops it being a silent one:
     every member of the `PillTone` union must have a rule, and no rule may exist without a
     member. That map has shipped wrong twice in this repo, both times through a second copy. */
  const TONES: PillTone[] = ["offer", "wait", "rr", "sweep", "stale", "yours", "note", "snoozed", "done"];

  it("every tone has a rule, and every rule has a tone", () => {
    for (const t of TONES) expect(rule(`.tdg-pill.tone-${t} {`), t).toContain("background:");
    const declared = [...css.matchAll(/\.tdg-pill\.tone-([a-z]+) \{/g)].map((m) => m[1]);
    expect(declared.sort()).toEqual([...TONES].sort());
  });

  it("the pill takes ONE width, so the meters beside them line up down the panel", () => {
    expect(rule(".tdg-pill {")).toContain("width: 124px");
  });

  it("⚠️ THE WORDS ARE THE CARD'S OWN `kind` — only the tone is per-kind", () => {
    /* A per-kind label table here would be a SECOND vocabulary beside the one the facet chips,
       the snoozed band and the counting law all already speak. */
    expect(rowPill(card({ kind: "AGENT WAITING" }), "todo")).toEqual({ label: "AGENT WAITING", tone: "wait" });
    expect(rowPill(card({ kind: "OFFER", taskType: "offer_received" }), "todo")?.tone).toBe("offer");
    expect(rowPill(card({ kind: "R&R", taskType: "revise_resubmit" }), "todo")?.tone).toBe("rr");
    expect(rowPill(card({ kind: "STALE", taskType: "no_response_close" }), "todo")?.tone).toBe("stale");
    expect(rowPill(sweepCard(), "todo")?.tone).toBe("sweep");
    expect(rowPill(card({ kind: "YOUR TASK", userTaskId: "t" }), "todo")?.tone).toBe("yours");
    expect(rowPill(card({ kind: "NOTE", nature: "note" }), "todo")?.tone).toBe("note");
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

  it("⚠️ A JOURNEY AND A PILE NEVER APPEAR TOGETHER — a pile has no path", () => {
    const html = render(cols({ todo: [sweepCard({ key: "s9" })] }));
    expect(html).toContain("tdg-bar");
    expect(html).not.toContain("tdg-steps");
    const wait = render(cols({ todo: [card({ key: "w9", taskType: "full_requested" })] }));
    expect(wait).toContain("tdg-steps");
    expect(wait).not.toContain("tdg-bar");
    expect(wait).toContain("FULL REQUESTED");
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

  it("rendered: a stale row says Close, a sweep says Start", () => {
    expect(render(cols({ todo: [card({ key: "st", stream: "hk", kind: "STALE", taskType: "no_response_close" })] }))).toContain(">Close<");
    expect(render(cols({ todo: [sweepCard({ key: "sw" })] }))).toContain(">Start<");
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
      .find((x) => x.id === "now")!;
    expect(groupSlice(urgent, false).more).toBe(0);
  });

  it("the fold states the figure it is holding back, so it is a choice rather than a surprise", () => {
    expect(render(cols({ todo: hk(9) }))).toContain("SHOW 5 MORE");
  });

  it("⚠️ THE DAY'S CLEARED WORK IS NEVER BEHIND A TOGGLE — Done renders its rows open", () => {
    /* The rule the retired corner panel's spec carried: hiding the only evidence the day went
       anywhere was a concession to a 250px panel that no longer exists. */
    const html = render(cols({ done: [card({ key: "d2", done: true, title: "Reply to Curtis Vane" })] }));
    expect(html).toContain("Reply to Curtis Vane");
    expect(html).toContain("tdg-panel");
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
  it("a sweep's age is an em dash, not a second copy of its meter label", () => {
    const html = render(cols({ todo: [sweepCard({ key: "s3" })] }));
    expect(html.match(/16 TO FIX/g) ?? []).toHaveLength(1);
    expect(html).toContain('<span class="tdg-age">—</span>');
  });

  it("the age's clearance is INSIDE its track — six tracks, never a seventh or a column gap", () => {
    const cr = rule(".tdg-cr {");
    expect(cr).toContain("padding-right: 10px");
    expect(rule(".tdg-row {")).not.toContain("gap:");
  });
});

describe("⚠️ THE STRIKE GOES ON THE TITLE, NEVER THE ROW", () => {
  /* If the row is struck, the completion time and the Undo control are struck with it — the two
     things a finished row exists to offer. (Carried from todoFinishing, whose host page changed
     twice while the primitive never did.) */
  it("the line-through is scoped to the title inside a done row", () => {
    const r = rule(".tdg-row.done .tdg-t {");
    expect(r).toContain("text-decoration: line-through");
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
    expect(page).toContain("onOpen={(c) => openDock(dockAllCards(), c.key)}");
  });

  it("the group → column map exists because the MENU speaks states, not columns", () => {
    expect(groupColumn("now")).toBe("todo");
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
  it("the eyebrow is the Dashboard's grammar, built by a pure helper", () => {
    expect(tasksEyebrow("Friday 7 August", "week 140")).toBe("FRIDAY 7 AUGUST · WEEK 140 OF QUERYING");
    expect(page).toContain("eyebrow={tasksEyebrow(");
  });

  it("the chips stand at 38px on a full radius, with Playfair figures", () => {
    const s = rule(".tdg-stat {");
    expect(s).toContain("height: 38px");
    expect(s).toContain("border-radius: 99px");
    expect(rule(".tdg-stat b {")).toContain('font-family: "Playfair Display"');
  });

  it("⚠️ THE CHIPS ARE ABSENT IN THE DESK STATES — a first-run panel states no figures", () => {
    expect(page).toContain("{!desk && (");
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
    const sect = html.slice(html.indexOf('class="tdg-sect"'));
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

  it("⚠️ IT PAINTS ITS OWN GROUND, fading out so rows slide UNDER rather than collide", () => {
    expect(shd()).toContain("background: linear-gradient(var(--tdg-ground) 74%");
    expect(shd()).toContain("rgba(255, 255, 255, 0)");
  });

  it("⚠️ AND THAT GROUND MUST EQUAL THE SHELL'S CONTENT CAPSULE — a cross-file pair", () => {
    /* CSS cannot read another sheet. If the capsule stops being white, a heading that looks right
       at rest grows a pale slab the moment a row passes under it — visible only while scrolling,
       which is the hardest state to notice in a screenshot. */
    const shell = readFileSync(join(here, "..", "shell", "workspaceShell.css"), "utf8");
    const ground = rule(".tdg {").match(/--tdg-ground:\s*([^;]+)/)?.[1].trim();
    expect(ground).toBe("#ffffff");
    expect(shell).toContain(".ws-work { flex: 1 0 auto; display: flex; flex-direction: column; background: #ffffff; }");
  });

  it("⚠️ NO LAYOUT CHANGE CAME WITH IT — the resting rhythm is untouched", () => {
    /* A sticky box stays in flow, so the resting page is what it was. The temptation is to add top
       padding for the stuck state; that would move every heading down in the state you spend most
       of your time in. The ref's own rhythm stands. */
    expect(shd()).toContain("padding: 0 4px 13px");
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

  it("the tool row does not scroll away in the first place — only the zone scrolls", () => {
    /* Stated so the shortcuts read as REACH rather than as rescue: the header block is fixed by
       the alignment contract, and `.tpl-zone` is the one declared scroller. */
    const layoutCss = readFileSync(join(here, "tasksLayout.css"), "utf8");
    expect(layoutCss).toContain(".tpl-head { width: 100%; flex: 0 0 auto; }"); // folded, fix pack 10 Aug
    expect(page).toContain("tools={renderTools()}");
  });
});
