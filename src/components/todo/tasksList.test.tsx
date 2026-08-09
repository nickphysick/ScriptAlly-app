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
import { rowPill, rowPrimaryLabel, rowJourney, PillTone } from "../../lib/taskRow";
import { SNOOZE_STOPS, reachableStops } from "../../lib/todoActions";
import { focusesSearch, isTypingTarget, ShortcutKey } from "../../lib/taskShortcuts";
import { dialDateLine } from "./SnoozeDial";
import { TaskList, groupColumn } from "./TaskList";

const here = __dirname;
const css = readFileSync(join(here, "todoGroups.css"), "utf8");
const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
const list = readFileSync(join(here, "TaskList.tsx"), "utf8");
const dialSrc = readFileSync(join(here, "SnoozeDial.tsx"), "utf8");
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
        onToggleHk={() => {}} onOpen={() => {}} onTick={() => {}} onVerb={() => {}} onSnooze={() => {}} />,
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
    /* Snoozed renders collapsed by default (asserted below), so its primary is pinned through the
       pure model — the ONE place the per-state verb is named, rather than at a second render. */
    expect(list).toContain('{ id: "unsnooze", label: rowPrimaryLabel(c, column) }');
    expect(rowPrimaryLabel(card({}), "snoozed")).toBe("Return");
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

  it("the ✕ is a DOOR INTO THE ONE MENU, and the clock is the dial's (P4)", () => {
    /* P2 routed both through `openMenu` with a pre-opened submenu precisely so that Phase 4 could
       swap the snooze one for the dial at a SINGLE call site — which is what happened. The ⋯
       menu keeps its tiers for the keyboard path and for Snoozed's "Change the date…", and both
       resolve through the same `clampSnooze`, so there is still one ceiling. */
    expect(list).toContain('openMenu(e, c, column, "dismiss")');
    expect(list).not.toContain('openMenu(e, c, column, "snooze")');
    expect(list).toContain("<SnoozeDial");
    expect((list.match(/setDial\(/g) ?? []).length).toBeGreaterThan(0);
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
    expect(reachableStops(card({}), 10).map((s) => s.days)).toEqual([1, 3, 7]);
    expect(reachableStops(card({}), 0)).toEqual([]);   // already past — nothing honest to offer
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
    expect(layoutCss).toContain(".tpl-head { flex: 0 0 auto");
    expect(page).toContain("tools={renderTools()}");
  });
});
