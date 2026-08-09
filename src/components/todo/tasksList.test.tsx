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
import { FAMILY_BAND } from "../../lib/todoFamily";
import { TaskList, groupColumn } from "./TaskList";

const here = __dirname;
const css = readFileSync(join(here, "todoGroups.css"), "utf8");
const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
const list = readFileSync(join(here, "TaskList.tsx"), "utf8");

const rule = (sel: string): string => {
  const i = css.indexOf(sel);
  expect(i, `${sel} has no rule`).toBeGreaterThan(-1);
  return css.slice(i, css.indexOf("}", i));
};

/* ⚠️ ASSERT ON DECLARATIONS, NOT ON RAW FILE TEXT — the house style explains a rule by naming
   what it forbids, so a naive `not.toContain` fails on a correct file that documents itself.
   (The lesson is written into tasksViewport's rule-text helper; this is the same one.) */
const decls = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

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
      "grid-template-columns: 34px minmax(0, 1fr) 144px 172px 104px 216px",
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

describe("⚠️ FOUR FIXED SLOTS, AND AN ABSENT VERB LEAVES ITS SLOT STANDING", () => {
  /* The ref's own words: "where a verb is forbidden the slot stays empty so the absence is
     legible rather than mysterious". Fixed tracks are what make every primary in a panel start
     at the same x — a collapsing grid would shuffle the whole column on one card's permissions. */
  it("the tracks are fixed and stated once", () => {
    expect(rule(".tdg-verbs {")).toContain("grid-template-columns: 68px 30px 30px 30px");
    expect(rule(".tdg-slot {")).toContain("height: 30px"); // the empty slot still occupies its row
  });

  it("AN OFFER HAS NO DISMISS — the slot renders empty, and the permission is the MENU's", () => {
    /* ⚠️ ASKED OF `cardMenu`, NEVER OF A SECOND PER-KIND TABLE. An offer's dismiss line exists in
       the menu, DISABLED with its reason ("a reply-by date that is not yours to move"), so the
       row's `offers` helper refuses it. One source for the permission; the row and the menu
       cannot come to disagree about what a card allows. */
    const html = render(cols({ todo: [card({ key: "o", taskType: "offer_received", kind: "OFFER" })] }));
    const verbs = html.slice(html.indexOf("tdg-verbs"));
    expect(verbs).toContain("tdg-slot");                 // the empty dismissal slot
    expect(verbs).not.toContain("Dismiss “");
    // …while an ordinary agent-waiting card DOES get one
    const ok = renderToStaticMarkup(
      <TaskList groups={taskGroups(cols({ todo: [card()] }))} hkExpanded={false}
        onToggleHk={() => {}} onOpen={() => {}} onTick={() => {}} onVerb={() => {}} />,
    );
    expect(ok).toContain("Dismiss “Send your full to Jonathan Marsh”");
  });

  it("THE TICK IS THE ACT for a writer's own item — so it draws no primary beside the circle", () => {
    const mine = card({ key: "u1", userTaskId: "t1", kind: "", taskType: undefined, relatedRecordId: undefined, stream: "do", nature: "task" });
    const html = render(cols({ todo: [mine] }));
    expect(html).toContain("tdg-tick");
    expect(html).not.toContain("tdg-vb go");
  });

  it("a row that CANNOT be completed draws no tick — `isTickable` decides, never the render", () => {
    /* A tick that does nothing is worse than no tick: it invites a click and answers with
       silence. `completionVia` is the one map from kind to write path, and the row asks it. */
    expect(render(cols({ todo: [sweepCard({ key: "s1" })] }))).not.toContain("tdg-tick");
    expect(list).toContain("const tickable = isTickable(c);");
  });

  it("⚠️ A SWEEP CAN BE SNOOZED FROM THE ROW — the permission is the MENU's, not `snoozeVia`", () => {
    /* FOUND IN A BROWSER WALK, 9 Aug. `snoozeVia` answers "which WRITE PATH does a snooze take",
       and a sweep has no `relatedRecordId` (it stands for many), so it answered "none" — while
       `cardMenu` offered the sweep a Snooze… submenu. Two answers to one question on one card.
       All three optional slots ask the same model now. */
    expect(render(cols({ todo: [sweepCard({ key: "s2" })] }))).toContain("Snooze “Materials sweep”");
  });

  it("Done offers its way BACK (Undo, ghost) and Snoozed offers Return — never a planning verb", () => {
    const done = render(cols({ done: [card({ key: "d1", done: true, userTaskId: "t9", title: "Reply to Curtis Vane" })] }));
    expect(done).toContain("Undo");
    expect(done).toContain("tdg-vb go ghost");
    /* Snoozed renders collapsed by default (asserted below), so its primary is pinned at source —
       the ONE place the per-state primary is chosen, rather than at a second render path. */
    expect(list).toContain('{ id: "unsnooze", label: "Return" }');
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

describe("⚠️ THE FAMILY TONES ARE todoFamily's, AND THE CSS COPY IS LOCKED TO THEM", () => {
  /* This map has shipped wrong twice in this repo, both times through a SECOND COPY. CSS cannot
     read TypeScript, so the pill fills have to be restated in the stylesheet — and the moment
     they are restated they are a second copy. This is what stops it being a silent one. */
  it("each pill's fill and border are the family band's own darker stop and hairline", () => {
    for (const [fam, band] of Object.entries(FAMILY_BAND)) {
      const r = rule(`.tdg-pill.fam-${fam} {`);
      expect(r, `${fam} fill`).toContain(`background: ${band.to}`);
      expect(r, `${fam} border`).toContain(`border: 1px solid ${band.bd}`);
    }
  });

  it("the pill takes ONE width, so the meters beside them line up down the panel", () => {
    expect(rule(".tdg-pill {")).toContain("width: 124px");
  });

  it("an empty kind draws NO pill — chrome with nothing in it reads as a load failure", () => {
    const mine = card({ key: "u2", userTaskId: "t2", kind: "" });
    expect(render(cols({ todo: [mine] }))).not.toContain("tdg-pill");
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

  it("the clock and the ✕ are DOORS INTO THE ONE MENU — never a second chooser", () => {
    /* Phase 4 swaps the snooze submenu for the dial at ONE call site, which is the point of
       routing both through `openMenu` with a pre-opened sub rather than growing two popovers. */
    expect(list).toContain('openMenu(e, c, column, "snooze")');
    expect(list).toContain('openMenu(e, c, column, "dismiss")');
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
