/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Calendar — a rolling WEEK TIMELINE (calendar timeline pack, Phase 3; structure from
 * design-refs/timeline-week-ref.html, grammar from design-refs/timeline-event-catalogue.html).
 *
 * ⚠️ ROWS ARE RELATIONSHIPS, COLUMNS ARE DAYS — and the reason is the data, not the drawing. A
 * query's silence is a SPAN, and a grid of day cells has nowhere to draw one; the month could
 * therefore never answer "how long has this been quiet", which is the question a querying writer
 * actually has. One row per agent, plus a permanent "Your tasks" row pinned above them.
 *
 * ⚠️ NOTHING BELOW THE VIEW CHANGED. `assembleBoardColumns`, `calendarDays`, `recordDays`,
 * `dedupeAgainstRecord`, `ghostsFor`, `pillLabel`, `draggableTask`, `useTaskPaneSession`,
 * `quickDone` and the toast-as-receipt are the same functions the month grid read. The rows are
 * derived on top of them by `todoTimeline`, which is pure and locked.
 *
 * ⚠️ WHAT WENT WITH THE MONTH, because every one of them answered to a day CELL: the fold and its
 * `+N MORE`, the density floor and `data-fold-short`, the hover peek, the day panel and its
 * collapse chevron, the month jump, the `Upcoming only` mode and the event-kind vocabulary that
 * served it. A row grows to hold what it holds — there is nothing left to overflow.
 */
import React, { useLayoutEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { TasksPageLayout, TplGrow, TplZone } from "./TasksPageLayout";
import { useTodoToast } from "./useTodoToast";
import { FocusFlow } from "./FocusFlow";
import { TaskPane } from "./TaskPane";
import { useTaskPaneSession, type TaskPaneHost } from "./useTaskPaneSession";
import { useTaskCommit } from "./useTaskCommit";
import { TimelineRangeSlider, TIMELINE_RANGES, DEFAULT_RANGE_INDEX, pastDaysOf } from "./TimelineRangeSlider";
import {
  GROUP_ORDER, GROUP_LABEL, COLLAPSED_BY_DEFAULT, groupSentence, TASKS_HEADING, TASKS_SENTENCE,
  asksOfYou,
  type RowGroup,
} from "../../lib/timelineGroups";
import { pillText } from "../../lib/calendarPill";
import { fadesFor, cardBounds } from "../../lib/calendarFade";
import { cycleFor } from "../../lib/calendarMarquee";
import { tierFor, STUB_MAX_W } from "../../lib/cardTier";
import { useConfirmAsk } from "./ConfirmAsk";
/** this mount's pane section-id prefix — every workspace page stays mounted, so ids must not collide */
const CAL_PANE_PREFIX = "cal-";
import { useScriptAllyDb } from "../../lib/db";
import { localYMD } from "../../lib/shellSidebar";
import { TODO_OPEN_COMPOSER } from "../../lib/todoRoutes";
import { assembleBoardColumns } from "../../lib/todoColumns";
import { BoardCard } from "../../lib/todoBoard";
import {
  calendarDays, recordDays, dedupeAgainstRecord, ghostsFor,
  shortCalDate, carriedLine, expectedLine, REC_TONE,
  CalendarItem, RecordItem, GhostItem,
} from "../../lib/todoCalendar";
import {
  windowDays, shiftWindow, timelineWeek, defaultView,
  FILTER_LABEL, SORT_LABEL, SORT_ORDER, SORT_MEANING,
  YOU_ROW,
  type TimelineItem, type TimelineRow, type TimelineView,
  type RowSort, type TimelineFilter,
} from "../../lib/todoTimeline";
import {
  durationCount, barLines, familyOf, holderOf,
  type Segment, type BarNode,
} from "../../lib/journeyBars";
import { classifyWriteError, saveErrorCopy } from "../../lib/todoWrite";
import { useDockActivity } from "./useDockActivity";
/* ⚠️ THE QUERY CENTRE'S OWN ROWS, NOT A SECOND READING PANE. `FocusFlow` already mounts these two
   from the To-do world (`FocusFlow.tsx:33`), so the precedent and the shape are both established;
   building a calendar-local conversation would be the second implementation this repo forbids. */
import { TimelineRows, buildTimelineRows } from "../reading-pane/QueryTimeline";
import { StatusDot } from "../StatusDot";
import { formatQueryMaterial } from "../../lib/materials";
import { getPrimaryAction } from "../../lib/queryPrimaryAction";
import { agentPrimary, agentSecondary } from "../../lib/agentDisplay";
import "./tasksLayout.css";
import "./taskChrome.css";
import "./todoCalendar.css";

export interface TodoCalendarPageProps {
  onNavigate: (tab: string, sub?: string) => void;
  onNavigatePath?: (path: string) => void;
}

/** Seven days. The window is rolling, so there is no month to be a subset of. */
const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

/**
 * ⚠️ POSITION IS A PERCENTAGE OF THE SEVEN COLUMNS, NEVER A PIXEL. The lane spans the day columns
 * of a grid whose tracks are `minmax(0, 1fr)`, so a percentage inside it lands on the same
 * boundaries the cells do at every width — which is what makes "seven columns fill, no horizontal
 * scroll" survive a resize with nothing to recompute.
 */
/**
 * ⚠️ A POSITION IS A FRACTION OF THE WINDOW, AND THE WINDOW'S LENGTH IS THE BOARD'S FACT.
 *
 * `pct` was `n / TL_DAYS` against a module constant of 7, so every position on the board was
 * computed against a number that could only ever be one range. It is now `calc()` against
 * `--tl-days`, declared once on `.tl` and inherited by everything inside it: the page supplies
 * only the day INDEX — data — exactly as it supplies the spine's fraction, and the geometry is the
 * stylesheet's. That is the pack's standing rule, and it is also what makes the range cost no
 * second derivation: change one custom property and every bar, marker and chip reprices itself.
 *
 * The columns change what a reader SEES. They are not what anything is positioned by.
 */
/**
 * How many calendar months a window must touch before the rail draws its month shelf.
 *
 * ⚠️ A NUMBER WITH A NAME, because the alternative is a bare `>= 3` in the JSX that reads as an
 * accident. Two months is not a shelf: it is one divider, and one divider on a long rule is a mark
 * rather than a boundary.
 */
const MONTH_SHELF_FROM = 3;

/**
 * How far in from a card's left edge its contents begin.
 *
 * ⚠️ IT IS HERE AND IN THE SHEET, AND THE FIT PASS IS WHY. The stylesheet places the text; the fit
 * pass has to subtract the same distance to know what room the text actually has, and a pass
 * measuring against the whole bar would let a line run past the right-hand end by exactly this.
 * The lock asserts the two agree, because two numbers that must match and live apart is the shape
 * this pack keeps finding.
 */
const TEXT_INSET = 14;

/**
 * ⚠️ `cqw`, NOT `%` — AND THE UNIT IS THE WHOLE POINT.
 *
 * A percentage means "of my parent", so this expression meant "of the lane" only for a DIRECT
 * child of the lane. The ticks, the chips and the bars are direct children and were right; the
 * FILL is a grandchild, so the identical arithmetic inside a bar silently measured the bar. That
 * is how the board came to have two date→x mappings while every rule read correctly.
 *
 * `.tl-c-tl` is a size container (see the stylesheet), so `100cqw` is the lane's width at any
 * depth. One expression, one width, for the rail's ticks and the bars and the fills alike.
 */
/** the card's pinned left, matching `--tl-text-inset` in the stylesheet */
const PILL_INSET = 13;

/** the flex gap between the pill and the line it sits beside, matching `.tl-p`'s own */
const PILL_GAP = 10;

const pct = (n: number) => `calc(${n} / var(--tl-days) * 100cqw)`;

/**
 * ⚠️ A CARD SPANS EXACTLY ITS OWN DATES — NO CLEARANCE AT EITHER END, AND THE REMOVAL IS THE
 * POINT RATHER THAN A TIDY-UP.
 *
 * The clearance existed because pieces NEIGHBOURED each other: a run cut at a status change put
 * two pieces either side of one marker, and `--tl-gap` / `--tl-gap-mk` kept them off it. With one
 * card per relationship there is no neighbour to stand off from, and the 2px it still subtracted
 * was doing active harm: the closing mark sits at the end date, so a card inset 2px inside its own
 * end painted its terminal mark OUTSIDE itself. Measured, twice, before the lock's tolerance was
 * blamed — mark centre 889.4 against a card ending 887.4.
 *
 * `abutL`/`abutR` go with it. They answered "does this piece touch a marker", which is a question
 * only a cut model can ask.
 */
const barLeft = (sg: Segment) => pct(sg.from);
const barWidth = (sg: Segment) => pct(sg.to - sg.from);
/**
 * ⚠️ THE PAGE DECLARES WHICH LANE; THE STYLESHEET DECIDES WHERE THAT IS.
 *
 * `LANE_STEP = 52` and `laneTop(lane) = lane * 52` are retired, and so is `minHeight: lanes * 52
 * + 28`. Both read 52 and neither was the other's: the row's height was one expression and the
 * bar's offset was another, so the bar sat at the TOP of its row — measured, a 36px bar at `top:
 * 0` in a 132px row with 96px of empty ground beneath it. It is the shape `--tl-head-h` had, where
 * one element's position was written as a number a different element owns.
 *
 * A lane index is DATA — which line of this row does this belong to. Where that line is, and how
 * tall it is, are geometry, and geometry belongs where the tokens are. The page hands down
 * `--lane` and `--lanes`; every offset in the sheet is a `calc()` over `--lane-h`.
 */
const laneVar = (lane: number): React.CSSProperties =>
  ({ ["--lane" as string]: String(lane) } as React.CSSProperties);

/* ⚠️ THE PAGE NO LONGER OWNS A FAMILY MAP. `familyOf` in `journeyBars` is the one source — the
   page had a second table keyed on the same `BarState`, which is two answers to one question
   waiting to disagree. Deleted rather than left as a pass-through. */

/**
 * One piece of a bar — a white track, a tinted fill, and the label riding on top.
 *
 * ⚠️ THE FILL IS AN ELEMENT WITH A WIDTH, NOT A GRADIENT STOP. A percentage written into a
 * background is a number no probe can read back and no reader can be sure of; a child with
 * `width: N%` is measurable, and `fillFor` is the only thing that decides N.
 *
 * ⚠️ AND A BAR WITH NO NAMED END RENDERS NO FILL ELEMENT AT ALL — not a fill of zero. Zero is a
 * claim that no time has passed; absence is the claim that nobody named a date, which is the true
 * one and the one the emptiness is there to make.
 */
const Piece: React.FC<{
  sg: Segment; days: number; lastMarkAt: number | null; selected: boolean; onPick: () => void;
}> = ({ sg, days, lastMarkAt, selected, onPick }) => {
  const lines = barLines(sg.label);
  /* ⚠️ THE PILL IS THE APP'S OWN VOCABULARY — see `calendarPill`. The status while the agency
     holds the move, the deed while the writer does, and nothing else is reachable. */
  const pill = pillText(sg.status, holderOf(sg), sg.nudgeDue);
  const facts = { trueFrom: sg.trueFrom, trueTo: sg.trueTo, from: sg.from, to: sg.to, days, live: sg.live };
  const fade = fadesFor(facts);
  const bounds = cardBounds(facts);
  /**
   * ⚠️ THE CONTENT BEGINS AFTER THE LAST MARK, and that is what makes one card possible.
   *
   * Marks used to BREAK the bar, so text never met one: the pieces were cut around them. With the
   * bar unbroken they ride on it, and words under a 22px disc are words nobody can read — measured
   * on the first render, a clock sitting across "FULL SENT" and "Quiet for 35 days".
   *
   * The offset is expressed in the lane's own mapping so it needs no measurement: the mark's
   * distance from the card's start, plus its own radius, plus the pinned 14px of air. `max()`
   * keeps the pinned left where a card has no mark, and a fadeL card takes its own inset — its
   * first 38px are dissolving, so text there would fade out mid-word.
   */
  /**
   * ⚠️ THE FADE INSET IS A FLOOR, NOT A CEILING — and the brief's two clauses meet here.
   *
   * "…or 44px on a fadeL card" is written for the ordinary left-clipped card, whose marks are off
   * the left edge with nothing in view to clear. A relationship that began before the window and
   * changed status INSIDE it has both: a dissolving left edge AND a mark to get past. Measured on
   * the first build, with the inset taken as a fixed value: content pinned at 623 with marks
   * painted at 682 and 903 — the clock sitting across "FULL SENT" and "Quiet for 35 days", which
   * is the exact fault this rule exists to remove. Both clauses are floors, so both are honoured
   * by taking the larger.
   */
  const inset = fade.left ? "var(--card-fade-inset)" : "var(--tl-text-inset)";
  const contentLeft = lastMarkAt == null
    ? inset
    : `max(${inset}, calc(${pct(lastMarkAt - sg.from)} + calc(var(--mk) / 2) + 14px))`;
  return (
    <div
      /* ⚠️ THE CLASS LIST IS WRITTEN IN THE JSX, not built into a `const` above it. The style-reach
         sweep reads `className=` expressions out of this file, so a list assembled into a variable
         is invisible to it — and its report would be "this class has no rule", about a class it
         never saw. An absence that reads as a finding. */
      className={`tl-at2 tl-p ${familyOf(sg.state)}${sg.hollow ? " hollow" : ""}`
        /* ⚠️ THE FADES ARE THE SEGMENT'S OWN FACTS. `openLeft` means the stretch began before the
           window and `openRight` that it runs past it — both already derived, both already the
           reason the old renderer squared its ends. */
        /* ⚠️ THE PREDICATES ARE THE ONLY SOURCE — see `calendarFade`. This read `openLeft` and
           `openRight || live`, which is nearly the same and nearly is the problem: `openRight` is a
           compound that also asks whether the journey is terminal, whether it closes, whether it is
           open-ended and whether a reply window was given, so a card's edge dissolved because of a
           decision about reply windows. */
        + `${fade.left ? " fadeL" : ""}${fade.right ? " fadeR" : ""}`
        + `${selected ? " sel" : ""}`}
      style={{ left: barLeft(sg), width: barWidth(sg), ...laneVar(sg.lane),
        ["--content-left" as string]: contentLeft }}
      /* ⚠️ THE RELATIONSHIP'S OWN IDENTITY, ON THE ELEMENT, so a lock can count cards PER
         RELATIONSHIP rather than per row. A row holds one card per drawn query, and a writer with
         two books at one agency has two — counting per row would call that correct state a
         failure, and counting per row on the OLD model would have called a fragmented bar a pass
         wherever it happened to hold one relationship. */
      data-rel={`${sg.rowKey}::${sg.lane}`}
      data-state={sg.state}
      /* ⚠️ WHICH QUERY THIS BAR IS, so a lock can ask whether the row's WORDS are about a query the
         row actually draws. Three variants of that bug shipped, each one a true sentence about a
         query the reader could not see, and none of them was catchable from appearance alone. */
      data-qid={sg.queryId}
      /* ⚠️ THE STRETCH'S OWN DATES, so the fade audit can assert the classes against the NUMBERS
         rather than asking a class about itself. The page published only the clipped coordinates
         before, so every leading piece reported a start of 0 — which is where a clipped card
         starts, not where its stretch began, and the audit could not be written at all. */
      data-truefrom={bounds.start.toFixed(3)}
      data-trueto={bounds.end.toFixed(3)}
      data-days={String(days)}
      data-live={sg.live ? "1" : undefined}
      data-tip={sg.tip || undefined}
      onClick={onPick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(); } }}
    >
      {/* ⚠️ THE PILL IS NOT INSIDE THE LABEL'S CONDITIONAL, and it used to be. A segment with an
          empty label rendered a card with NO pill and NO text — a blank white box with a border and
          a shadow, eight of them on a 32-card board. The pill never depended on the label: a card
          always knows whose move it is, which is the one thing it is for. */}
      <span className={`tl-pill ${pill.tone}`} data-pill={pill.text}>{pill.text}</span>
      {sg.label && (
        <>
          {/* ⚠️ THE PILL, THE HEADLINE AND THE DETAIL — three things on one line, in that order.
              The separator is an ELEMENT rather than a border on the detail, because the detail is
              the part that can be absent and a border would go with it, leaving the headline
              looking cut off. */}
          <span className="tl-line">
            {/* ⚠️ ONE TRACK HOLDING BOTH, so the marquee moves them together. Scrolling the
                headline while the detail stayed put would break the line in half mid-slide. */}
            <span className="tl-track">
              <span className="tl-hl">{lines.t1}</span>
              {lines.t2 && <span className="tl-csep" aria-hidden />}
              {lines.t2 && <span className="tl-cdt">{lines.t2}</span>}
            </span>
          </span>
        </>
      )}
    </div>
  );
};

