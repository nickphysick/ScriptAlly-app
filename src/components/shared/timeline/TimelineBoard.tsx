/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The timeline board — the rail and the rows: the `.tl` subtree and nothing else.
 *
 * ⚠️ MOVED VERBATIM FROM `TodoCalendarPage.tsx`, AND THE VERBATIM IS THE PROOF. This is the second
 * half of an extraction, not a redesign: the board renders in Query Centre exactly as it renders in
 * To-do. Every prop below is named for the LOCAL it replaced, so the moved JSX is untouched —
 * `range.days` is still `range.days` — and the byte-identical `outerHTML` diff of this subtree at
 * 1280/1440/1920 (`reports/calendar-extract-dom/`) is what says so.
 *
 * ⚠️ THE WINBAR AND THE SIDEBAR ARE NOT IN HERE, AND THAT IS THE SEAM. `.tl-winbar` (the week
 * pager, the search, the density pair) and `aside.tl-axis` (To-do's own controls) are SIBLINGS of
 * this subtree in the page, so they stay with their host. What is inside `.tl` is the rail and the
 * rows, which is the part both pages want.
 *
 * ⚠️ THE HOST DECIDES WHAT A GESTURE DOES; THE BOARD ONLY DRAWS. Every interaction arrives as a
 * callback, and the ones that only make sense where there are tasks — dragging a task to a new day,
 * pressing an action — are OPTIONAL. A page with no tasks renders no task bars, so those callbacks
 * are never reached; making them optional is what lets such a page mount the board without
 * supplying handlers for work it does not have.
 *
 * ⚠️ THE INTERFACE IS WIDE, AND THE WIDTH IS A MEASUREMENT RATHER THAN A STYLE. The moved blocks
 * closed over 49 names in the page. That number IS the answer to "how entangled is this board with
 * To-do", and narrowing it is the next piece of work — not something to hide behind a `host` object,
 * which would make the coupling invisible without making it smaller.
 */
import React from "react";
import { StatusDot } from "../../StatusDot";
import { QueryStatus } from "../../../types";
import type { Segment, BarNode } from "../../../lib/journeyBars";
import { holderOf } from "../../../lib/journeyBars";
import type { CalSection } from "../../../lib/calendarSections";
/* ⚠️ THE BOARD TAKES THE CONTRACT, NOT THE HOST'S ROW. `BoardRow` is a NARROWING of what a host
   already has — nine fields, measured from this render — so To-do's own `BoardRow` satisfies
   it structurally with no mapping code, and Query Centre must produce the same nine. Importing
   `todoTimeline` here would have made the shared board depend on To-do, which is the coupling
   this extraction exists to remove. */
import type { BoardRow, BoardItem } from "./types";
import { pillText } from "../../../lib/calendarPill";
import { cardCFor, type CardKind } from "../../../lib/cardC";
import { actionKindFor, type ActionKind, type ActionSubject, type ActionPrefill } from "../../../lib/actionKind";
import { stageSentence, type StageEnd } from "../../../lib/stageSentence";
import { stateFor } from "../../../lib/queryCardFacts";
import { shortCalDate } from "../../../lib/todoCalendar";
import { pct, pctOfRows, barLeft, barWidth, laneVar, Piece, Marker, ActionMark, type DrawnGroup } from "./boardParts";

/** ⚠️ THE REF'S TWO GATES, IN DAYS — moved with the row that reads them. The ref states them as
    lane fractions; the standing rule is that a stage gate is a day count, never a lane fraction. */
const STAGE_MIN_DAYS = 4;
const STAGE_NARROW_DAYS = 8;
/** a past stage's badge — the ref's `.jc .jmed`, at 54 against the live card's 58 */
const STAGE_BADGE_PX = 16;

/** What Card C is handed. Hoisted out of the page's component scope so the board can state it —
    a type is erased, so the hoist cannot change what renders. */
export type CardPayload = {
  key: string; rowKey: string; isTask: boolean;
  bandClass: string; bandStatus: string; holder: string; dotStatus: QueryStatus | null;
  name: string; agency?: string;
  fact: string; tail: string; bang: boolean;
  model: ReturnType<typeof cardCFor>;
  fillTone: "sage" | "blush" | "slate" | "sand" | "cream" | "grey" | "note";
  note: string;
  action: { cv: string; deed: string; urgent: boolean } | null;
  queryId?: string;
};

export type BoardMonth = { key: string; label: string; at: number; labelAt: number; current: boolean; past: boolean };
export type BoardDateLabel = { ymd: string; at: number; text: string; day: string; mon: string; now: boolean };
export type BoardBars = { segs: Segment[]; nodes: BarNode[] };

export interface TimelineBoardProps {
  /* ── the window ─────────────────────────────────────────────────────────────────────────── */
  /** the span, published to the sheet as `--tl-days`; every position resolves against it in `cqw` */
  range: { days: number };
  today: string;
  /** today's MIDPOINT in day units (`index + 0.5`), or `null` where the window does not contain it */
  todayAt: number | null;
  months: readonly BoardMonth[];
  dateLabels: readonly BoardDateLabel[];
  dayDate: (d: number) => string;

  /* ── the rows ───────────────────────────────────────────────────────────────────────────── */
  /** only its length is read here — whether the board has anything to draw a rail for */
  board: readonly unknown[];
  drawnGroups: readonly DrawnGroup[];
  /** the flat row list, for resolving a row's name from a mark's `rowKey` */
  rows: readonly BoardRow[];
  rowNumber: ReadonlyMap<string, number>;
  barsByRow: ReadonlyMap<string, BoardBars>;
  /** what the board shows instead of rows when there are none */
  sparse: React.ReactNode;

  /* ── grouping ───────────────────────────────────────────────────────────────────────────── */
  collapsedGroups: ReadonlySet<string>;
  toggleGroup: (key: string) => void;

  /* ── selection, hover and the card ──────────────────────────────────────────────────────── */
  sel: string | null;
  /* ⚠️ THE UPDATER FORM IS USED — a marker toggles itself off by reading the current value, so
     this is the state setter, not a plain assignment. */
  setSel: React.Dispatch<React.SetStateAction<string | null>>;
  hoverSeg: string | null;
  pickSeg: (rowKey: string, sg: Segment, el?: HTMLElement) => void;
  openCardOver: (payload: CardPayload, el: HTMLElement) => void;
  /** truthy while Card C is open — a scroll closes it */
  cardAt: unknown;
  closeCard: () => void;
  nudgeCountFor: (queryId?: string) => number;

  /* ── the lane's own gestures ────────────────────────────────────────────────────────────── */
  wrapRef: React.RefObject<HTMLDivElement | null>;
  onLaneMove: (e: React.MouseEvent) => void;
  clearCross: () => void;
  dragWindow: React.HTMLAttributes<HTMLDivElement>;
  onRowsOver: (e: React.MouseEvent) => void;
  onRowsOut: (e: React.MouseEvent) => void;
  cross: { x: number; label: string } | null;
  actToast: string | null;

  /* ── where a gesture goes ───────────────────────────────────────────────────────────────── */
  onNavigatePath: (path: string) => void;

  /* ── TASK-ONLY, and optional for exactly that reason (see the header) ───────────────────── */
  pick?: (rowKey: string, it: BoardItem) => void;
  requestAction?: (kind: ActionKind, subject: ActionSubject, prefill?: ActionPrefill) => void;
  setDragTask?: (v: { id: string; from: string } | null) => void;
  endDrag?: () => void;
}

export const TimelineBoard: React.FC<TimelineBoardProps> = ({
  range, today, todayAt, months, dateLabels, dayDate,
  board, drawnGroups, rows, rowNumber, barsByRow, sparse,
  collapsedGroups, toggleGroup,
  sel, setSel, hoverSeg, pickSeg, openCardOver, cardAt, closeCard, nudgeCountFor,
  wrapRef, onLaneMove, clearCross, dragWindow, onRowsOver, onRowsOut, cross, actToast,
  onNavigatePath,
  pick = () => {}, requestAction = () => {}, setDragTask = () => {}, endDrag = () => {},
}) => {
  const SectionIcon = ({ sec }: { sec: CalSection }) => {
    const common = {
      className: "gico", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
      strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
      "aria-hidden": true,
    };
    switch (sec) {
      case "over": return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5M12 16.2v.3" /></svg>;
      case "need": return <svg {...common}><path d="M4 12h14M13 7l5 5-5 5" /></svg>;
      case "with": return <svg {...common}><path d="M21 3 3 10.5l6.4 2.6L12 20l3-5.6L21 3z" /></svg>;
      case "quiet": return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3.2 2" /></svg>;
      case "task": return <svg {...common}><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M8.5 12.5l2.3 2.3L15.5 10" /></svg>;
      case "shut": return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M9 9l6 6M15 9l-6 6" /></svg>;
    }
  };

  const row = (r: BoardRow) => {
    const bar = barsByRow.get(r.key) ?? { segs: [], nodes: [] };
    /* ⚠️ THE ROW'S URGENCY, READ FROM THE SAME FLAGS THE SECTION FILED IT BY — never a second
       opinion. `owed` is a writer-owed date that has passed and `quiet` is an agency estimate that
       has, which are exactly the two arms of `calSectionOf`'s `isUrgent`. A row that is Urgent
       states one instruction, so its future flags are suppressed while it is. */
    const rowUrgent = bar.segs.some((sg) => sg.owed || sg.state === "quiet");
    const lanes = Math.max(1, r.lanes);
    return (
      <div
        key={r.key}
        className={`tl-rrow${r.closed ? " closed" : ""}`
          /* ⚠️ THE ROW IS OWED WHEN ANY CARD ON IT IS. A row can hold two relationships; the strip
             is a property of the ROW, so it asks whether the row has overdue work at all. */
          + ((barsByRow.get(r.key)?.segs ?? []).some((sg) => sg.owed) ? " owes" : "")}
        /* ⚠️ THE ROW PUBLISHES ITS OWN KEY AND ITS OWN IDENTITY, so a lock can assert the PAINTED
    order against the key the board actually sorted by, and can follow the same row across a
    mode change. Reading the order alone says the rows are in some order; reading the key
    alone says a key exists. */
data-rowkey={r.key}
/* the row's subject, per derivation — see `BoardRow.subjects` */
        data-subj-deed={r.subjects.deed ?? undefined}
        data-subj-caption={r.subjects.caption ?? undefined}
        data-subj-sort={r.subjects.sort ?? undefined}
        /* ⚠️ THE SORT KEY, ON THE ROW. The lock asserts the PAINTED order against it — a seeded
           ordering case can pass while the live board is visibly out of order, and only comparing
           the two on one page can tell those apart. */
        data-pressing={r.pressingAt == null ? "none" : String(r.pressingAt)}
        /* ⚠️ THE TIER, FROM THE BOARD'S OWN GROUPING — so an ordering lock reads the tier the page
           sorted by rather than deriving a second opinion about what "closed" or "silent" means.
           Two derivations of a tier is how a painted order and a check about it come apart. */
        data-group={r.group ?? "none"}
        /* ⚠️ THE PAST'S WIDTH IS A ROW TOKEN, so the wash is one declaration in the sheet rather
           than an element per row. `null` where the window does not contain today — a window
           wholly ahead has no past to set back, and one wholly behind is all past, which
           `todayAt` already expresses as 0 or the full span. */
        style={{
          ["--lanes" as string]: String(lanes),
        } as React.CSSProperties}
      >
        {/**
          * ⚠️ v58: THE AGENT COLUMN IS GONE. The ref sets `--agent-w: 0` and hides `.ag` outright;
          * the identity moved INSIDE the card, where it travels with the wait it belongs to.
          *
          * ⚠️ AND ITS CONTROL WENT WITH IT, WHICH IS A REAL LOSS TO REPLACE. The name was a button
          * opening the relationship's workspace with nothing selected — the only route to a query
          * that has no card raised against it. The card itself is still clickable (`onPick`), so a
          * relationship WITH a card is still reachable; one with none is not. Flagged in the
          * report rather than papered over with a control the ref does not draw.
          */}
        <div className="tl-c-tl">
          {bar.segs.map((sg) => (
            <Piece key={sg.key} sg={sg} days={range.days} selected={sel === sg.key} name={r.name}
              /* ⚠️ FOUR PHASES, so no two cards on screen move together and the row does not read
                 as a wave. The index is the card's position in its row's own list. */
              /* ⚠️ THE LAST MARK ON THIS CARD, never the row's last. A row can hold two
                 relationships — two books with one agency — and each card must clear its own
                 marks and no others. */
              lastMarkAt={(() => {
                const on = bar.nodes.filter((n) => n.rowKey === sg.rowKey && n.lane === sg.lane
                  && n.at >= sg.from - 0.001 && n.at <= sg.to + 0.001);
                return on.length ? Math.max(...on.map((n) => n.at)) : null;
              })()}
              onPick={(el) => pickSeg(r.key, sg, el)}
              agency={r.agency}
              onOpen={sg.queryId
                ? () => onNavigatePath(`/queries?q=${encodeURIComponent(sg.queryId)}`)
                : undefined} />
          ))}
          {/**
            * ⚠️ THE ACTION CAP IS A LANE CHILD, CENTRED ON ITS OWN DATE — not a child of the card.
            *
            * It names the deed that becomes available ON that day, so it belongs at the date
            * rather than at the card's edge: the two coincide today and would part the moment a
            * card is clipped. The card's own end carries the terminal MARK instead, which is a
            * child of the card for exactly the opposite reason — it is about the edge.
            *
            * The pair is emitted from one test in `journeyBars`, so a cap can never appear without
            * its mark.
            */}
          {/* ══ ACTIONS (v63, §E) ══════════════════════════════════════════════════════════════
              ⚠️ ONE INSTRUCTION PER ROW (v60c, standing). An urgent row shows its urgent action and
              nothing else: a row reading "6 weeks overdue" beside "Nudge · from 19 Sept" states two
              moves at once and leaves the reader to work out which is being asked of them. Both
              facts survive in the hover record; what the board states is the one thing to do next.

              ⚠️ AND AN ACTION STANDS ON ITS OWN DATE, NEVER CLAMPED INTO THE LANE. The old flag
              carried `min(…, calc(100% - 206px))` so one near the edge folded inward — which put it
              on a day it does not belong to, on the one axis this board asks a reader to trust. An
              action past the window's edge is CLIPPED by the board, like everything else here. */}
          {/* ⚠️ A TASK'S ACTION IS THE SAME MARK AS EVERY OTHER ROW'S — a flag at the bar's end,
              revealing MARK DONE on hover. It is a `sendBy` glyph because a task IS the writer's own
              deadline; giving tasks a fifth symbol would say they are a different kind of thing
              from a deadline you set yourself, which is exactly what they are not. */}
          {bar.segs.filter((sg) => sg.isTask).map((sg) => (
            <ActionMark key={`tact-${sg.key}`} kind="sendBy"
              onPress={() => requestAction("task",
                { rowKey: r.key, taskId: sg.taskId, name: r.name, isTask: true },
                { deed: "Mark done" })}
              on={hoverSeg === sg.key} forSeg={sg.key}
              label={sg.tail} deed="Mark done" lane={sg.lane}
              style={{ ...laneVar(sg.lane),
                ["--l" as string]: barLeft(sg),
                ["--w" as string]: barWidth(sg),
                left: "calc(var(--l) + var(--w) + 14px)" }} />
          ))}
          {bar.segs.filter((sg) => sg.capWord && !rowUrgent && !sg.isTask).map((sg) => (
            <ActionMark key={`act-${sg.key}`} kind={sg.capSource ?? "window"}
              onPress={() => requestAction(
                actionKindFor({ isTask: false, status: sg.status, capSource: sg.capSource ?? null,
                  deed: sg.capWord ?? null }),
                { rowKey: r.key, queryId: sg.queryId, name: r.name, agency: r.agency,
                  status: sg.status, isTask: false },
                { deed: sg.capWord ?? null })}
              on={hoverSeg === sg.key} forSeg={sg.key}
              label={sg.capOn ?? ""} deed={sg.capWord ?? ""} lane={sg.lane}
              style={{ ...laneVar(sg.lane),
                ["--l" as string]: barLeft(sg),
                ["--w" as string]: barWidth(sg),
                /* ⚠️ THE CARD'S OWN RIGHT EDGE PLUS A SHORT GAP — `calc(--l + --w)` IS that edge,
                   however it was computed. Reading `pct(sg.to)` instead was the same date by a
                   second route and they disagreed by a constant 362.6px on every flag on the
                   board. One expression, no second arithmetic to drift. */
                left: "calc(var(--l) + var(--w) + 14px)" }} />
          ))}
          {/**
            * ⚠️ THE URGENT FLAG STANDS AT TODAY, NOT AT THE DATE THAT PASSED.
            *
            * The date is behind the reader; what the flag says is that the debt is live NOW, so it
            * belongs on the day being looked at. The card's own second line still carries the date
            * and the span, so nothing is lost by moving the flag off it.
            *
            * ⚠️ AND IT IS ONE PER ROW, NOT ONE PER SEGMENT. A row can hold several late stretches;
            * three identical pink flags stacked on one column would say the same thing three times.
            * The first owed segment carries it and the rest are silent.
            */}
          {(() => {
            /* ⚠️ THE URGENT ACTION STANDS ON THE DATE IT IS OWED FOR, and is hidden until the row is
               hovered — the pulse dot is the only thing an urgent row states at rest. A label and a
               button on every late row at once is twelve instructions on one screen. */
            /* ⚠️ NEVER A TASK. Its deed comes from `pillText(status)`, and a task's `status` is a
               required-field placeholder it cannot honestly fill — so an overdue task rendered a
               button reading "Queried ›". A task's action is its own flag, above. This is the
               placeholder leaking into visible copy, which is the fabricated-value fault. */
            const late = bar.segs.find((sg) => !sg.isTask && (sg.owed || sg.state === "quiet"));
            if (!late) return null;
            const p = pillText(late.status, holderOf(late), late.nudgeDue, !!late.owed,
              late.state === "ghost", late.state === "quiet");
            /* the tail already says how late, in the one lateness vocabulary — never recomputed */
            if (!late.tail) return null;
            return (
              <ActionMark key={`od-${late.key}`} urgent kind={late.capSource ?? "sendBy"}
                onPress={() => requestAction(
                  actionKindFor({ isTask: false, status: late.status,
                    capSource: late.capSource ?? null, deed: p.text }),
                  { rowKey: r.key, queryId: late.queryId, name: r.name, agency: r.agency,
                    status: late.status, isTask: false },
                  { deed: p.text })}
                on={hoverSeg === late.key} forSeg={late.key}
                label={late.tail} deed={p.text} lane={late.lane}
                style={{ ...laneVar(late.lane),
                  ["--l" as string]: barLeft(late),
                  ["--w" as string]: barWidth(late),
                  left: "calc(var(--l) + var(--w) + 14px)" }} />
            );
          })()}
          {/**
            * ⚠️ THE LEAD-IN: MARKS BEFORE THE CARD, NEVER ON IT (v54, Phase 3).
            *
            * A card is the current wait, so every earlier status change is history — and history
            * drawn ON the card is what forced the text to dodge it. Twelve distinct text insets
            * across the board came from exactly that, and no two rows started their sentence in
            * the same place.
            *
            * A mark whose date falls inside a card is dropped rather than moved. It is not lost:
            * a clock inside the current wait IS "quiet for N days" and a bang IS the deed, both of
            * which the card already states. Drawing it as well says one thing twice and puts it
            * where the words are.
            */}
          {/**
            * ⚠️ THE GHOST RINGS: a named date past the card's end, drawn as a place rather than a
            * thing. Dotted while it is still ahead; solid with a badge once it has arrived, which
            * is the one moment it stops being a forecast and starts being a deed.
            *
            * ⚠️ IT CLEARS THE CARD BY CONSTRUCTION, not by a tuned offset: it is only emitted for
            * a date PAST the card's end, and it is centred on that date, so the gap is whatever
            * the dates are. A ring nudged clear of a card it overlaps would be stating a day it is
            * not drawn on.
            */}
          {(() => {
            const cardStart = new Map<string, number>();
            for (const sg of bar.segs) {
              const k = `${sg.rowKey}::${sg.lane}`;
              cardStart.set(k, Math.min(cardStart.get(k) ?? Infinity, sg.from));
            }
            const lead = bar.nodes.filter((n) => {
              const st = cardStart.get(`${n.rowKey}::${n.lane}`);
              return st == null || n.at < st - 0.001;
            });
            const byLane = new Map<number, { first: number; to: number }>();
            for (const n of lead) {
              const st = cardStart.get(`${n.rowKey}::${n.lane}`);
              if (st == null) continue;
              const cur = byLane.get(n.lane);
              byLane.set(n.lane, { first: Math.min(cur?.first ?? Infinity, n.at), to: st });
            }
            return (
              <>
                {/* the dotted run from the first mark to the card's leading edge */}
                {[...byLane.entries()].map(([lane, r2]) => (
                  <div key={`li-${lane}`} className="tl-leadin" aria-hidden
                    style={{ left: pct(r2.first), width: pct(Math.max(0, r2.to - r2.first)),
                      ...laneVar(lane) }} />
                ))}
                {/* ══ PAST STAGES (v60, Phase 4) ═══════════════════════════════════════════
                    ⚠️ ONE CARD PER PRIOR WAIT, AND A STAGE IS THE GAP BETWEEN TWO EVENTS. A node
                    records the moment a query MOVED; what the reader wants is the stretch between
                    two of them, and what happened at its end. So the stages are the consecutive
                    pairs, with the last running to the current card's own start.

                    ⚠️ THE ANATOMY IS THE CURRENT CARD'S, AT REDUCED SCALE AND SETTLED — a dotted
                    outline, no lift, its own StatusDot at very low opacity. Not the live card
                    faded: a past stage is a different KIND of thing, and drawing it as a dimmed
                    present tense is what makes a board's history read as unfinished work.

                    ⚠️ AND THE GAP AT EACH END CLEARS THE BADGE. A stage card is inset by the
                    badge's own overhang plus a gap, so consecutive stages do not run their
                    medallions into each other's words — the ref's `G + MED`. */}
                {(() => {
                  const byL = new Map<number, BarNode[]>();
                  for (const n of lead) {
                    const l = byL.get(n.lane);
                    if (l) l.push(n); else byL.set(n.lane, [n]);
                  }
                  const out: React.ReactNode[] = [];
                  for (const [lane, ns] of byL) {
                    const sorted = [...ns].sort((a, b) => a.at - b.at);
                    const stop = cardStart.get(`${sorted[0].rowKey}::${lane}`);
                    if (stop == null) continue;
                    for (let i = 0; i < sorted.length; i++) {
                      const a = sorted[i];
                      const b = sorted[i + 1];
                      const from = a.at;
                      const to = b ? b.at : stop;
                      /* ⚠️ TOO NARROW TO HOLD A CARD IS NOT DRAWN, AND THE REF'S OWN THRESHOLD IS
                         TOO LOW. It skips a stage under 1.5% of the lane — 1.35 days at this
                         window — while subtracting a gap of `badge + clearance` from the width. A
                         two-day stage therefore rendered as a 2px dotted sliver with a 54px badge
                         hanging off it: measured, two of the three stages on this board.

                         ⚠️ THE GATE IS IN DAYS, NOT PIXELS, BECAUSE NOTHING HERE MAY MEASURE THE
                         LANE (Law 6). The arithmetic: the gap is `--badge * 0.79 + 12px` ≈ 58px,
                         and at the narrowest width this board supports (1280, lane ≈ 930px over a
                         90-day window) a day is ≈ 10.3px — so the gap alone is ≈ 5.6 days and a
                         card needs roughly that again for its words. `STAGE_MIN_DAYS` is 12.

                         ⚠️ NOTHING IS LOST BY SKIPPING ONE. The node's own marker still stands on
                         its date and its caption still reaches the hover record; what is dropped is
                         a CARD too small to carry either. */
                      if (to - from < STAGE_MIN_DAYS) continue;
                      /* ⚠️ A NARROW STAGE DROPS ITS BADGE RATHER THAN BEING DROPPED (v61). v60c
                         skipped everything under twelve days because a 54px medallion could not fit
                         beside words in a short card; the badge is 30px and INSIDE the card now, and
                         the ref gives a second threshold below which it comes off entirely and the
                         text starts at the card's own inset. So the gate comes down and two stages
                         this account holds are drawn where v60c dropped them. */
                      const narrow = to - from < STAGE_NARROW_DAYS;
                      const stage = a.status ? String(a.status) : a.caption;
                      const end: StageEnd = !b
                        ? "out"
                        : b.dir === "in" ? "in" : b.dir === "close" ? "none" : "out";
                      out.push(
                        <div key={`js-${a.key}`} className={`tl-jc${narrow ? " narrow" : ""}`} data-seg={`js-${a.key}`}
                          /* v65 §C — clicking a ghost opens ITS card: the finished-stage form
                             (full gauge, no today, stage counters, no action). The facts are the
                             loop's own — the same numbers this stage is painted from. */
                          onClick={(e) => {
                            const rowName = rows.find((r2) => r2.key === a.rowKey)?.name ?? "";
                            const stageDays = Math.round(to - from);
                            openCardOver({
                              key: `js-${a.key}`, rowKey: a.rowKey, isTask: false,
                              bandClass: `tl-st-${stateFor(a.status ?? QueryStatus.QUERIED)}`,
                              bandStatus: stage, holder: "", dotStatus: a.status ?? QueryStatus.QUERIED,
                              name: stageSentence({ stage, end, next: b?.status ? String(b.status) : undefined,
                                days: stageDays }),
                              agency: rowName,
                              fact: "", tail: `${dayDate(from)} – ${dayDate(to)}`, bang: false,
                              model: cardCFor({
                                kind: "ghost", start: from, end: to, today: from + (to - from),
                                startLab: dayDate(from), endLab: `${dayDate(to)}${b?.status ? ` · ${String(b.status).toLowerCase()}` : ""}`,
                                eyebrowDays: stageDays, nudges: nudgeCountFor(sorted[0]?.queryId),
                                totalDays: null, stageIdx: i + 1, stageCount: sorted.length,
                              }),
                              fillTone: "cream",
                              note: "—", action: null, queryId: sorted[0]?.queryId,
                            }, e.currentTarget as HTMLElement);
                          }}
                          style={{
                          left: pct(from),
                          width: `max(0px, calc(${pct(to - from)} - var(--tl-jc-gap)))`,
                          ...laneVar(lane),
                        }}>
                          <span className="tl-jmed" aria-hidden>
                            <StatusDot status={a.status ?? QueryStatus.QUERIED}
                              overrideSize={STAGE_BADGE_PX} />
                          </span>
                          <span className="tl-jbody">
                            <span className="tl-js">{stage}</span>
                            <span className="tl-jd">{stageSentence({
                              stage, end, next: b?.status ? String(b.status) : undefined,
                              days: Math.round(to - from),
                            })}</span>
                          </span>
                        </div>,
                      );
                    }
                  }
                  return out;
                })()}
                {lead.map((n) => (
                  <Marker key={n.key} n={n} selected={sel === n.key}
                    onPick={() => setSel((c) => (c === n.key ? null : n.key))} />
                ))}
              </>
            );
          })()}
          {/* ⚠️ A TASK ROW DRAWS NO POINTS — ITS BAR IS THE TASK (v63, §F). The chip-and-checkbox
              rendering said WHEN a task was due and nothing about how long it had been waiting,
              which is the one question a board of dates exists to answer. The points survive on
              AGENT rows, where they are events on a relationship rather than the relationship
              itself; retiring the whole map would have taken those with them. */}
          {(r.key.startsWith("task-") ? [] : r.items).map((it) => (
            <button
              key={it.key}
              type="button"
              /* ⚠️ A GHOST SAYS ITS OWN NAME. It is the ORIGIN mark — "this fell due here and is
                 still outstanding" — and it was rendering identically to the live chip beside it:
                 same solid border, same white ground, same opacity, same text. A correct pair of
                 marks read as one task drawn twice. The grid era distinguished them and the
                 Porcelain rebuild dropped the treatment without replacing it. */
              className={`tl-at2 tl-tchip${it.kind === "ghost" ? " ghost" : ""}${it.struck ? " struck" : ""}${it.draggable && it.card?.userTaskId ? " grab" : ""}${sel === it.key ? " sel" : ""}`}
              style={{ left: `calc(${pct(it.idx)} + var(--tl-gap))`, ...laneVar(it.lane) }}
              draggable={!!(it.draggable && it.card?.userTaskId)}
              onDragStart={it.draggable && it.card?.userTaskId ? (e) => {
                /* the payload rides the event for protocol correctness — the STATE is what the
                   drop reads; dataTransfer is write-only in dragover */
                e.dataTransfer.setData("text/plain", it.card!.userTaskId!);
                e.dataTransfer.effectAllowed = "move";
                setDragTask({ id: it.card!.userTaskId!, from: it.ymd });
              } : undefined}
              onDragEnd={endDrag}
              onClick={() => pick(r.key, it)}
            >
              {/**
                * ⚠️ A TASK IS A POINT, NOT A PILL (v54, Phase 7). A pill is the shape this board
                * uses for whose-move-it-is on a CARD — a state that persists over a span. A task
                * happens on a day: an outlined mark at that day, its name beside it, and the day
                * itself in mono underneath. Wearing the pill's shape made a task look like a
                * fifth kind of card, and it carried no duration to justify one.
                */}
              <span className="tl-tmk" aria-hidden />
              {/**
                * ⚠️ A ROLLED TASK'S GHOST IS A BOX AND NOTHING ELSE (v58, per the ref's `taskHTML`).
                *
                * It marks the date the task was ORIGINALLY due; the live mark at its current date
                * is where the words belong. Rendering the label on both put two copies of the same
                * sentence a few pixels apart — measured on the deployed board as
                * "Reread the O'Rourk|ages before Thursday", which reads as garbled text rather than
                * as two elements, and was reported as a data-mapping bug for that reason.
                *
                * ⚠️ THE MECHANISM WAS OVERLAP, NOT ENCODING. Both labels are correct strings; the
                * ghost's simply sat under the live one. Nothing is wrong with the data.
                */}
              {it.kind !== "ghost" && (
              <span className="tl-twords">
                <span className="tl-tname">{it.label}</span>
                {/* ⚠️ THE DAY IT FALLS ON, FROM THE ITEM'S OWN DATE — never a duration. A task
                    happens on a day; "3 days" would be a span, which is what a card states and a
                    task does not have. */}
                <span className="tl-tdue">{shortCalDate(it.ymd)}</span>
              </span>
              )}
              {/* the forward mark: this is where it fell due, and the live one is over there */}
              {/* ⚠️ A GHOST IS A BOX AND NOTHING ELSE (v58, the ref's `taskHTML`). The arrow said
                  "this moved" a second time — the dashed box already says it, and the live mark at
                  the current date says where it moved TO. A third statement of one fact, and the
                  one that made a bare ghost read as a tiny piece of text. */}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
              <div
                className="tl tl-wrap"
                ref={wrapRef}
                style={{ "--tl-days": range.days } as React.CSSProperties}
                onMouseMove={onLaneMove}
                onMouseLeave={clearCross}
                {...dragWindow}
              >
                {/* ══ THE RAIL ═══════════════════════════════════════════════════════════════
                    ⚠️ IT USES THE SAME THREE COLUMNS AS EVERY ROW, and that is the whole of the
                    alignment guarantee. `.tl-c-nm` takes the same width token
                    a row does, so the rail's timeline column BEGINS where every lane begins — and
                    a tick placed at `pct(d)` of it lands on the same pixel as a bar placed at
                    `pct(d)` of a lane. One column source, one expression, no second arithmetic to
                    drift. The today line's own 346px error came from having a second one. */}
                {board.length > 0 && (
                  <div className="tl-rail">
                    {/* ⚠️ v58: NO AGENT CELL IN THE RAIL EITHER. It was the only thing still
                        holding the column open — the rows had already lost theirs, so the lane sat
                        293px in from the board's edge with nothing beside it. */}
                                       <div className="tl-c-tl tl-railtl">
                      {/* ══ THE MONTH SHELF, WHICH ONLY APPEARS WHERE IT SAYS SOMETHING ══════
                          ⚠️ THREE MONTHS IS THE THRESHOLD, AND IT IS COUNTED FROM THE WINDOW
                          RATHER THAN THE RANGE. At one month the window straddles two calendar
                          months, so the shelf drew two labels and a single divider over a span
                          that is almost entirely one month — and that lone divider reads as a
                          stray mark on the rule rather than as a boundary between two things. The
                          nine date labels already carry that range. `months` IS the list of
                          calendar months the window touches, so its own length is the span: no
                          second derivation, and it stays right if the ranges are ever retuned. */}
                      {/* ⚠️ THE MONTH TIER IS UNCONDITIONAL NOW. It was gated at three months
                          because a lone divider on a one-month window reads as a stray mark; the
                          window is fixed at ninety days, so it always spans three or four and the
                          gate can never fire. A condition that cannot be false is a claim nobody
                          can check — the label is the rail's top tier and it is always drawn.
                          ⚠️ AND THE DIVIDER ELEMENT IS GONE: the separator is a `border-left` on
                          the LABEL, so it exists only in the rail and cannot run down through the
                          rows. v62 states that twice — `.col.m { display: none }` as well. */}
                      {months.map((m) => (
                        <React.Fragment key={m.key}>
                          <span
                            className={`tl-mlab${m.current ? " now" : ""}${m.past ? " gone" : ""}`}
                            style={{ left: pct(m.labelAt) }}
                          >{m.label}</span>
                        </React.Fragment>
                      ))}
                      {/* the ticks and their days */}
                      {/* ══ WEEK TILES (v60's `data-rail="tiles"`) ═════════════════════════════
                          ⚠️ THE TICK IS GONE WITH THEM. v60 sets `.wktick { display: none }` under
                          tiles: a tile is already a mark standing on its own date, and a tick
                          beneath it is a second, thinner claim about the same pixel. The date is
                          `data-at` on the tile itself so the alignment lock still has something to
                          read. */}
                      {dateLabels.map((d) => (
                        /* ⚠️ A PLAIN DAY NUMERAL, AND TODAY IS A FILLED CIRCLE (v62). The tile —
                           a bordered card on every week — put thirteen objects on a scale that only
                           needs to be legible, competing with the cards beneath them. The numeral
                           carries the date and the circle carries today, which is the only colour
                           the rail is allowed. */
                        <span key={d.ymd}
                          className={`tl-dt${d.now ? " now" : ""}`}
                          style={{ left: pct(d.at) }} data-at={d.at}>
                          {d.day}
                        </span>
                      ))}
                      {todayAt != null && (
                        <>
                          {/* ⚠️ THE STEM UNDER THE TODAY CIRCLE IS GONE (v63). It was a tick
                              rising from the rail's baseline to meet a today CAP that no longer
                              exists — the filled circle IS the mark now, and a tick beneath a
                              numeral inside its own disc is a second pointer at a date the disc
                              already names. */}
                          <span className="tl-todaychip" style={{ left: pct(todayAt) }}>{shortCalDate(today)}</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
                {/* ══ THE ROWS REGION — THE ONE THING ON THIS BOARD THAT SCROLLS (v60, Law 4) ══
                    ⚠️ THE RAIL IS ITS SIBLING, NOT ITS ANCESTOR, and that is the whole of the law.
                    v58 pinned the rail with `position: sticky` INSIDE the scroller, which pins by
                    clamping — so on a board with nothing to scroll the clamp is the only behaviour
                    left, and anything that changed the rail's height moved the rows under it. Here
                    the rail is outside the scrolling box and cannot be reached by it at all. */}
                <div className="tl-rows" onMouseOver={onRowsOver} onMouseOut={onRowsOut}
                  onScroll={cardAt ? closeCard : undefined}>
                {/* ⚠️ `.tl-rowsin` EXISTS FOR THE TODAY LINE (v64 §C). In a scroller, an absolutely
                    positioned child's `bottom: 0` resolves against the SCROLLPORT, not the content
                    — so a line meant to run the content height needs an inner wrapper that IS the
                    content height. The line is its child at a percentage left: the same fraction
                    the bars use, no measurement, and it scrolls with the rows by construction. */}
                <div className="tl-rowsin">
                {todayAt != null && (
                  /* ⚠️ THE SAME DAY THE TICK USES, THROUGH THE SAME MAPPING. This read
                     `todayAt` — `i + 0.5`, the day's MIDPOINT — while `dateLabelsOf` pushes the
                     tick at `at: d`, the whole index, and `.tl-dt` centres itself on it with
                     `translateX(-50%)`. One date, two x's, half a day apart: measured 3.13 / 4.55 /
                     5.52 / 6.67 / 6.94px at the five widths against half-days of 3.62 / 5.04 /
                     6.01 / 7.18 / 7.43 — the shortfall being this element's own 1px border pulled
                     back 1px so the line straddles its date.
                     The line adopts the TICK's day rather than the tick adopting the line's: the
                     numerals run on a seven-day stride and moving them would shift every week
                     marker on the ruler, which is the board's interior and not this pack's to
                     redraw. */
                  <div className="tl-todayline" aria-hidden
                    style={{ left: pctOfRows(Math.floor(todayAt), range.days) }} />
                )}
                {board.length === 0 ? sparse : (
                  /* ══ SIX SECTIONS, EACH A CONTAINER (v60) ═══════════════════════════════════
                     ⚠️ THE SECTION REPLACES BOTH EARLIER SHAPES — v58's single bare list and the
                     grouped heading-over-loose-rows before it. A heading on the ground above its
                     rows cannot tell a reader four rows down which section they are in; a tinted
                     container running the height of the section answers it without a word. */
                  drawnGroups.map((g) => (
                    <div className="tl-grp" key={g.key} data-sec={g.tone ?? undefined}>
                      {/* ⚠️ A DIVIDER, NOT A HEADER (v61). A hairline across the container with a
                          tinted pill sitting ON it — icon, name and a zero-padded count. The count
                          is here because a pill is small enough to hold one; the v60 header spanned
                          the width and could not state a number without competing with the row it
                          introduced.
                          ⚠️ AND UNDER `No grouping` THERE IS NO DIVIDER AT ALL (v63). A heading
                          reading "everything" over every row on the board is a line of chrome that
                          states nothing — the same silence-wins rule an empty section follows. */}
                      {g.label !== "" && (
                        <div className="tl-gdiv" role="button" tabIndex={0}
                          aria-expanded={!collapsedGroups.has(g.key)}
                          aria-label={`${collapsedGroups.has(g.key) ? "Expand" : "Collapse"} ${g.label}`}
                          onClick={() => toggleGroup(g.key)}
                          onKeyDown={(e) => {
                            if (e.key !== "Enter" && e.key !== " ") return;
                            e.preventDefault(); toggleGroup(g.key);
                          }}>
                          <span className="gp">
                            {/* ⚠️ THE MARK COMES FROM WHAT THE GROUP IS. A section group draws its
                                own icon; a status group draws the app's own `StatusDot`, which is
                                the one way a status is ever drawn here; a group that is neither
                                draws nothing rather than borrowing a mark that would claim it. */}
                            {g.status != null
                              ? <StatusDot status={g.status} overrideSize={13} />
                              : g.tone != null ? <SectionIcon sec={g.tone} /> : null}
                            <span>{g.label}</span>
                            <b>{String(g.rows.length).padStart(2, "0")}</b>
                          </span>
                          {/* what the group is FOR — absent where there is nothing true to say */}
                          {g.purpose && <span className="geb">{g.purpose}</span>}
                          {/* ⚠️ THE CHEVRON SHOWS THE STATE, and the COUNT beside it is why a
                              collapsed group stays honest: the pill still says how many rows are
                              folded away, so nothing disappears without saying so. */}
                          <span className="tl-gchev" aria-hidden>
                            {collapsedGroups.has(g.key) ? "›" : "⌄"}
                          </span>
                        </div>
                      )}
                      {!collapsedGroups.has(g.key) && (
                      <div className="tl-gwrap">
                        {/* ⚠️ THE NUMBER COLUMN IS A SIBLING OF THE LANES, NOT A CELL IN EACH ROW.
                            One element per row, at exactly `--row-h`, so the numbers line up with
                            the rows by sharing the row token rather than by being inside them —
                            which is what lets a two-lane row grow without the number drifting. */}
                        <div className="tl-gnums" aria-hidden>
                          {g.rows.map((r) => (
                            <div className="tl-gnum" key={r.key}
                              style={{ ["--lanes" as string]: String(Math.max(1, r.lanes)) } as React.CSSProperties}>
                              <span>{String(rowNumber.get(r.key) ?? 0).padStart(2, "0")}</span>
                            </div>
                          ))}
                        </div>
                        <div className="tl-glanes">{g.rows.map(row)}</div>
                      </div>
                      )}
                    </div>
                  ))
                )}
                </div>
                </div>
                {/* ⚠️ THE OLD GROUPED BLOCK AND THE BARE ONE LIST ARE BOTH DELETED, NOT LEFT
                    BEHIND A FALSE GUARD. v60's sections replace them; a replacement that is
                    ADDED leaves the original reachable, and this repo has paid for that three
                    times in one build. `board` still feeds the tab counts and the manuscript
                    cut, which is why the derivation survives and only its render is gone. */}
                {/* ⚠️ THE TODAY LINE LIVES IN THE ROWS NOW (v64 §C) — rendered inside
                    `.tl-rowsin`, so it begins at the first row, runs the content height, and never
                    crosses the date row or the winbar. The flag went with it: `display: none`
                    furniture whose render outlived its rule. The crosshair stays a wrap child —
                    it must span the rail and rows, which is its job. */}
                {/* the action's receipt — what was pressed, never a claim the work is done */}
                {actToast && <div className="tl-acttoast" role="status">{actToast}</div>}
                
                {cross && (
                  <>
                    <div className="tl-xh" style={{ left: `${cross.x}px` }} aria-hidden />
                    <div className="tl-xhlab" style={{ left: `${cross.x}px` }} aria-hidden>{cross.label}</div>
                  </>
                )}
              </div>
  );
};