/**
 * ⚠️ FOUR MARKERS AND NO NOTCH. The notch marked "somebody named this date"; the fill now carries
 * that distinction on its own — a filling bar means a date exists, an empty one means nobody set
 * it — and the bar terminates on the date either way. Three statements of one fact, so the
 * drawing goes and its caption moves onto the bar's tooltip, where it survives the long ranges at
 * which labels drop out.
 */
const GLYPH_IN = (
  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
    <path d="M8 5 H2.6 M4.6 2.8 L2.4 5 L4.6 7.2" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
  </svg>
);
const GLYPH_OUT = (
  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
    <path d="M2 5 H7.4 M5.4 2.8 L7.6 5 L5.4 7.2" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
  </svg>
);
const GLYPH_CLOCK = (
  <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden>
    <circle cx="6" cy="6" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.2" />
    <path d="M6 3.6 V6 L7.8 7.2" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
  </svg>
);

const Marker: React.FC<{ n: BarNode; selected: boolean; onPick: () => void }> = ({ n, selected, onPick }) => (
  <button
    type="button"
    className={`tl-at2 tl-mk2 ${n.mark}${selected ? " sel" : ""}`}
    style={{ left: pct(n.at), ...laneVar(n.lane) }}
    data-tip={n.caption}
    aria-label={n.caption}
    onClick={onPick}
  >
    {n.mark === "in" ? GLYPH_IN : n.mark === "outk" ? GLYPH_OUT : n.mark === "clock" ? GLYPH_CLOCK : "!"}
  </button>
);

/** A dropdown that names its current value — the same shape for Show and for Sort. */
function Menu<T extends string>({
  label, value, options, labels, meanings, onPick,
}: {
  label: string; value: T; options: readonly T[]; labels: Record<T, string>;
  /** what each option MEANS — a sort name is not a definition; see `SORT_MEANING` */
  meanings?: Record<T, string>;
  onPick: (v: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrap = React.useRef<HTMLSpanElement>(null);
  /* ⚠️ ESCAPE IS CONSUMED ON THE CAPTURE PHASE — the house cascade law: dismissing a popover must
     never fall through to a page-level handler that would also act on the same press. */
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      setOpen(false);
    };
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onDown, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("pointerdown", onDown, true);
    };
  }, [open]);
  return (
    <span className="tl-menuwrap" ref={wrap}>
      <button type="button" className="tl-mbtn" aria-haspopup="true" aria-expanded={open}
        aria-label={label} onClick={() => setOpen((o) => !o)}>
        {labels[value]} ▾
      </button>
      {open && (
        <div className="tl-menu" aria-label={label}>
          {options.map((o) => (
            <button key={o} type="button" aria-current={o === value}
              onClick={() => { onPick(o); setOpen(false); }}>
              <span className="tl-menuname">{labels[o]}</span>
              {meanings && <span className="tl-menuwhat">{meanings[o]}</span>}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

export const TodoCalendarPage: React.FC<TodoCalendarPageProps> = ({ onNavigate, onNavigatePath = () => {} }) => {
  const {
    tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, currentUser,
    updateUserTask,
  } = useScriptAllyDb();
  const now = Date.now();
  const today = localYMD(now);
  const { toast, flash, dismiss, pause, resume, remember } = useTodoToast();
  /* the duplicate-send guard is part of the WRITE path, not decoration — declining writes nothing */
  const { ask: confirmAsk, node: confirmAskNode } = useConfirmAsk();

  /* ⚠️ THE WINDOW IS ROLLING AND SESSION-LOCAL. It starts at today rather than at a month's first
     Monday, so there is no anchor to keep in step with a title and no other-month days to dim. */
  const [winStart, setWinStart] = useState(today);
  const [view, setView] = useState<TimelineView>(defaultView);
  /* ⚠️ SELECTING IS FREE — nothing is written, nothing opens. It rings the chip and fills the band
     below, and that is the whole of it. */
  const [sel, setSel] = useState<string | null>(null);
  /**
   * ⚠️ ACTING IS A DIFFERENT GESTURE FROM SELECTING, and the workspace is a STATE OF THE PAGE
   * rather than a thing that floats over it. The board collapses to one day's column, every agent
   * still listed and every row but this one dimmed, and the rest of the page becomes the work.
   *
   * ⚠️ THE DAY FOLLOWS THE ITEM RATHER THAN PINNING TO TODAY (one of Nick's open questions;
   * `follows` is the stated default). Opening a Friday task and being shown Wednesday would be the
   * page answering a question the writer did not ask.
   */
  const [work, setWork] = useState<{ rowKey: string; ymd: string; itemKey: string | null } | null>(null);
  const pageRef = React.useRef<HTMLDivElement>(null);


  const assembled = useMemo(
    () => assembleBoardColumns({
      tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, today, now,
      mutedTaskRules: currentUser?.mutedTaskRules,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, currentUser?.mutedTaskRules],
  );

  /**
   * ⚠️ THE RANGE IS THE STOP, NOT A DAY COUNT SOMEONE DERIVED. `TIMELINE_RANGES` carries the days,
   * the column grain and the density tier together, so the columns, the `dense` class and the
   * readout all read one row of one table and cannot drift apart.
   */
  const [rangeIdx, setRangeIdx] = useState(DEFAULT_RANGE_INDEX);
  /**
   * ⚠️ WHICH GROUPS ARE OPEN, AND SNOOZED IS THE ONLY ONE THAT IS NOT. A snoozed row vanishes from
   * the board entirely today; a collapsed group with its count on the header is honest about what
   * is being held back, which disappearance never is. State is session-only and deliberately not
   * persisted — a group that stays shut across visits is a group a writer forgets they closed.
   */
  const [shut, setShut] = useState<readonly RowGroup[]>(COLLAPSED_BY_DEFAULT);
  const range = TIMELINE_RANGES[Math.min(Math.max(rangeIdx, 0), TIMELINE_RANGES.length - 1)];
  /**
   * ⚠️ `winStart` IS THE ANCHOR DAY, AND THE WINDOW OPENS BEFORE IT (grouped pack, Phase 6).
   *
   * Every range now shows a slice of the past — roughly a fifth at the short ranges and a quarter
   * at three and six months. Keeping the ANCHOR as the state rather than the window's first day is
   * what makes that free: the pager moves the anchor, `Today` resets it to today, and changing the
   * range recomputes the slice without any of them knowing the slice exists. Storing the first day
   * instead would have put the same arithmetic in the pager, the Today button and the range
   * handler, three places to keep in step.
   *
   * ⚠️ AND IT IS WHAT MAKES THE LONG RANGES WORTH HAVING. Markers are RECORDS, which are in the
   * past; a forward-only six-month board is 182 days of forecast with nothing that happened on it.
   * Measured before this: 16 rows, 18 bar segments, one waypoint and ZERO markers at rest.
   */
  /**
   * ⚠️ THE FIT PASS: LONG, THEN SHORT, THEN BARE — measured, never estimated.
   *
   * A bar's width is DATA: the same stretch is a third of the board at one week and four pixels at
   * six months. So the label cannot be chosen at derivation time, and a character-count guess
   * would be wrong the moment a font loads differently or a date is two digits instead of one.
   * The browser is asked instead, exactly as the ref does it: set the long form, compare
   * `scrollWidth` against the bar's `clientWidth`, fall back to the short form, then hide.
   *
   * ⚠️ AN ELLIPSIS IS NOT AN OPTION, which is why the last step is bare rather than truncated. An
   * ellipsis is a promise that the rest is somewhere; on a bar it is not, and the row head's
   * sentence is where the writer actually reads what is happening.
   *
   * ⚠️ IT MUTATES `textContent` OUTSIDE REACT, and that is safe here BECAUSE React rewrites the
   * label from `sg.label` on every render and this effect runs after every one of them. The two
   * cannot drift: React always sets the long form, and this always re-decides.
   */
  /* ⚠️ THE MARKS BELONGING TO ONE CARD, READ OFF THE PAGE. The render knows which marks ride on
     which card and hands the LAST one's date to `Piece`; the fit pass needs their PIXELS, which
     only the browser has. Same set, two questions — the row is the lane, and a mark is on this
     card when its centre lies within the card's box, which is exactly what the lock asserts. */
  const markLefts = (seg: HTMLElement): number[] => {
    const lane = seg.parentElement;
    if (!lane) return [];
    const cb = seg.getBoundingClientRect();
    return Array.from(lane.querySelectorAll<HTMLElement>(".tl-mk2"))
      .map((m) => m.getBoundingClientRect())
      .filter((r) => r.top + r.height / 2 > cb.top - 4 && r.top + r.height / 2 < cb.bottom + 4
        && r.left + r.width / 2 > cb.left - 1 && r.left + r.width / 2 < cb.right + 1)
      .map((r) => r.left);
  };

  useLayoutEffect(() => {
    const fit = () => {
      const root = pageRef.current;
      if (!root) return;
      for (const seg of Array.from(root.querySelectorAll<HTMLElement>(".tl-p"))) {
        /**
         * ⚠️ A PIECE WITH NO ROOM TO DRAW IS NOT DRAWN, and `border-box` is why this is needed.
         *
         * A bar stands 12px off each marker it abuts. Where the stretch between two markers is
         * only a day or so, those two standoffs consume the whole span — and a width calc that
         * resolves NEGATIVE is not clamped to nothing: with `box-sizing: border-box` the used
         * width is clamped UP to the borders, so the piece paints a 2px sliver. Measured
         * box-to-box, that sliver overlapped its own marker by exactly 2px on four rows, which is
         * the whole of the residual clearance fault after the drawn markers became breaks.
         *
         * A sliver says nothing that its run's neighbouring pieces do not, and it cannot be drawn
         * without overlapping the marker it abuts — so it is hidden rather than shrunk. The same
         * judgement as a label going bare: where there is no room, the honest thing is absence.
         */
        /* ⚠️ RESET BEFORE MEASURING, or the hide LATCHES: a `display: none` element reports
           `clientWidth` 0 for ever, so a piece hidden once at six months would stay hidden when
           the reader came back to one month. The same shape as the label's own reset above.
           ⚠️ AND IT IS `display`, NOT `visibility` — a hidden element still HAS a box, so the
           sliver would go on overlapping its marker where it counts, in the geometry. */
        seg.style.display = "";
        if (seg.clientWidth <= 0) { seg.style.display = "none"; continue; }
        const line = seg.querySelector<HTMLElement>(".tl-line");
        const track = seg.querySelector<HTMLElement>(".tl-track");
        const pillEl = seg.querySelector<HTMLElement>(".tl-pill");

        /**
         * ⚠️ THE LADDER IS MEASURED AGAINST THE ROOM AFTER THE MARKS, NOT AGAINST THE CARD.
         *
         * v40's cards are wide — a relationship spans months, not the stretch between two status
         * changes — so card width stopped predicting whether the words fit. What decides it is the
         * room LEFT: a 400px card whose last mark sits at 380 has twenty pixels for its sentence.
         * Measured on the first one-card render, before this existed: one card drew nothing at all
         * and its neighbour's text ran off its own right edge, both of them comfortably over 300px
         * wide. Reading `clientWidth` would have called both of them roomy.
         *
         * Four rungs, and each is the previous one less the part that can be spared: full (pill ·
         * headline · detail) → headline (the detail goes) → pill (the words go, and whose move it
         * is survives, because that is the one thing a card is for) → stub.
         */
        const pillW = pillEl ? pillEl.getBoundingClientRect().width : 0;
        const left = pillEl && line
          ? pillEl.getBoundingClientRect().left - seg.getBoundingClientRect().left
          : 0;
        const room = seg.clientWidth - left;

        /* ⚠️ THE STUB IS A CARD WIDTH, NOT A ROOM — the ref pins 60px and means the CARD. A card
           that narrow has nowhere to put a pill however its marks fall, and it is drawn as a disc
           rather than as a squeezed version of something else. */
        if (seg.clientWidth < STUB_MAX_W) {
          seg.dataset.tier = "stub"; delete seg.dataset.over; continue;
        }
        if (!line || !track) continue;
        /* ⚠️ MEASURE THE RUNGS IN ORDER, TOP DOWN, RESETTING FIRST — a tier left on from the last
           pass changes what the next measurement sees, which is the latch this file already
           records for `display`. The detail's own width comes from the track less the headline,
           so a hidden detail cannot report zero and win the comparison. */
        const hl = track.querySelector<HTMLElement>(".tl-hl");

        /**
         * ⚠️ AND THE BOTTOM RUNG PUTS THE PILL BACK IN FRONT OF THE MARKS.
         *
         * "The text starts after the last mark" is a rule about TEXT, and at this rung there is
         * none: the words have already gone. What is left is the pill, which is the one thing a
         * card is for — it says whose move it is — and where the room after the marks cannot hold
         * even that, the honest place for it is the card's own left edge, ahead of every mark,
         * where nothing is obscured in either direction. Measured before this: five pills painted
         * OUTSIDE their own cards, clipped to nothing, on cards 314–403px wide. A card that wide
         * cannot become a disc — its width is its span, which is data — so the stub is not the
         * answer here; the stub is for a card too narrow to hold anything at all.
         */
        seg.dataset.tier = tierFor({
          card: seg.clientWidth, room,
          full: pillW + PILL_GAP + track.scrollWidth,
          headline: pillW + PILL_GAP + (hl ? hl.getBoundingClientRect().width : 0),
        });

        /**
         * ⚠️ AT THE BOTTOM RUNG THE PILL'S SIDE IS MEASURED, NOT ASSUMED.
         *
         * Putting it back at the card's left edge is right whenever the first mark is far enough
         * in to leave room, and wrong when a status change happened days after the send — measured,
         * one card put a 64px pill at 590 with a mark painted across 592–614. Both sides are
         * legitimate places for it; which one has room is a fact about this card, so it is asked
         * rather than decided. Where neither side can hold it the pill is not drawn at all: the
         * card keeps its span, its tone and its tooltip, and a pill clipped to nothing says less
         * than no pill does.
         */
        seg.style.removeProperty("--pill-left");
        seg.removeAttribute("data-noroom");
        if (seg.dataset.tier === "pill" && pillEl) {
          const cardL = seg.getBoundingClientRect().left;
          const marksOn = markLefts(seg);
          const firstMark = marksOn.length ? Math.min(...marksOn) - cardL : Infinity;
          const before = firstMark - PILL_INSET;
          if (pillW <= before + 1) seg.style.setProperty("--pill-left", `${PILL_INSET}px`);
          else if (pillW <= room + 1) seg.style.setProperty("--pill-left", `${left}px`);
          else seg.setAttribute("data-noroom", "1");
        }
        /**
         * ⚠️ MEASURED, THEN MARKED — the words are never removed.
         *
         * `barFit` used to drop the detail, then the whole line, wherever the text would not fit.
         * A card with no words says nothing, and the reader had no way to find out what it would
         * have said. The words stay; the ones past the edge arrive on hover.
         *
         * ⚠️ `scrollWidth` ON THE TRACK, `clientWidth` ON THE LINE. The track is what overflows and
         * the line is the window onto it — measuring one element against itself reports zero
         * forever. The track is `inline-flex` for the same reason the old lines were
         * `inline-block`: scrollWidth on an inline box is meaningless.
         */
        /**
         * ⚠️ THE MARQUEE IS THE FULL RUNG'S ALONE (v40). Below it the card is not overflowing —
         * it has DROPPED something, and sliding what remains would move a complete phrase for no
         * reason while the part the reader is missing stays missing. The tooltip states it.
         *
         * ⚠️ AND THE GUARD IS NOT REDUNDANT WITH THE STYLESHEET, THOUGH IT LOOKS IT. At the `pill`
         * rung `.tl-line` is `display: none`, so BOTH `scrollWidth` and `clientWidth` report zero
         * and no overflow is ever detected — which means deleting this line changes nothing today
         * and the obvious red proof is INERT. It was: the mutation ran, the lock stayed green, and
         * only reddening the stylesheet's hide as well showed the guard doing its job. The two
         * hold the rule for different reasons, and the day the hide becomes a `visibility` or a
         * clip — both of which keep a box — this is the only thing left.
         */
        const over = seg.dataset.tier === "full" ? track.scrollWidth - line.clientWidth : 0;
        if (over > 1) {
          line.classList.remove("fits");
          line.dataset.over = String(Math.round(over));
        } else {
          /* a line that fits carries no mask and no animation — both are stated by this class */
          line.classList.add("fits");
          delete line.dataset.over;
        }
      }
    };
    fit();

    /**
     * ⚠️ THE MARQUEE RUNS ON HOVER AND NOWHERE ELSE — never at rest, never on a timer.
     *
     * Text that moves on its own is text competing with the reader; a board of thirteen cards all
     * sliding is unreadable. It starts when the pointer arrives and is CANCELLED when it leaves,
     * and the cancel resets the transform explicitly: a cancelled animation leaves the element
     * wherever its last commit put it, so a card the reader has left would keep its text scrolled
     * off the edge.
     *
     * ⚠️ THE FRAMES COME FROM `cycleFor`, BUILT IN JS BECAUSE THE DISTANCE IS MEASURED. A `var()`
     * inside `@keyframes` fails silently in this setup — no error, no animation, nothing to point
     * at — so the distance never enters CSS at all.
     *
     * ⚠️ REDUCED MOTION KEEPS THE MASK AND DROPS THE MOVEMENT. The mask says there is more to
     * read; the movement is what a reader who has asked for stillness does not want. Read at the
     * moment of hover rather than once at mount, so a change of preference takes effect without a
     * reload.
     */
    const running = new WeakMap<HTMLElement, Animation>();
    const stop = (line: HTMLElement) => {
      const a = running.get(line);
      if (a) { a.cancel(); running.delete(line); }
      const track = line.querySelector<HTMLElement>(".tl-track");
      if (track) { track.style.transform = ""; track.style.opacity = ""; }
    };
    const start = (line: HTMLElement) => {
      if (line.classList.contains("fits") || running.has(line)) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const track = line.querySelector<HTMLElement>(".tl-track");
      const over = Number(line.dataset.over ?? "0");
      if (!track || !(over > 1) || typeof track.animate !== "function") return;
      const cycle = cycleFor(over);
      const a = track.animate(
        cycle.frames.map((f) => ({ offset: f.offset, transform: f.transform, opacity: f.opacity })),
        { duration: cycle.durationMs, iterations: Infinity, easing: "linear" },
      );
      running.set(line, a);
    };
    const onOver = (e: Event) => {
      const line = (e.target as HTMLElement | null)?.closest?.(".tl-line") as HTMLElement | null;
      if (line) start(line);
    };
    const onOut = (e: Event) => {
      const line = (e.target as HTMLElement | null)?.closest?.(".tl-line") as HTMLElement | null;
      if (line) stop(line);
    };
    const host = pageRef.current;
    host?.addEventListener("mouseover", onOver);
    host?.addEventListener("mouseout", onOut);

    /* ⚠️ A `ResizeObserver` ON THE BOARD, not on every bar. Bars are re-created on every range
       change and observing each would leak one per render; the board is one element whose width
       is the only thing that changes what fits. */
    /* ⚠️ ONE CLEANUP, AND IT RUNS EVEN WITHOUT A BOARD. The early return used to sit between the
       listeners and the teardown, so a render with no board left both attached — and this effect
       has no dependency array, so it re-runs every render and would have stacked one pair per
       render for as long as the board was absent. The observer is what is conditional; the
       listeners are not. */
    const board = pageRef.current?.querySelector(".tl-board");
    const ro = new ResizeObserver(fit);
    if (board) ro.observe(board);
    return () => {
      ro.disconnect();
      host?.removeEventListener("mouseover", onOver);
      host?.removeEventListener("mouseout", onOut);
    };
  });

  const pastDays = useMemo(() => pastDaysOf(range), [range]);
  const winFrom = useMemo(
    () => (pastDays > 0 ? shiftWindow(winStart, pastDays, -1) : winStart),
    [winStart, pastDays],
  );
  const visible = useMemo(() => windowDays(winFrom, range.days), [winFrom, range.days]);
  /**
   * ⚠️ THE COLUMNS ARE WHAT IS DRAWN; `visible` IS WHAT IS TRUE. Every derivation below reads the
   * DAYS — a bar's span, a marker's date, the record — and nothing is positioned by a column. At
   * week and month grain the columns are a coarser ruler laid over the same window, stepping 7 and
   * 30 as the ref does, so a 182-day board draws six columns and still places a marker on its own
   * day.
   */
  const columns = useMemo(() => {
    const step = range.grain === "day" ? 1 : range.grain === "week" ? 7 : 30;
    const out: { ymd: string; from: number; now: boolean }[] = [];
    for (let i = 0; i < range.days; i += step) {
      const ymd = visible[i] ?? visible[visible.length - 1];
      /**
       * ⚠️ THE COLUMN THAT CONTAINS TODAY, NOT THE ONE THAT STARTS ON IT. At day grain those are
       * the same and the difference is invisible; at week and month grain no column starts on
       * today, so `ymd === today` marked nothing at all and today fell off the board entirely at
       * two ranges out of five. The past slice is what exposed it — before it, today was always
       * column zero.
       */
      const span = visible.slice(i, i + step);
      out.push({ ymd, from: i, now: span.includes(today) });
    }
    return out;
  }, [visible, range.grain, range.days, today]);
  /**
   * ⚠️ WHERE ONE PERIOD ENDS AND THE NEXT BEGINS — the rhythm a weekend tint would have given, and
   * the reason it is not one. Shading Saturday and Sunday states that a reply window pauses at the
   * weekend; the month grid made that ruling already and dropped its own tint for it. At day grain
   * the boundary is a Monday. (Week and month grain arrive with the range control in Phase 3, and
   * this is the one function that will answer for all three.)
   */
  const startsPeriod = (ymd: string) => {
    const d = new Date(`${ymd}T12:00:00`);
    if (range.grain === "day") return d.getDay() === 1;      // a week begins
    if (range.grain === "week") return d.getDate() <= 7;     // the week that opens a month
    return true;                                             // every month column is a boundary
  };
  /* ⚠️ `rowSay` IS GONE (Phase 5). It lifted the live segment's own LABEL into the head at three
     months and above, where a bar is too small to carry words. The head has its own sentence now,
     at every range, so the relocation has nothing left to relocate — and leaving the helper would
     have left a second, quieter source of head text for someone to reach for. */
  /** the column's own label: a date at day grain, a date and month at week, a month name at month */
  const colLabel = (ymd: string, grain: "day" | "week" | "month") => {
    const d = new Date(`${ymd}T12:00:00`);
    if (grain === "day") return String(d.getDate());
    if (grain === "week") return `${d.getDate()} ${d.toLocaleDateString("en-GB", { month: "short" })}`;
    return d.toLocaleDateString("en-GB", { month: "short" });
  };
  /* ⚠️ A PAST WEEK IS A PROPERTY OF THE WINDOW, not of a row — nothing in it is provisional any
     more, so the dashes go solid, the waypoints render as passed, and the pulse stops. */
  const pastWeek = visible[visible.length - 1] < today;

  /* ⚠️ THE PAGER MOVES BY WHOLE WINDOWS, and the arrow keys move it too. They were moving a day
     SELECTION when a day was the unit; the unit is now the week, so the same keys move the week.
     Inert while typing, like every other Tasks shortcut — a bare `T` reaching the page from inside
     the search field would jump the window mid-word. */
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (el?.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); setWinStart((s) => shiftWindow(s, range.days, -1)); }
      else if (e.key === "ArrowRight") { e.preventDefault(); setWinStart((s) => shiftWindow(s, range.days, 1)); }
      else if (e.key === "t" || e.key === "T") { e.preventDefault(); setWinStart(today); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [today]);

  /* ⚠️ THE CALENDAR SHOWS NO DISMISSED CARDS, DELIBERATELY. A dismissed task has no action date —
     that is what dismissing it removed — so it has no day to sit on. */
  const byDay = useMemo(
    () => calendarDays({
      cols: {
        todo: assembled.cols.todo, today: assembled.cols.today, snoozed: assembled.cols.snoozed,
        dismissed: [], done: assembled.cols.done,
      },
      flags: taskFlags, queries, agents, userTasks, activities, today, nowMs: now,
    }, visible),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [assembled, taskFlags, queries, agents, userTasks, activities, today, visible],
  );

  /* the record — a second derivation over the same visible days, one pass over an array already
     in memory: no new query, no new hook, no stored field */
  const recByDay = useMemo(
    () => recordDays(activities, queries, agents, visible),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activities, queries, agents, visible],
  );

  /* ⚠️ ONE READING OF A DAY, so the rows, the bands and the count cannot disagree about what is on
     it. The dedupe takes the day's record as an ARGUMENT rather than a flag, which is what makes
     "one fact, one chip" hold structurally: a completed card and a record entry that are two
     readings of ONE activity collapse before anything downstream sees them. */
  const recordFor = React.useCallback(
    (ymd: string): RecordItem[] => recByDay.get(ymd) ?? [], [recByDay],
  );
  const itemsFor = React.useCallback(
    (ymd: string): CalendarItem[] => dedupeAgainstRecord(byDay.get(ymd)?.items ?? [], recByDay.get(ymd) ?? []),
    [byDay, recByDay],
  );
  /* ghosts derive from TODAY's items, never the day's own — carried work renders on today, so that
     is the only list its origin can be read from */
  const ghostsOn = React.useCallback(
    (ymd: string): GhostItem[] => (ymd === today ? [] : ghostsFor(ymd, itemsFor(today))),
    [itemsFor, today],
  );

  const { rows, segments, nodes } = useMemo(
    () => timelineWeek(
      { queries, agents, activities, manuscripts, taskFlags, today, itemsFor, recordFor, ghostsOn },
      winFrom, range.days, view,
    ),
    [queries, agents, activities, manuscripts, taskFlags, today, itemsFor, recordFor, ghostsOn, winFrom, view],
  );
  /** the bar's three parts, grouped by the row they belong to — one pass, read three times */
  const barsByRow = useMemo(() => {
    const m = new Map<string, { segs: Segment[]; nodes: BarNode[] }>();
    const get = (k: string) => {
      let v = m.get(k);
      if (!v) { v = { segs: [], nodes: [] }; m.set(k, v); }
      return v;
    };
    for (const sg of segments) get(sg.rowKey).segs.push(sg);
    for (const n of nodes) get(n.rowKey).nodes.push(n);
    return m;
  }, [segments, nodes]);

  /* ⚠️ THE COUNT STATES WHAT IS ON SCREEN, never a total the filters have stopped describing. */
  const shown = rows.reduce((n, r) => n + r.items.length, 0) + segments.length;
  /* ⚠️ RELATIONSHIPS ONLY. This counted everything that was not the pinned row, which since tasks
     became rows meant it counted those too — a noun describing something other than its own set. */
  const agentRows = rows.filter((r) => r.key !== YOU_ROW && r.group !== null).length;

  /* ══ WHAT IS SELECTED, AND WHAT IS BEING WORKED ══════════════════════════════════════════ */
  const allItems = useMemo(() => rows.flatMap((r) => r.items.map((it) => ({ it, row: r }))), [rows]);
  const selItem = allItems.find((x) => x.it.key === sel) ?? null;
  const selSeg = segments.find((sg) => sg.key === sel) ?? null;
  const selNode = nodes.find((n) => n.key === sel) ?? null;
  /* a selection the filters have taken off the board is no longer a selection */
  React.useEffect(() => {
    if (sel && !selItem && !selSeg) setSel(null);
  }, [sel, selItem, selSeg]);

  const workRow = work ? rows.find((r) => r.key === work.rowKey) ?? null : null;
  /* the workspace lost its row — a filter, a page, or the card completing and evaporating */
  React.useEffect(() => {
    if (work && !workRow) { setWork(null); setPaneCard(null); }
  }, [work, workRow]);

  /**
   * ⚠️ THE QUERY THE WORKSPACE IS ABOUT — the worked item's, falling back to whatever else in the
   * row names one. A row is a RELATIONSHIP and can hold several queries; the item decides, and the
   * fallback is only for a row head opened with nothing selected.
   */
  const workQueryId = useMemo(() => {
    if (!workRow) return undefined;
    const picked = work?.itemKey ? workRow.items.find((i) => i.key === work.itemKey) : undefined;
    return picked?.queryId
      ?? barsByRow.get(workRow.key)?.segs[0]?.queryId
      ?? workRow.items.find((i) => i.queryId)?.queryId;
  }, [workRow, work, barsByRow]);
  const workQuery = workQueryId ? queries.find((q) => q.id === workQueryId) ?? null : null;
  const workAgent = workRow?.agentId ? agents.find((a) => a.id === workRow.agentId) ?? null : null;
  const workSeg = workRow ? (barsByRow.get(workRow.key)?.segs ?? []).find((sg) => sg.side === "theirs") ?? null : null;

  /**
   * ⚠️ THE AUTHORITATIVE ROWS, from the query's own subcollection — the store the Query Centre
   * reads. The global `activities` feed this page holds is a best-effort projection twin, and
   * reading the conversation out of it is how the dock came to say "Nothing logged yet." about a
   * query with history.
   *
   * ⚠️ AND IT IS A SECOND LISTENER ON THE SAME SUBCOLLECTION while a card is docked, because
   * `useTaskPaneSession` opens its own and exposes only `{ journey, onPrimary }`. Wasteful, not
   * wrong — one query, one document each — and the fix is to surface `dockRows` from the session,
   * which is a file this session does not own. Flagged in the report.
   */
  const convo = useDockActivity(currentUser?.id, workQueryId);
  const convoRows = useMemo(
    () => (workQuery ? buildTimelineRows(convo, workQuery, workAgent) : []),
    [convo, workQuery, workAgent],
  );

  /* ══ THE TASK PANE, OVER THE TIMELINE ═══════════════════════════════════════════════════ */
  /* `offer` and `fix` still reach `FocusFlow` — but the way `/todo` reaches it, through the pane's
     own primary, past `paneCommits`. It is never a second entrance. */
  const [flowCard, setFlowCard] = useState<BoardCard | null>(null);
  const [paneCard, setPaneCard] = useState<BoardCard | null>(null);
  const { commit, quickDone } = useTaskCommit({
    flash, rememberUndo: remember, confirmAsk,
    openFlow: (c) => setFlowCard(c),
  });
  const paneRef = React.useRef<HTMLDivElement | null>(null);
  const paneHost: TaskPaneHost = {
    /**
     * ⚠️ SCOPED TO THIS MOUNT'S OWN PANE, which is why Pack B built `idPrefix`. Every workspace
     * page stays MOUNTED, so `/todo`'s pane is in the document too — a bare `document.querySelector`
     * would find ITS section and scroll a page the reader cannot see.
     */
    /* ⚠️ FOCUS, NOT SCROLL — the same change `/todo` made in the workspace round, for the same
       reason: the session has already opened the row, and focusing brings it into its scrollport
       without a second mechanism deciding where to put it. Scoped to `paneRef` because every
       workspace page stays mounted and `/todo`'s pane is in the document too. */
    jumpToSection: (id) => {
      const root = paneRef.current;
      const sect = root?.querySelector<HTMLElement>(`#${CAL_PANE_PREFIX}${id}`);
      if (!sect) return;
      (sect.querySelector<HTMLElement>("button, input, textarea, [tabindex]") ?? sect).focus?.();
    },
    /* the `offer`/`fix` hand-off — parity with `/todo`, which is why the sheet stays mounted */
    openFlow: (c) => { setPaneCard(null); setFlowCard(c); },
    commit,
    /* ⚠️ NO DOCK CURSOR HERE. `/todo` advances to the next card in its dock; a week is not a queue,
       so a completed card leaves the board and the workspace closes with it — which is the
       catalogue's "settle" step: the card evaporates from every surface at once, because the
       condition that derived it stopped holding. */
    advance: () => { setPaneCard(null); setWork(null); },
    openQuery: (c) => { if (c.relatedRecordId) onNavigate("queries", c.relatedRecordId); },
    /* ⚠️ THE CALENDAR SUPPLIES NEITHER `snooze` NOR `mute`, AND ABSENCE IS NOT DISABLED. Its snooze
       is DRAG — on the surface where days are the subject — and it shows no dismissed cards at all,
       which is the same reason it passes no `onSnooze` and no `onDismiss`. A delay intent there
       therefore writes nothing rather than writing through a surface that has no place for it; the
       fork's delay options are the journey's, and whether this host can honour them is the host's
       business. Flagged in the run report as the one journey the calendar cannot complete. */
    /* the deed's two links — the same one-shot reveal keys `/todo` and the ⋯ menu use */
    openAgent: (agentId) => {
      try { sessionStorage.setItem("sa.agentReveal", agentId); } catch { /* private mode */ }
      onNavigate("agents");
    },
    openManuscript: (manuscriptId) => {
      try { sessionStorage.setItem("sa.manuscriptReveal", manuscriptId); } catch { /* private mode */ }
      onNavigate("manuscripts");
    },
    /* onSnooze / onDismiss are deliberately ABSENT — see `TaskPaneHost`. The calendar's snooze is
       drag, and it shows no dismissed cards at all. */
  };
  const paneSession = useTaskPaneSession(paneCard, paneHost, CAL_PANE_PREFIX);

  /**
   * ⚠️ ESCAPE RETURNS TO THE WEEK, and only while the workspace is open. It is captured so it does
   * not also reach the page beneath — a menu and the workspace would otherwise close on one press.
   * `FocusFlow` keeps its own handler; the two are mutually exclusive, since the pane closes itself
   * before handing a card over.
   *
   * ⚠️ IT ALWAYS DID CLOSE THE PANE, so nothing about typed answers changed here. What the retired
   * scrim carried — "a stray click on the ground is not a decision to discard them" — is vacuous
   * now rather than lost: there is no ground to click.
   */
  React.useEffect(() => {
    if (!work) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      setWork(null);
      setPaneCard(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [work]);


  /* ══ DRAG A TASK TO A NEW DAY ════════════════════════════════════════════════════════════
     ⚠️ THE DROP WRITES THROUGH `updateUserTask` — the existing writer — and writes `dueDate`
     ALONE. Dates are input, not derived state: the writer moves the date and nothing auto-fires.
     ⚠️ THE ORIGIN DAY IS NOT A VALID TARGET, which makes dropping there a no-op by construction:
     `dragover` only calls `preventDefault` on a DIFFERENT day, so the browser never permits the
     drop and no write can fire. A no-op enforced at the gesture beats one checked at the write.
     ⚠️ FAILURE IS VISIBLE — the write's catch flashes this page's own toast, in `todoWrite`'s
     copy, never a literal authored here and never a raw Firebase message. */
  const [dragTask, setDragTask] = useState<{ id: string; from: string } | null>(null);
  const [dropYmd, setDropYmd] = useState<string | null>(null);
  const endDrag = () => { setDragTask(null); setDropYmd(null); };
  const dropOn = (ymd: string) => {
    if (!dragTask || ymd === dragTask.from) { endDrag(); return; }
    updateUserTask(dragTask.id, { dueDate: ymd }).catch((e) => {
      flash(saveErrorCopy(classifyWriteError(e)));
    });
    endDrag();
  };

  /**
   * ⚠️ TWO GESTURES, TWO OUTCOMES. A chip that carries a CARD is work, so it opens the workspace;
   * anything else — a record entry, a ghost, a band — is a fact, so it selects and fills the band
   * below. The brief names a your-turn chip; a writer's own task carries a card too, and refusing
   * it would be a regression against the month, where every carded pip opened the pane.
   */
  const openWork = (rowKey: string, ymd: string, itemKey: string | null, card?: BoardCard) => {
    setSel(itemKey);
    setWork({ rowKey, ymd, itemKey });
    setPaneCard(card ?? null);
  };
  /**
   * ⚠️ A YOUR-MOVE STRETCH IS WORK, SO IT OPENS THE WORKSPACE — the same gesture a your-turn chip
   * had before the chip became part of the bar. The card is found by the query the stretch belongs
   * to, which is the join the page already makes for everything else.
   */
  const cardForQuery = (queryId: string): BoardCard | undefined =>
    visible.flatMap((ymd) => itemsFor(ymd)).find((it) => it.card?.relatedRecordId === queryId)?.card;
  const pickSeg = (rowKey: string, sg: Segment) => {
    const card = sg.side === "yours" ? cardForQuery(sg.queryId) : undefined;
    if (card) { openWork(rowKey, visible[Math.floor(sg.from)] ?? today, sg.key, card); return; }
    setSel((c) => (c === sg.key ? null : sg.key));
  };
  const pick = (rowKey: string, it: TimelineItem) => {
    if (it.card) { openWork(rowKey, it.ymd, it.key, it.card); return; }
    setSel((c) => (c === it.key ? null : it.key));
  };

  /**
   * ⚠️ THE MASTHEAD STATES NO SUBTITLE, AND THAT IS WHERE ITS HEIGHT WENT. It read
   * "26 Aug – 1 Sept — every relationship, and the time between." Both halves are already on
   * screen: the day header names all seven dates in the writer's own week, and the pager beside
   * the title offers `‹ Today ›`. A masthead line restating the row beneath it is a line spent
   * saying nothing, and on a page whose whole difficulty is vertical room it is the cheapest thing
   * to give back.
   */

  const setView1 = <K extends keyof TimelineView>(k: K, v: TimelineView[K]) =>
    setView((cur) => ({ ...cur, [k]: v }));

  /**
   * ⚠️ CUT BY MANUSCRIPT IS GATED ON THERE BEING MORE THAN ONE, and the gate reads the
   * MANUSCRIPTS THE BOARD ACTUALLY DRAWS rather than the writer's shelf. A writer with three
   * books, two of them shelved with no live queries, has one manuscript on this board — offering
   * to cut it by book would offer two cuts that produce the same page and one that produces an
   * empty one.
   */
  const boardManuscripts = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of rows) for (const m of r.manuscripts) if (m.id) seen.set(m.id, m.title);
    return [...seen].map(([id, title]) => ({ id, title }));
  }, [rows]);
  const cutByAvailable = boardManuscripts.length > 1;
  const [cutBy, setCutBy] = useState<"needs" | "ms">("needs");
  /* ⚠️ A CUT THE BOARD CAN NO LONGER OFFER MUST NOT SURVIVE AS STATE. Deleting the last book that
     made the control available while it is selected would otherwise leave the board grouped by a
     control that is no longer on screen — a filter nothing can reach and nothing can clear. */
  const cutNow: "needs" | "ms" = cutByAvailable ? cutBy : "needs";

  /* ══ THE CROSSHAIR, THE ONE TOOLTIP, AND `RIGHT NOW` ═══════════════════════════════════ */

  /**
   * ⚠️ `RIGHT NOW` IS A VIEW STATE AND NOTHING ELSE — no route, no persistence, no second
   * derivation. It survives nothing, deliberately: a reader who has filtered the board down to
   * what is being asked of them should find the whole board again when they come back to it,
   * because the full board is what the page is for.
   */
  const [onlyAsks, setOnlyAsks] = useState(false);
  /**
   * ⚠️ ONE LIST IS THE DEFAULT AND GROUPED IS THE MODE, which is the way round v37 turns it.
   *
   * The six groups answer "what kind of thing is this" — a question a reader asks once and then
   * stops asking. What they want next is what is nearest, and headings put six walls between them
   * and that. So the flat list orders every row, relationships and tasks together, by the one key
   * both now carry.
   *
   * ⚠️ SESSION-HELD, NOT PERSISTED. A reader who went looking at the groups once should not meet
   * them again next week having forgotten they asked; the page opens on the list every time.
   */
  const [grouped, setGrouped] = useState(false);

  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const tipRef = React.useRef<HTMLDivElement | null>(null);
  const [cross, setCross] = useState<{ x: number; label: string } | null>(null);

  /**
   * The crosshair — pure geometry, and it reads the DAY rather than remembering one.
   *
   * ⚠️ IT IS COMPUTED FROM THE POINTER'S FRACTION OF THE LANE, never from a column the reader is
   * over: there are no columns any more. The lane is the ruler, `--tl-days` is its scale, and the
   * date falls out of the arithmetic — so it cannot drift out of step with where the bars are
   * drawn, which are placed by the identical expression.
   */
  const onLaneMove = (e: React.MouseEvent) => {
    const wrap = wrapRef.current;
    const lane = (e.target as HTMLElement | null)?.closest?.(".tl-c-tl") as HTMLElement | null;
    if (!wrap || !lane || !lane.closest(".tl-rrow")) { setCross(null); return; }
    const wr = wrap.getBoundingClientRect();
    const lr = lane.getBoundingClientRect();
    const f = (e.clientX - lr.left) / lr.width;
    if (f < 0 || f > 1) { setCross(null); return; }
    const idx = Math.min(visible.length - 1, Math.max(0, Math.round(f * range.days)));
    const ymd = visible[idx];
    if (!ymd) { setCross(null); return; }
    setCross({ x: (lr.left - wr.left) + f * lr.width, label: shortCalDate(ymd) });
  };
  const clearCross = () => setCross(null);

  /**
   * ONE tooltip, portalled to the board wrap.
   *
   * ⚠️ `.tl-c-tl` CLIPS (`overflow: hidden`), SO NO DESCENDANT TOOLTIP CAN ESCAPE IT — a clipping
   * ancestor beats any `z-index` a child can declare. That is why this is a single element at
   * board level rather than one per bar, and why it is positioned against the wrap and clamped
   * inside it: a tip on the last row or at the right-hand edge would otherwise be cut in half by
   * the very box it belongs to.
   *
   * ⚠️ AND IT NEVER INTERCEPTS CLICKS. `pointer-events: none` in the sheet, so a marker under it
   * stays clickable — a tooltip that swallowed the click on the thing it describes would be a
   * control that looks live and is not.
   */
  React.useEffect(() => {
    const wrap = wrapRef.current;
    const tip = tipRef.current;
    if (!wrap || !tip) return;
    const show = (ev: MouseEvent) => {
      const t = (ev.target as HTMLElement | null)?.closest?.("[data-tip]") as HTMLElement | null;
      if (!t) { tip.classList.remove("on"); return; }
      const text = t.getAttribute("data-tip") ?? "";
      if (!text) { tip.classList.remove("on"); return; }
      tip.textContent = text;
      tip.classList.add("on");
      const wr = wrap.getBoundingClientRect();
      const tr = t.getBoundingClientRect();
      tip.style.top = `${(tr.top - wr.top) - tip.offsetHeight - 7}px`;
      const half = tip.offsetWidth / 2;
      const want = (tr.left - wr.left) + Math.min(tr.width / 2, 90);
      const x = Math.max(half + 2, Math.min(wr.width - half - 2, want));
      tip.style.left = `${x - half}px`;
    };
    const hide = (ev: MouseEvent) => {
      const to = ev.relatedTarget as HTMLElement | null;
      if (!to || !to.closest?.("[data-tip]")) tip.classList.remove("on");
    };
    wrap.addEventListener("mouseover", show);
    wrap.addEventListener("mouseout", hide);
    return () => {
      wrap.removeEventListener("mouseover", show);
      wrap.removeEventListener("mouseout", hide);
    };
  }, []);

  /* ⚠️ THESE TWO ARE DECLARED ABOVE THE BOARD DERIVATION, AND THE ORDER IS LOAD-BEARING.
     `board` is a `useMemo` that RUNS DURING RENDER and called `asksOfYou` → `actionFor`; a `const`
     arrow declared below it is in its temporal dead zone at that moment, so the page threw
     "Cannot access 'actionFor' before initialization" and fell into its error boundary — with a
     clean `tsc`, because TypeScript cannot see through a helper the render happens to call. The
     render smoke is what caught it, which is the reason that smoke exists. */
  /* ══ WHAT A ROW ASKS OF YOU, AND WHAT IT SCRAWLS ═══════════════════════════════════════ */

  /**
   * The one deed this row offers, or `null`.
   *
   * ⚠️ THE DEED HAS ONE SOURCE. `rowNote` derives it from the query's status (and, for a reminder
   * fallen due, from a date) and the button uppercases it — one rendering of one fact. It used to
   * have two, the button and a handwritten copy beside the bar; v37 deleted the second, and the
   * rule it was there to keep is now trivially true rather than maintained.
   *
   * ⚠️ AND A DEED WITHOUT A CARD IS NOT AN ACTION. The button's only job is to open the task pane,
   * so a row whose work has no `BoardCard` behind it has no door to offer — it shows the em-dash.
   * A button that opened nothing would be the dead-control fault this repo already records
   * against an Undo that restored nothing.
   */
  /**
   * ⚠️ THE CARD IS FOUND BY QUERY, ACROSS THE WHOLE BOARD — never by looking for a chip inside the
   * visible window. That was the first shape and it left the action column EMPTY ON EVERY ROW: a
   * card sits on the day it landed on the desk, which for a full requested three weeks ago is
   * outside a one-month window that opens eight days back. The row was asking for something and
   * the button beside it was an em-dash — measured, 14 dashes and 0 buttons.
   *
   * ⚠️ AND IT READS `assembled`, WHICH IS `assembleBoardColumns` — the same derivation the To-do
   * board and the badge count through. A second scan for "the card for this query" is how two
   * surfaces come to disagree about whether there is one.
   */
  const cardsByQuery = useMemo(() => {
    const m = new Map<string, BoardCard>();
    const cols = assembled.cols;
    for (const c of [...cols.todo, ...cols.today, ...cols.snoozed, ...cols.done]) {
      const id = c.relatedRecordId;
      if (id && !m.has(id)) m.set(id, c);
    }
    return m;
  }, [assembled]);



  /* ══ THE BOARD'S OWN DERIVATIONS ═══════════════════════════════════════════════════════ */

  /**
   * The date labels along the one column header.
   *
   * ⚠️ ROUGHLY NINE ACROSS THE WINDOW, AT EVERY RANGE — the ref's own `nDays / 9`. It is not a
   * day grain, a week grain or a month grain: those were properties of a grid that had to put a
   * cell somewhere, and there is no grid. Nine labels is what a reader can scan without counting.
   */
  const dateLabels = useMemo(() => {
    const step = Math.max(1, Math.round(range.days / 9));
    const out: { ymd: string; at: number; text: string }[] = [];
    for (let d = step; d < range.days; d += step) {
      const ymd = visible[d];
      if (ymd) out.push({ ymd, at: d, text: shortCalDate(ymd) });
    }
    return out;
  }, [range.days, visible]);

  /**
   * The months the window spans, for the rail's shelf.
   *
   * ⚠️ THE CURRENT MONTH'S LABEL IS PLACED IN ITS POST-TODAY HALF so it can never be split by the
   * today stem — the one position on the shelf where a label and a rule compete for the same
   * pixels. Every other month centres in its own span.
   */
  const months = useMemo(() => {
    const out: { key: string; label: string; at: number; labelAt: number; current: boolean; past: boolean }[] = [];
    const SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
    let i = 0;
    while (i < visible.length) {
      const d = new Date(`${visible[i]}T12:00:00`);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      let j = i;
      while (j + 1 < visible.length) {
        const n = new Date(`${visible[j + 1]}T12:00:00`);
        if (`${n.getFullYear()}-${n.getMonth()}` !== key) break;
        j += 1;
      }
      const nowM = new Date(`${today}T12:00:00`);
      const current = `${nowM.getFullYear()}-${nowM.getMonth()}` === key;
      const tAt = visible.indexOf(today);
      /* the current month labels in the half AFTER today; every other centres in its own span */
      const labelAt = current && tAt >= i && tAt <= j ? (tAt + j + 1) / 2 : (i + j + 1) / 2;
      out.push({
        key, label: SHORT[d.getMonth()], at: i, labelAt, current,
        past: !current && visible[j] < today,
      });
      i = j + 1;
    }
    return out;
  }, [visible, today]);

  /** where today sits in the window, or `null` when the window does not contain it */
  const todayAt = useMemo(() => {
    const i = visible.indexOf(today);
    return i < 0 ? null : i + 0.5;
  }, [visible, today]);
  /**
   * ⚠️ THE TODAY LINE IS POSITIONED IN PIXELS FROM A LANE'S OWN RECT, NEVER AS A PERCENTAGE.
   *
   * It was `pct(todayAt)` — a fraction of the WRAP — while every bar, chip and marker is a
   * fraction of the LANE, and the lane begins 460px in behind the name and action columns.
   * Measured at 1440: the line sat at x=557 while today, per the past wash, was at x=903. It has
   * been pointing 346px away from today, inside the name column, since the board was rebuilt —
   * and the acceptance could not see it, because it only asked whether the FLAG was centred on the
   * LINE. Both were wrong together, so the lock passed.
   *
   * The wrap is the only ancestor that spans every row and clips nothing, so the line must live
   * there; a percentage of the wrap is therefore meaningless and the position has to be measured.
   */
  const [todayX, setTodayX] = useState<number | null>(null);
  React.useLayoutEffect(() => {
    const place = () => {
      const root = pageRef.current;
      if (!root || todayAt == null) { setTodayX(null); return; }
      const wrap = wrapRef.current;
      const lane = Array.from(root.querySelectorAll<HTMLElement>(".tl-rrow .tl-c-tl"))
        .find((e) => e.getBoundingClientRect().width > 0);
      if (!wrap || !lane) { setTodayX(null); return; }
      const wr = wrap.getBoundingClientRect();
      const lr = lane.getBoundingClientRect();
      setTodayX((lr.left - wr.left) + lr.width * (todayAt / range.days));
    };
    place();
    /* ⚠️ AND IT IS RE-PLACED ON RESIZE, because the lane's width is what it is measured from. A
       value taken once is correct until the first time anything moves. */
    const ro = new ResizeObserver(place);
    const board = pageRef.current?.querySelector(".tl-board");
    if (board) ro.observe(board);
    return () => ro.disconnect();
  });
  const todayLeft = todayX == null ? undefined : `${todayX}px`;

  /**
   * ⚠️ `RIGHT NOW` IS A FILTER OF THE ONE DERIVATION, NEVER A SECOND ONE. It shows every row that
   * asks something of you and nothing else — the same rows, the same bars, the same deeds, in the
   * same groups. Deriving the short board separately is how two surfaces come to disagree about
   * what is being asked; the round-trip identity check in `calLook.measure.ts` asserts that
   * toggling out and back returns the identical set, by row key.
   */
  /* ⚠️ THE ROW ASKS BECAUSE ITS GROUP SAYS SO — never because a button happened to be buildable.
     This read the action lookup, so `RIGHT NOW` showed the rows that had a CARD rather than
     the rows that were asking, and a row under "Needs you now" whose card the board had not
     raised vanished from the very view built to find it. */
  const rowAsks = (r: TimelineRow) =>
    /* ⚠️ A TASK ROW ASKS BY EXISTING, and it is keyed by its own task rather than by `YOU_ROW` —
       which the first version of this tested for, so every per-task row answered false and the
       whole `Your tasks` group came out with dashes. `group === null` is what identifies one. */
    asksOfYou(r.group, r.group === null && r.items.some((i) => i.card));

  /**
   * The board, as groups.
   *
   * ⚠️ "Your tasks" IS A HEADING, NOT A SEVENTH `RowGroup`. A task belongs to no query, so
   * `rowGroupOf` returns `null` for it and that null is DATA. Widening the classification so the
   * view could have its heading would put a view decision inside a function every other reader
   * shares.
   */
  const board = useMemo(() => {
    const live = onlyAsks ? rows.filter(rowAsks) : rows;
    const out: {
      key: string; title: string; sentence: string; count: number;
      rows: TimelineRow[]; group: RowGroup | null; collapsible: boolean; open: boolean;
    }[] = [];
    const pinned = live.filter((r) => r.group === null);
    if (pinned.length) {
      out.push({
        key: "tasks", title: TASKS_HEADING, sentence: TASKS_SENTENCE, count: pinned.length,
        rows: pinned, group: null, collapsible: false, open: true,
      });
    }
    /* ⚠️ CUT BY MANUSCRIPT REPLACES THE GROUPS, IT DOES NOT NEST INSIDE THEM. A board grouped by
       book and then by urgency is a board with fourteen headings; the cut is a different question
       ("what is happening with this book"), and answering both at once answers neither. Tasks keep
       their own heading either way — they belong to no book by construction. */
    if (cutNow === "ms") {
      for (const m of boardManuscripts) {
        const mine = live.filter((r) => r.group !== null && r.manuscripts.some((x) => x.id === m.id));
        if (!mine.length) continue;
        out.push({
          key: `ms-${m.id}`, title: m.title, sentence: "", count: mine.length,
          rows: mine, group: null, collapsible: false, open: true,
        });
      }
      return out;
    }
    for (const g of GROUP_ORDER) {
      /* ⚠️ IN `RIGHT NOW` ONLY THE THREE ASKING GROUPS CAN SURVIVE, and that falls out of the
         filter rather than being listed: a watching, snoozed or closed row asks nothing, so it
         has no action and is already gone. A hard-coded list of three would be a second statement
         of the same rule, free to drift. */
      const mine = live.filter((r) => r.group === g);
      /* ⚠️ AN EMPTY GROUP IS OMITTED ENTIRELY, HEADER AND ALL. A header reading "0" is a heading
         for nothing — it teaches the shape of a board the writer does not have. */
      if (!mine.length) continue;
      out.push({
        key: g, title: GROUP_LABEL[g], sentence: groupSentence(g, mine.length), count: mine.length,
        /* ⚠️ COLLAPSIBLE IS WHATEVER OPENS COLLAPSED, read from the one list rather than named
           again here — two lists of the same groups is one edit from disagreeing about which of
           them a reader can reopen. */
        rows: mine, group: g,
        collapsible: COLLAPSED_BY_DEFAULT.includes(g), open: !shut.includes(g),
      });
    }
    return out;
  }, [rows, shut, onlyAsks, cutNow, boardManuscripts]);

  /**
   * Every row on one list, nearest first.
   *
   * ⚠️ IT SORTS ON THE KEY THE ROWS CARRY, never on a second derivation of "nearest". `pressingAt`
   * is what SOONEST already orders by and what the row publishes for the lock to read; deriving an
   * order here would be a second answer to a settled question, free to disagree with the one the
   * page says it is using.
   *
   * ⚠️ AND A ROW WITH NO KEY SINKS RATHER THAN LEADS. `null` means nothing is pressing — a closed
   * relationship, or one with no dated work — and `null` sorted as zero would put the quietest
   * rows at the top of a list whose whole claim is that the top is what needs you.
   */
  const oneList = useMemo(
    () => board.flatMap((g) => g.rows)
      .sort((a, b) => (a.pressingAt ?? Infinity) - (b.pressingAt ?? Infinity)),
    [board],
  );


  const firstOpen = board.findIndex((g) => g.open && g.rows.length > 0);
  const asking = rows.filter(rowAsks).length;
  /* the two nouns the count uses — a task row belongs to no agent and is not a relationship */
  const taskRows = rows.filter((r) => r.group === null && r.key !== YOU_ROW).length;

  /**
   * ⚠️ THE EMPTY STATES ARE TWO DIFFERENT FACTS AND MUST NOT SHARE COPY. "Nothing is asking for
   * you" is good news about a board full of live queries; "nothing here yet" is a board with no
   * queries at all. One sentence for both would tell a writer with twelve live submissions that
   * they have none.
   */
  const sparse = onlyAsks ? (
    <div className="tl-sparse">
      <h4>Nothing is asking for you</h4>
      <p>Every query is with an agent and no reminder has fallen due. The full board shows what is
        out and how far through each wait you are.</p>
    </div>
  ) : (
    <div className="tl-sparse">
      <h4>Nothing in this window</h4>
      <p>Queries you send, replies you log and dates you set will line up here.</p>
    </div>
  );

  /**
   * A row: name · action · timeline.
   *
   * ⚠️ THREE FLEX COLUMNS, NOT A GRID OF DAYS. The grid is what forced a 1-week range to exist,
   * and it is what could silently grow the board sideways when anything was auto-placed. Here the
   * timeline column is simply a positioning context and every piece is a percentage of it — so
   * gridlines, the weekend question and the phantom-column hazard all cease to exist rather than
   * being suppressed one rule at a time.
   */
  const row = (r: TimelineRow) => {
    const bar = barsByRow.get(r.key) ?? { segs: [], nodes: [] };
    const lanes = Math.max(1, r.lanes);
    return (
      <div
        key={r.key}
        className={`tl-rrow${r.closed ? " closed" : ""}`}
        /* ⚠️ THE ROW PUBLISHES ITS OWN KEY AND ITS OWN IDENTITY, so a lock can assert the PAINTED
    order against the key the board actually sorted by, and can follow the same row across a
    mode change. Reading the order alone says the rows are in some order; reading the key
    alone says a key exists. */
data-rowkey={r.key}
/* the row's subject, per derivation — see `TimelineRow.subjects` */
        data-subj-deed={r.subjects.deed ?? undefined}
        data-subj-caption={r.subjects.caption ?? undefined}
        data-subj-sort={r.subjects.sort ?? undefined}
        /* ⚠️ THE SORT KEY, ON THE ROW. The lock asserts the PAINTED order against it — a seeded
           ordering case can pass while the live board is visibly out of order, and only comparing
           the two on one page can tell those apart. */
        data-pressing={r.pressingAt == null ? "none" : String(r.pressingAt)}
        /* ⚠️ THE PAST'S WIDTH IS A ROW TOKEN, so the wash is one declaration in the sheet rather
           than an element per row. `null` where the window does not contain today — a window
           wholly ahead has no past to set back, and one wholly behind is all past, which
           `todayAt` already expresses as 0 or the full span. */
        style={{
          ["--lanes" as string]: String(lanes),
          ["--tl-past-w" as string]: todayAt == null ? "0%" : pct(todayAt),
        } as React.CSSProperties}
      >
        {/* ⚠️ THE NAME IS A CONTROL — it opens the relationship's workspace with nothing selected,
            which is how you reach a query that has no card raised against it. */}
        <button type="button" className="tl-c-nm tl-nmbtn"
          onClick={() => openWork(r.key, today, null)}>
          {/* ⚠️ THE LOCKED COMPONENT, NEVER A DRAWING OF ONE. `StatusDot` owns the ring, the
              glyph and the palette; the pinned row keeps its square because it holds no query and
              a dot invented for it would state a journey that does not exist. */}
          {r.status
            ? <StatusDot status={r.status} overrideSize={13} decorative />
            : <i className="tl-sd" data-dot={r.dot} aria-hidden />}
          <span className="tl-nmwrap">
            <span className="tl-nm2">{r.name}</span>
            {r.agency && <span className="tl-ag2">{r.agency}</span>}
            {/* the books, only where the relationship spans more than one — naming the single
                obvious one is a line that says nothing */}
            {r.manuscripts.length > 1 && (
              <span className="tl-ms">{r.manuscripts.map((m) => m.title).filter(Boolean).join(" · ")}</span>
            )}
          </span>
        </button>

        <div className="tl-c-tl">
          {bar.segs.map((sg) => (
            <Piece key={sg.key} sg={sg} days={range.days} selected={sel === sg.key}
              /* ⚠️ THE LAST MARK ON THIS CARD, never the row's last. A row can hold two
                 relationships — two books with one agency — and each card must clear its own
                 marks and no others. */
              lastMarkAt={(() => {
                const on = bar.nodes.filter((n) => n.rowKey === sg.rowKey && n.lane === sg.lane
                  && n.at >= sg.from - 0.001 && n.at <= sg.to + 0.001);
                return on.length ? Math.max(...on.map((n) => n.at)) : null;
              })()}
              onPick={() => pickSeg(r.key, sg)} />
          ))}
          {bar.nodes.map((n) => (
            <Marker key={n.key} n={n} selected={sel === n.key}
              onPick={() => setSel((c) => (c === n.key ? null : n.key))} />
          ))}
          {r.items.map((it) => (
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
              data-tip={it.label}
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
              <span className="sq" aria-hidden />{it.label}
              {/* the forward mark: this is where it fell due, and the live one is over there */}
              {it.kind === "ghost" && <span className="fwd" aria-hidden>↦</span>}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const workRowNameFor = (rowKey: string) => rows.find((r) => r.key === rowKey)?.name ?? "";

  /* ── the focus band: what a selection says, full width and nothing truncated ─────────────── */
  const facts: { k: string; v: string }[] = [];
  let head: React.ReactNode = null;
  let ctx = "";
  let acts: React.ReactNode = null;
  if (selSeg) {
    const sg = selSeg;
    const who = workRowNameFor(sg.rowKey);
    /* ⚠️ "Your move" / "Their move" ARE THE CODE'S WORDS. `sideOf` is what the app calls whose
       turn it is; a writer calls it being asked for something, or waiting to hear.
       ⚠️ AND IT IS NOT THE OBVIOUS REWORD EITHER. That phrase is a RETIRED To-do family name,
       renamed to AGENT WAITING, and `todoWorkbench.test.ts` greps every file under `src/` for it —
       so the rename is app-wide rather than To-do-local, and a calendar drawer is inside `src/`
       like anything else. It caught the reword within one run, and then caught the COMMENT that
       explained the catch: that lock reads raw file contents and does not strip comments, which
       is why this note describes the phrase instead of quoting it. (Its own needle is split in
       two "so this lock never matches itself" — the author knew.) */
    head = <>{sg.side === "yours" ? "With you" : "Waiting to hear"}{who && <> — <em>{who}</em></>}</>;
    /* ⚠️ THE HOLLOW STRETCH IS WHAT THE HATCH USED TO SAY. A piece past its named end is time the
       writer has held past the date somebody stated — drawn as an outline, and named here only
       because a focus band is prose rather than drawing. */
    ctx = sg.hollow ? "This has run past the date that was named for it." : sg.label;
    if (sg.count) facts.push({ k: "Duration", v: sg.count });
    facts.push({ k: "With", v: sg.side === "yours" ? "You" : "The agent" });
    acts = <button type="button" className="tl-btn" onClick={() => onNavigatePath(`/queries?q=${encodeURIComponent(sg.queryId)}`)}>Open query ›</button>;
  } else if (selNode) {
    const n = selNode;
    const who = workRowNameFor(n.rowKey);
    head = <>{n.caption}{who && <> — <em>{who}</em></>}</>;
    ctx = "";
    acts = <button type="button" className="tl-btn" onClick={() => onNavigatePath(`/queries?q=${encodeURIComponent(n.queryId)}`)}>Open query ›</button>;
  } else if (selItem) {
    const { it, row } = selItem;
    head = <>{it.label}{row.key !== YOU_ROW && <> — <em>{row.name}</em></>}</>;
    ctx = it.kind === "ghost"
      ? "Fell due here · the live item is on today."
      : it.rolledFrom ? carriedLine(it.rolledFrom, today) : "";
    if (it.rolledFrom) facts.push({ k: "Since", v: shortCalDate(it.rolledFrom) });
    facts.push({ k: "Kind", v: FILTER_LABEL[it.kind] });
    acts = (
      <>
        {it.card && (
          <button type="button" className="tl-btn primary"
            onClick={() => openWork(row.key, it.ymd, it.key, it.card)}>Open the task</button>
        )}
        {it.kind === "ghost" && (
          <button type="button" className="tl-btn" onClick={() => setSel(null)}>Go to the task</button>
        )}
        {it.queryId && (
          <button type="button" className="tl-btn"
            onClick={() => onNavigatePath(`/queries?q=${encodeURIComponent(it.queryId!)}`)}>Open query ›</button>
        )}
      </>
    );
  }

  const focusBand = (selSeg || selNode || selItem) && (
    <div className="tl-below">
      <div className="tl-fx">
        <div className="tl-fxmain">
          <span className="tl-lbl2">In focus</span>
          <h3 className="tl-fxh">{head}</h3>
          {ctx && <p className="tl-fxctx">{ctx}</p>}
          {facts.length > 0 && (
            <div className="tl-facts">
              {facts.map((f) => (
                <div key={f.k} className="tl-fact"><div className="k">{f.k}</div><div className="v">{f.v}</div></div>
              ))}
            </div>
          )}
        </div>
        <div className="tl-acts">{acts}</div>
      </div>
    </div>
  );

  /* ── the collapsed day column: the week's whole cast, all but one dimmed ─────────────────── */
  const collapsed = work && (
    <div className="tl-col">
      <div className="tl-colhd">
        <span className="tl-lbl2">Everyone</span>
        <span className="tl-coldt">
          {DOW[new Date(`${work.ymd}T12:00:00`).getDay()]} {Number(work.ymd.slice(8))}
        </span>
      </div>
      <div className="tl-colbd">
        {rows.map((r) => {
          const its = r.items.filter((i) => i.ymd === work.ymd);
          const i = visible.indexOf(work.ymd);
          const bs = (barsByRow.get(r.key)?.segs ?? []).filter((sg) => i + 0.5 >= sg.from && i + 0.5 <= sg.to);
          const on = r.key === work.rowKey;
          return (
            <button key={r.key} type="button" className={`tl-crow${on ? " on" : " off"}`}
              aria-current={on || undefined}
              onClick={() => openWork(r.key, work.ymd, null)}>
              <span className="tl-cwho">
                <span className="tl-cn">
                  <i className="tl-sd" data-dot={r.dot} aria-hidden />
                  <span className="tl-nmtxt">{r.name}</span>
                </span>
                {r.agency && <span className="tl-ag">{r.agency}</span>}
                {its.length + bs.length === 0 ? (
                  <span className="tl-cempty">nothing today</span>
                ) : (
                  <span className="tl-cits">
                    {bs.map((sg) => <span key={sg.key} className="tl-mini" data-kind={sg.side === "yours" ? "turn" : "wait"}>{sg.label || sg.count}</span>)}
                    {its.map((i) => <span key={i.key} className="tl-mini" data-kind={i.kind}>{i.label}</span>)}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  /* ── the workspace: do, read, know ───────────────────────────────────────────────────────── */
  const know: { k: string; v: string }[] = [];
  if (workQuery) {
    know.push({ k: "Status", v: workQuery.status });
    /* ⚠️ "Reply window" WAS THE KEY HERE and it is the code's phrase, not a writer's. The bar's
       own words are what this row shows, so it names them rather than a derivation. */
    know.push({
      k: "Waiting until",
      v: workSeg ? workSeg.label || "No date resolvable" : "No date resolvable",
    });
    const mats = (workQuery.materialsWanted ?? []).map(formatQueryMaterial).filter(Boolean);
    if (mats.length) know.push({ k: "Materials", v: mats.join(", ") });
    if (workQuery.personalisationNotes) know.push({ k: "Your note", v: workQuery.personalisationNotes });
  }
  if (workAgent) know.push({ k: "Agency", v: agentSecondary(workAgent) || agentPrimary(workAgent) });

  const workspace = work && workRow && (
    <div className="tl-ws">
      <div className="tl-wshd">
        <span className="tl-lbl2">
          {workQuery ? `${getPrimaryAction(workQuery.status).ballHolder === "writer" ? "With you" : "Waiting to hear"} · ` : ""}
          {workRow.name}
        </span>
        <button type="button" className="tl-btn" onClick={() => { setWork(null); setPaneCard(null); }}>
          Esc · back to the week
        </button>
      </div>
      <div className="tl-wsbd">
        <div className="tl-two">
          {/* DO — the same pane `/todo` draws, driven by the same session hook and writing through
              the same committer. It is the point of the whole stream: one task workflow, wherever
              you meet a task. */}
          <div className="tl-do" ref={paneRef}>
            {paneSession.journey
              ? <TaskPane journey={paneSession.journey} onPrimary={paneSession.onPrimary} />
              : <div className="tl-readbd">Nothing to do on this relationship just now.</div>}
          </div>
          {/* READ — the Query Centre's OWN rows, off the authoritative subcollection */}
          <div className="tl-read">
            <div className="tl-readhd">
              <span className="tl-lbl2">The whole conversation</span>
              {workQueryId && (
                <button type="button" className="tl-btn"
                  onClick={() => onNavigatePath(`/queries?q=${encodeURIComponent(workQueryId)}`)}>
                  Open in Query Centre →
                </button>
              )}
            </div>
            <div className="tl-readbd">
              {convoRows.length > 0
                ? <TimelineRows rows={convoRows} />
                : <span className="tl-cempty">Nothing logged yet</span>}
            </div>
          </div>
          {/* KNOW — facts, each omitting itself when there is nothing to state */}
          <div className="tl-know">
            {know.map((b) => (
              <div key={b.k} className="tl-box"><div className="k">{b.k}</div><div className="v">{b.v}</div></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="t-f12 spine-root cal-timeline" ref={pageRef}>
      <div className="tdb-wrap today-off">
        <TasksPageLayout
          title="Calendar"
          mark="calendar"
          tools={
            <>
              {/* ⚠️ THE RANGE SITS WITH THE PAGER, because they answer one question between them —
                  the pager moves the window and this sets how much of it there is. */}
              {/* ══ ONE CONTROL ROW ═══════════════════════════════════════════════════════
                  ⚠️ THE KIND CHIPS ARE REMOVED, NOT HIDDEN, AND `TimelineView.kinds` WENT WITH
                  THEM. Four toggles that each subtracted a class of thing from a board whose whole
                  claim is that it shows you the relationship entire — and a board you have
                  silently switched a quarter of off is a board that lies by omission. Leaving the
                  field behind set to "all" would have left a filter nothing could reach and
                  nothing could clear, which is how a retired control comes back as a bug. */}

              {/* ⚠️ CUT BY MANUSCRIPT ONLY EXISTS FROM THE SECOND MANUSCRIPT ON. The ref's own
                  audit: "genuinely useful from the second manuscript onward; noise before that."
                  A control offering one choice implies others the writer cannot reach. */}
              {cutByAvailable && (
                <span className="tl-seg2" role="group" aria-label="Cut by">
                  <button type="button" data-on={cutBy === "needs"} aria-pressed={cutBy === "needs"}
                    onClick={() => setCutBy("needs")}>WHAT NEEDS YOU</button>
                  <button type="button" data-on={cutBy === "ms"} aria-pressed={cutBy === "ms"}
                    onClick={() => setCutBy("ms")}>MANUSCRIPT</button>
                </span>
              )}

              <TimelineRangeSlider index={rangeIdx} onChange={setRangeIdx} />
              <button type="button" className="cal-nav calm-nav" aria-label="Previous window"
                onClick={() => setWinStart((s) => shiftWindow(s, range.days, -1))}>
                <ChevronLeft size={14} aria-hidden />
              </button>
              <button type="button" className="cal-nav calm-nav cal-today"
                onClick={() => setWinStart(today)}>Today</button>
              <button type="button" className="cal-nav calm-nav" aria-label="Next window"
                onClick={() => setWinStart((s) => shiftWindow(s, range.days, 1))}>
                <ChevronRight size={14} aria-hidden />
              </button>

              <span className="tl-csep" aria-hidden />
              {/* ⚠️ A FILTER OF THE ONE BOARD, NEVER A SECOND BOARD. Same rows, same bars, same
                  deeds, same groups — only the rows that ask nothing of you are withheld. */}
              {/* ⚠️ THE SAME ROWS EITHER WAY. GROUPED does not fetch, filter or re-derive
                  anything — it buckets the list the page already has, which is why the lock can
                  assert the two views hold the identical row set by identity. */}
              <span className="tl-seg2" role="group" aria-label="How the board is arranged">
                <button type="button" data-on={!grouped} aria-pressed={!grouped}
                  onClick={() => setGrouped(false)}>ONE LIST</button>
                <button type="button" data-on={grouped} aria-pressed={grouped}
                  onClick={() => setGrouped(true)}>GROUPED</button>
              </span>
              <span className="tl-csep" aria-hidden />
              <span className="tl-seg2" role="group" aria-label="How much of the board">
                <button type="button" data-on={!onlyAsks} aria-pressed={!onlyAsks}
                  onClick={() => setOnlyAsks(false)}>FULL BOARD</button>
                <button type="button" data-on={onlyAsks} aria-pressed={onlyAsks}
                  onClick={() => setOnlyAsks(true)}>RIGHT NOW</button>
              </span>

              {/* ⚠️ EACH OPTION CARRIES ITS OWN DEFINITION. "Soonest" could mean the soonest thing
                  you must do, the soonest reply expected, or the soonest anything happens — three
                  different orders, and a reader has no way to tell which they got from the name. */}
              <Menu<RowSort> label="Sort" value={view.sort} options={SORT_ORDER}
                labels={SORT_LABEL} meanings={SORT_MEANING}
                onPick={(v) => setView1("sort", v)} />
              <input
                className="tl-search" type="search" value={view.search}
                aria-label="Search agents, agencies and tasks"
                placeholder="Search…"
                onChange={(e) => setView1("search", e.target.value)}
              />
              <TplGrow />
              {/* ⚠️ THE COUNT NAMES WHAT IS ON SCREEN, and it changes its noun with the view — a
                  tally of "relationships" beside a board showing only what is being asked of you
                  would be counting one thing and describing another. */}
              <span className="tl-count">
                {/* ⚠️ TASK ROWS ARE NOT RELATIONSHIPS, and one noun counting both was a tally
                    describing something other than what it counted. Two nouns, each over its own
                    set, and the tasks clause is omitted entirely when there are none — a "0 TASKS"
                    states an absence nobody asked about. */}
                {onlyAsks
                  ? `${asking} ASKING FOR YOU`
                  : `${agentRows} ${agentRows === 1 ? "RELATIONSHIP" : "RELATIONSHIPS"}`
                    + (taskRows ? ` · ${taskRows} ${taskRows === 1 ? "TASK" : "TASKS"}` : "")}
              </span>
              {/* the pink creation action: the ONE composer lives on the To-do list page — go
                  there and announce, never a second create surface */}
              <button type="button" className="tdb-addb" onClick={() => {
                onNavigatePath("/todo");
                window.dispatchEvent(new CustomEvent(TODO_OPEN_COMPOSER));
              }}>
                <Plus size={13} aria-hidden /> Add task or note
              </button>
            </>
          }
        >
          {/* ⚠️ ONE STATE OR THE OTHER, NEVER BOTH ON SCREEN. Acting collapses the board to a day's
              column and gives the rest of the page to the work; the full board and its focus band
              are what the week looks like when nothing is being worked. */}
          {work ? (
            <div className="tl-split">
              {collapsed}
              {workspace}
            </div>
          ) : (
          <>
          <div className="tl-board">
            <TplZone className="tl-zone" hem={false} label={range.label}>
              <div
                className="tl tl-wrap"
                ref={wrapRef}
                style={{ "--tl-days": range.days } as React.CSSProperties}
                onMouseMove={onLaneMove}
                onMouseLeave={clearCross}
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
                    <div className="tl-c-nm"><span className="tl-lbl3">Agent</span></div>
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
                      {months.length >= MONTH_SHELF_FROM && months.map((m) => (
                        <React.Fragment key={m.key}>
                          {m.at > 0 && <span className="tl-mdiv" style={{ left: pct(m.at) }} aria-hidden />}
                          <span
                            className={`tl-mlab${m.current ? " now" : ""}${m.past ? " gone" : ""}`}
                            style={{ left: pct(m.labelAt) }}
                          >{m.label}</span>
                        </React.Fragment>
                      ))}
                      {/* the ticks and their days */}
                      {dateLabels.map((d) => (
                        <React.Fragment key={d.ymd}>
                          <span className="tl-tick" style={{ left: pct(d.at) }} data-at={d.at} aria-hidden />
                          <span className="tl-dt" style={{ left: pct(d.at) }}>{d.text}</span>
                        </React.Fragment>
                      ))}
                      {todayAt != null && (
                        <>
                          <span className="tl-todaystem" style={{ left: pct(todayAt) }} aria-hidden />
                          <span className="tl-todaychip" style={{ left: pct(todayAt) }}>{shortCalDate(today)}</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
                {board.length === 0 ? sparse : !grouped ? (
                  /* ⚠️ NO CARD, NO HEADING, NO HAIRLINE — the rows are separated by height and by
                     hover alone. A rule between every pair of rows on a list this long is thirteen
                     lines competing with the bars, and the bars are the data. */
                  <div className="tl-tbl tl-one">{oneList.map(row)}</div>
                ) : board.map((g, gi) => (
                  <div className="tl-grp" key={g.key}>
                    <div className="tl-gt">
                      <span className="t">{g.title}</span>
                      <span className="n">{g.count}</span>
                      {g.sentence && <span className="s">{g.sentence}</span>}
                      {g.collapsible && (
                        <button type="button" className="tl-gtbtn"
                          aria-expanded={g.open}
                          onClick={() => setShut((cur) =>
                            cur.includes(g.group!) ? cur.filter((x) => x !== g.group) : [...cur, g.group!])}>
                          {g.open ? "hide ‹" : "show ›"}
                        </button>
                      )}
                    </div>
                    {g.open && (
                      <div className="tl-tbl">
                        {/* ⚠️ THE DATE ROW HAS LEFT THE CARD (v36, Phase 4). It was drawn once,
                            inside the FIRST group's card — so it scrolled away with that card and
                            a reader four groups down had no dates at all. It is the page's own
                            sticky rail now, above every group. */}
                        {g.rows.map(row)}
                      </div>
                    )}
                  </div>
                ))}
                {/* ⚠️ TODAY, THE CROSSHAIR AND THE ONE TOOLTIP ARE ALL CHILDREN OF THE WRAP, never
                    of a lane — a lane clips, and a clipping ancestor beats any z-index. */}
                {todayAt != null && (
                  <>
                    <div className="tl-todayline" style={{ left: todayLeft }} aria-hidden />
                    <div className="tl-todayflag" style={{ left: todayLeft }} aria-hidden>
                      {shortCalDate(today)}
                    </div>
                  </>
                )}
                {cross && (
                  <>
                    <div className="tl-xh" style={{ left: `${cross.x}px` }} aria-hidden />
                    <div className="tl-xhlab" style={{ left: `${cross.x}px`, top: 0 }} aria-hidden>{cross.label}</div>
                  </>
                )}
                <div ref={tipRef} className="tl-tipp" role="tooltip" aria-hidden />
              </div>
            </TplZone>
          </div>
          {focusBand}
          </>
          )}
        </TasksPageLayout>
      </div>

      {toast && (
        <div className="tdb-toast" role="status" onMouseEnter={pause} onMouseLeave={resume}>
          {toast.msg}
          {toast.action && (
            <button type="button" className="tdb-toast-act" onClick={() => { void toast.action!.fn(); dismiss(); }}>
              {toast.action.label}
            </button>
          )}
        </div>
      )}

      {confirmAskNode}

      {flowCard && (
        <div className="cal-flow">
        <FocusFlow
          items={[{ kind: "card", card: flowCard }]}
          onClose={() => setFlowCard(null)}
          /* the receipts and their Undo are whatever the shared hook already produces, which is the
             only way this page and `/todo` can be relied on to say the same thing */
          onNavigate={onNavigate}
          onToast={flash}
          quickDone={quickDone}
        />
        </div>
      )}
    </div>
  );
};
