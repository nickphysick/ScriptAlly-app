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
import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { TasksPageLayout, TplGrow, TplZone } from "./TasksPageLayout";
import { useTodoToast } from "./useTodoToast";
import { FocusFlow } from "./FocusFlow";
import { TaskPane } from "./TaskPane";
import { useTaskPaneSession, type TaskPaneHost } from "./useTaskPaneSession";
import { useTaskCommit } from "./useTaskCommit";
import { TimelineRangeSlider, TIMELINE_RANGES, DEFAULT_RANGE_INDEX } from "./TimelineRangeSlider";
import { GROUP_ORDER, GROUP_LABEL, COLLAPSED_BY_DEFAULT, type RowGroup } from "../../lib/timelineGroups";
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
  TIMELINE_FILTERS, FILTER_LABEL, SORT_LABEL, SORT_ORDER,
  allFilters, YOU_ROW,
  type TimelineItem, type TimelineRow, type TimelineView,
  type RowSort, type TimelineFilter,
} from "../../lib/todoTimeline";
import {
  OVERRUN_SPAN, durationCount,
  type Segment, type BarNode, type Waypoint,
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
const pct = (n: number) => `calc(${n} / var(--tl-days) * 100%)`;
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

const Chip: React.FC<{
  it: TimelineItem;
  selected: boolean;
  onPick: () => void;
  drag?: { onStart: (e: React.DragEvent) => void; onEnd: () => void };
}> = ({ it, selected, onPick, drag }) => (
  <button
    type="button"
    className={`tl-at tl-chip${selected ? " sel" : ""}${it.struck ? " struck" : ""}${drag ? " grab" : ""}`}
    data-kind={it.kind}
    {...(it.dir ? { "data-dir": it.dir } : {})}
    style={{
      left: `calc(${pct(it.idx)} + 4px)`,
      /* the chip runs to the column before the next occupant of its own lane — the room that is
         actually free, rather than all the width there is (which is what the ref gives it) */
      maxWidth: `calc(${pct(it.spanTo - it.idx + 1)} - 8px)`,
      ...laneVar(it.lane),
    }}
    draggable={!!drag}
    onDragStart={drag?.onStart}
    onDragEnd={drag?.onEnd}
    onClick={onPick}
  >
    {/* ⚠️ THE RECORD'S DOT COMES FROM `REC_TONE`, THE MAP, because it is the one thing on a chip
        that VARIES with the data — direction is authorship, and the layer's two tones are declared
        once. Everything else here is a fixed grammar with no per-item variation, so it lives in
        the stylesheet with the page's other fixed colours. */}
    <span className="d" aria-hidden
      style={it.kind === "rec" ? { background: REC_TONE[it.dir ?? "out"].dot } : undefined} />
    <span className="tl-lbl">{it.label}</span>
    {it.kind === "ghost" && <span className="tl-fwd" aria-hidden>↦</span>}
  </button>
);

/**
 * One piece of a journey bar.
 *
 * ⚠️ IT IS POSITIONED IN FRACTIONAL DAYS, as a percentage of the seven columns — so a break lands
 * on the same boundary the cells do at every width, and a resize recomputes nothing.
 */
const Seg: React.FC<{ sg: Segment; selected: boolean; onPick: () => void }> = ({ sg, selected, onPick }) => (
  <button
    type="button"
    className={[
      "tl-at tl-seg",
      sg.side === "yours" ? "yours" : "theirs",
      sg.weight ? `w-${sg.weight}` : "",
      /* ⚠️ THE HATCH IS A CLASS ON THIS BAR, not a second bar beside it. One element, one
         statement, and the treatment stops where the expectation was. */
      sg.hatchPct ? "hatched" : "",
      sg.openLeft ? "openleft" : "", sg.openRight ? "future" : "",
      sg.capLeft ? "capl" : "", sg.capRight ? "capr" : "",
      sg.norail ? "norail" : "", sg.openEnd ? "openend" : "",
      selected ? "sel" : "",
    ].filter(Boolean).join(" ")}
    style={{
      left: `calc(${pct(sg.from)} + 4px)`,
      width: `calc(${pct(sg.to - sg.from)} - 8px)`,
      ...(sg.hatchPct ? { ["--hatch" as string]: `${sg.hatchPct}%` } : {}),
      ...laneVar(sg.lane),
    }}
    onClick={onPick}
  >
    {/* ⚠️ THE DOT IS THE STATEMENT'S BULLET, so a piece that says nothing does not draw one. A bar
        states itself once per run; the pieces that stay silent are the same bar continuing, and a
        lone dot in an empty capsule reads as a pill that failed to load. */}
    {!!sg.label && <span className="d" aria-hidden />}
    <span className="tl-lbl">{sg.label}</span>
    {sg.count && <span className="tl-cnt">{sg.count}</span>}
  </button>
);

/**
 * An event on the bar — it sits IN the break the derivation left, and names itself on hover.
 *
 * ⚠️ THE CAPTION IS NOT A `title` ANY MORE (range pack, Phase 4). It was, and the comment at it
 * said why: two markers on one day overprint each other's captions, the markers stay legible and
 * the captions do not, and a policy for that was a design decision left unmade. The policy is
 * hover — one caption at a time, chosen by the reader — so the workaround has no subject left.
 * `aria-label` still carries the same words, and on a `<button>` it replaces the contents for
 * assistive technology, so the caption is not read twice.
 *
 * ⚠️ TWO MARKERS, AND THE SHAPE IS THE CLAIM (v11). Where the status CHANGED the marker is the
 * locked `StatusDot` — the same symbol the writer reads on every other surface, at its own
 * app-wide size, with nothing about it restated here. Where an activity was recorded and the
 * status HELD, a StatusDot would draw the same symbol on both sides of the join and read as
 * nothing having happened, so the marker is a smaller ringless dot carrying the direction alone.
 *
 * ⚠️ BOTH ARE CLICKABLE, because both have an entry behind them. That is not a second rule: it is
 * the same rule the shape states, which is what stops the two drifting apart.
 */
const Node: React.FC<{ n: BarNode; selected: boolean; onPick: () => void }> = ({ n, selected, onPick }) => (
  <button
    type="button"
    className={`tl-at tl-node${selected ? " sel" : ""}`}
    data-marker={n.marker}
    data-dir={n.dir}
    style={{ left: pct(n.at), ...laneVar(n.lane) }}
    onClick={onPick}
    aria-label={n.caption}
  >
    {/* ⚠️ THE HALO IS THE WRAPPER'S, NOT THE DOT'S. `StatusDot` is locked and takes no ring of its
        own; punching the marker out of the board's parchment is this page's business, so it is
        this page's element that does it. */}
    <span className="tl-mk">
      {n.marker === "status" && n.status
        ? <StatusDot status={n.status} decorative />
        : <span aria-hidden>{n.glyph}</span>}
    </span>
    <span className="tl-tip">{n.caption}</span>
  </button>
);

/**
 * A date that arrived with nothing recorded against it.
 *
 * ⚠️ NOT CLICKABLE, AND NOT BECAUSE OF A FLAG. It is a `<span>` with no handler, because there is
 * nothing behind it to open — v11's rule is that the interaction and the shape are the SAME rule,
 * so neither can drift from the other. Dashed throughout, because dashed already means provisional
 * everywhere else in this app.
 *
 * ⚠️ THE REMINDER TAKES A DASHED RING RATHER THAN AN UPRIGHT, and no exclamation mark. A reminder
 * falling due is the date you chose, arriving; an exclamation adds alarm the app has no business
 * feeling, which is the ground the forbidden word was ruled out on.
 */
const Way: React.FC<{ w: Waypoint }> = ({ w }) => (
  <span
    className={`tl-at tl-wp${w.side === "yours" ? " yours" : ""}${w.passed ? " passed" : ""}`}
    data-kind={w.kind}
    style={{ left: pct(w.at), ...laneVar(w.lane) }}
    aria-hidden
  >
    <span className="tl-tip">{w.caption}</span>
  </span>
);

/** A dropdown that names its current value — the same shape for Show and for Sort. */
function Menu<T extends string>({
  label, value, options, labels, onPick,
}: {
  label: string; value: T; options: readonly T[]; labels: Record<T, string>; onPick: (v: T) => void;
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
              {labels[o]}
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
  const visible = useMemo(() => windowDays(winStart, range.days), [winStart, range.days]);
  /**
   * ⚠️ THE COLUMNS ARE WHAT IS DRAWN; `visible` IS WHAT IS TRUE. Every derivation below reads the
   * DAYS — a bar's span, a marker's date, the record — and nothing is positioned by a column. At
   * week and month grain the columns are a coarser ruler laid over the same window, stepping 7 and
   * 30 as the ref does, so a 182-day board draws six columns and still places a marker on its own
   * day.
   */
  const columns = useMemo(() => {
    const step = range.grain === "day" ? 1 : range.grain === "week" ? 7 : 30;
    const out: { ymd: string; from: number }[] = [];
    for (let i = 0; i < range.days; i += step) out.push({ ymd: visible[i] ?? visible[visible.length - 1], from: i });
    return out;
  }, [visible, range.grain, range.days]);
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
  /**
   * ⚠️ WHAT THE ROW HEAD SAYS WHEN THE BARS CANNOT. The live segment's own label — the one the bar
   * carries at day grain — read from the same row the bars are drawn from, so the two cannot
   * disagree. Empty where the row has no speaking segment, because a head that says nothing is
   * better than one that invents something to say.
   */
  const rowSay = (key: string): string =>
    (barsByRow.get(key)?.segs ?? []).map((sg) => sg.label).find(Boolean) ?? "";
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

  const { rows, segments, nodes, waypoints } = useMemo(
    () => timelineWeek(
      { queries, agents, activities, manuscripts, taskFlags, today, itemsFor, recordFor, ghostsOn },
      winStart, range.days, view,
    ),
    [queries, agents, activities, manuscripts, taskFlags, today, itemsFor, recordFor, ghostsOn, winStart, view],
  );
  /** the bar's three parts, grouped by the row they belong to — one pass, read three times */
  const barsByRow = useMemo(() => {
    const m = new Map<string, { segs: Segment[]; nodes: BarNode[]; ways: Waypoint[] }>();
    const get = (k: string) => {
      let v = m.get(k);
      if (!v) { v = { segs: [], nodes: [], ways: [] }; m.set(k, v); }
      return v;
    };
    for (const sg of segments) get(sg.rowKey).segs.push(sg);
    for (const n of nodes) get(n.rowKey).nodes.push(n);
    for (const w of waypoints) get(w.rowKey).ways.push(w);
    return m;
  }, [segments, nodes, waypoints]);

  /* ⚠️ THE COUNT STATES WHAT IS ON SCREEN, never a total the filters have stopped describing. */
  const shown = rows.reduce((n, r) => n + r.items.length, 0) + segments.length;
  const agentRows = rows.filter((r) => r.key !== YOU_ROW).length;

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
  const toggleKind = (k: TimelineFilter) =>
    setView((cur) => ({
      ...cur,
      kinds: cur.kinds.includes(k) ? cur.kinds.filter((x) => x !== k) : [...cur.kinds, k],
    }));

  const row = (r: TimelineRow) => {
    const bar = barsByRow.get(r.key) ?? { segs: [], nodes: [], ways: [] };
    const lanes = Math.max(1, r.lanes);
    return (
      <div
        key={r.key}
        className={`tl-grid tl-row${r.key === YOU_ROW ? " tl-row--pin" : ""}${r.closed ? " closed" : ""}${pastWeek ? " past" : ""}`}
        /* ⚠️ THE ROW GROWS TO HOLD ITS LANES — it never clips one. A clipped lane hides a journey
           with nothing to say so, which is the one failure a bar must not have. The HEIGHT is the
           sheet's: `--lanes` is how many lines this row needs, which is data, and what a line is
           worth is `--lane-h`, which is geometry. */
        style={{ ["--lanes" as string]: String(lanes) } as React.CSSProperties}
      >
        {/* ⚠️ THE ROW HEAD IS A CONTROL — it opens the relationship's workspace with nothing
            selected, which is how you reach a query that has no card raised against it. */}
        <button type="button" className="tl-rowhead" style={{ gridColumn: 1 }}
          onClick={() => openWork(r.key, today, null)}>
          <span className="tl-nm">
            {/**
              * ⚠️ THE LOCKED COMPONENT, AT ITS OWN SMALLEST SUPPORTED SIZE — never a drawing of
              * one. `StatusDot` owns the ring, the glyph, the pulse and the palette, and its
              * amended lock says direction and stage are carried by SHAPE while the six pipeline
              * statuses take one hue per theme. So reproducing "colour for direction" here would
              * be a fork of a locked component wearing a helpful face. Nothing is restated.
              *
              * ⚠️ `overrideSize` EXISTS FOR EXACTLY THIS — "the dense timelines, where a full-size
              * dot would be clipped" — and clamps at 12. 18 is inside the supported range and
              * already has siblings at 19 on the Agents page and 22 in the query list.
              *
              * ⚠️ THE PINNED ROW KEEPS ITS SQUARE. It holds no query, so it has no status, and a
              * dot invented for it would state a journey that does not exist. The fallback is the
              * mark it already had rather than a blank space.
              */}
            {r.status
              ? <StatusDot status={r.status} overrideSize={18} decorative />
              : <i className="tl-sd" data-dot={r.dot} aria-hidden />}
            <span className="tl-nmtxt">{r.name}</span>
          </span>
          {r.agency && <span className="tl-ag">{r.agency}</span>}
          {/* ⚠️ THE BOOKS ARE NAMED ONLY WHERE THERE IS MORE THAN ONE. Naming the single obvious
              one is a line that says nothing, and this row has little enough height as it is. */}
          {r.manuscripts.length > 1 && (
            <span className="tl-ms">{r.manuscripts.map((m) => m.title).filter(Boolean).join(" · ")}</span>
          )}
          {/**
            * ⚠️ THE SENTENCE RELOCATES; IT IS NOT TRUNCATED (range pack, Phase 3). At three months a
            * bar is a few pixels of shape and its label cannot be read, so the label LEAVES the bar
            * and the row head says it instead. A half-legible word inside a 9px bar is worse than
            * no word, and an ellipsis is a promise that the rest is somewhere — it is not.
            *
            * ⚠️ IT IS THE BAR'S OWN LABEL, not a second sentence written for this tier. Rendering
            * something else here would give one relationship two descriptions that could disagree;
            * the row head is a different PLACE for the same words, which is the whole claim.
            */}
          {range.dense >= 3 && rowSay(r.key) && <span className="tl-rowsay">{rowSay(r.key)}</span>}
        </button>
        {/* ⚠️ EVERY PARTICIPANT NAMES ITS OWN COLUMN. Auto-placement never overlaps: an auto-placed
            cell beside the explicitly placed lane would be pushed into an implicit new column and
            the grid would silently grow sideways — measured at 688px of phantom right margin the
            last time this page mixed the two. */}
        {columns.map(({ ymd }, i) => (
          <div
            key={ymd}
            /* ⚠️ THE BOUNDARY IS ON THE CELL THAT STARTS THE WEEK, and `i > 0` keeps it off the
               first column, whose left edge is the head column's own border. */
            className={`tl-cell${ymd === today ? " today" : ""}${ymd < today ? " past" : ""}${dropYmd === ymd ? " dropok" : ""}${i > 0 && startsPeriod(ymd) ? " bound" : ""}`}
            style={{ gridColumn: i + 2, gridRow: 1 }}
            onDragOver={dragTask && ymd !== dragTask.from ? (e) => { e.preventDefault(); setDropYmd(ymd); } : undefined}
            onDragLeave={dropYmd === ymd ? () => setDropYmd(null) : undefined}
            onDrop={(e) => { e.preventDefault(); dropOn(ymd); }}
          />
        ))}
        <div className="tl-lane">
          {/* the bar first, then its events on top of it, then the writer's own chips above both */}
          {bar.segs.map((sg) => (
            <Seg key={sg.key} sg={sg} selected={sel === sg.key}
              onPick={() => pickSeg(r.key, sg)} />
          ))}
          {bar.ways.map((w) => <Way key={w.key} w={w} />)}
          {bar.nodes.map((n) => (
            <Node key={n.key} n={n} selected={sel === n.key}
              onPick={() => setSel((c) => (c === n.key ? null : n.key))} />
          ))}
          {r.items.map((it) => (
            <Chip
              key={it.key}
              it={it}
              selected={sel === it.key}
              onPick={() => pick(r.key, it)}
              drag={it.draggable && it.card?.userTaskId ? {
                onStart: (e) => {
                  /* the payload rides the event for protocol correctness — the STATE is what the
                     drop reads; dataTransfer is write-only in dragover */
                  e.dataTransfer.setData("text/plain", it.card!.userTaskId!);
                  e.dataTransfer.effectAllowed = "move";
                  setDragTask({ id: it.card!.userTaskId!, from: it.ymd });
                },
                onEnd: endDrag,
              } : undefined}
            />
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
    head = <>{sg.side === "yours" ? "Your move" : "Waiting"}{who && <> — <em>{who}</em></>}</>;
    ctx = sg.hatchPct ? "It has been your move since the date it was expected." : sg.label;
    if (sg.count) facts.push({ k: "Duration", v: sg.count });
    facts.push({ k: "Side", v: sg.side === "yours" ? "Your move" : "Their move" });
    acts = <button type="button" className="tl-btn" onClick={() => onNavigatePath(`/queries?q=${encodeURIComponent(sg.queryId)}`)}>Open query ›</button>;
  } else if (selNode) {
    const n = selNode;
    const who = workRowNameFor(n.rowKey);
    head = <>{n.caption}{who && <> — <em>{who}</em></>}</>;
    ctx = "";
    acts = <button type="button" className="tl-btn" onClick={() => onNavigatePath(`/queries?q=${encodeURIComponent(n.queryId)}`)}>Open query ›</button>;
  } else if (selItem) {  } else if (selItem) {
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
    know.push({ k: "Reply window", v: workSeg ? workSeg.label : "None resolvable" });
    const mats = (workQuery.materialsWanted ?? []).map(formatQueryMaterial).filter(Boolean);
    if (mats.length) know.push({ k: "Materials", v: mats.join(", ") });
    if (workQuery.personalisationNotes) know.push({ k: "Your note", v: workQuery.personalisationNotes });
  }
  if (workAgent) know.push({ k: "Agency", v: agentSecondary(workAgent) || agentPrimary(workAgent) });

  const workspace = work && workRow && (
    <div className="tl-ws">
      <div className="tl-wshd">
        <span className="tl-lbl2">
          {workQuery ? `${getPrimaryAction(workQuery.status).ballHolder === "writer" ? "Your turn" : "Waiting"} · ` : ""}
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

              {/* ⚠️ ONE CONTROL ROW, AND THE SECOND ONE IS GONE. The filters used to sit in a row of
                  their own directly beneath this one — two strips of controls stacked, 42px of a
                  900px viewport spent on the fact that they had been built at different times.
                  They are one line now: which week, which kinds, which order, what you are looking
                  for, and how much of it there is. */}
              <span className="tl-sep" aria-hidden />
              <span className="tl-kinds" role="group" aria-label="Kinds">
                {TIMELINE_FILTERS.map((k) => (
                  <button key={k} type="button" className="tl-kind"
                    data-on={view.kinds.includes(k)} aria-pressed={view.kinds.includes(k)}
                    onClick={() => toggleKind(k)}>
                    {FILTER_LABEL[k]}
                  </button>
                ))}
              </span>
              <Menu<RowSort> label="Sort" value={view.sort} options={SORT_ORDER}
                labels={SORT_LABEL} onPick={(v) => setView1("sort", v)} />
              <input
                className="tl-search" type="search" value={view.search}
                aria-label="Search agents, agencies and tasks"
                placeholder="Search…"
                onChange={(e) => setView1("search", e.target.value)}
              />
              <TplGrow />
              {/* ⚠️ THE COUNT ELIDES FIRST when the row runs short of room, then the search
                  narrows — a tally is the one thing here that answers a question nobody has asked
                  yet, so it is the one that can go. Neither the week, the kinds, the order nor the
                  search may ever be the thing that wraps. */}
              <span className="tl-count">
                {agentRows} {agentRows === 1 ? "row" : "rows"} · {shown} {shown === 1 ? "item" : "items"}
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
            {/* ⚠️ THE ZONE NAMES WHAT IS IN IT, AND IT SAID "The week" AT EVERY RANGE (Phase 5).
                It was true while a window could only be seven days. It is the same fault as a
                comment outliving what it described, arriving through a prop: a label nobody
                re-reads, stating something the code stopped doing. */}
            <TplZone className="tl-zone" hem={false} label={range.label}>
              <div
                className={`tl dense${range.dense}`}
                style={{ "--tl-days": range.days, "--tl-cols": columns.length } as React.CSSProperties}
              >
                {/* ⚠️ THE TODAY SPINE IS GONE (grouped pack, Phase 2), and the ref draws none
                    either. Today is where the board STARTS — every range opens a small slice
                    before it and the rest ahead — so a line marking today restated what the
                    layout already guarantees, in the one place a reader was least likely to
                    need telling. The past columns' deeper ground says the same thing by being
                    the thing itself rather than a label on it. */}
                <div className="tl-grid tl-head">
                  <div className="tl-corner" style={{ gridColumn: 1, gridRow: 1 }}>Agents &amp; you</div>
                  {columns.map((c, i) => (
                    <div key={c.ymd} className={`tl-dh${c.ymd === today ? " today" : ""}${i > 0 && startsPeriod(c.ymd) ? " bound" : ""}`}
                      style={{ gridColumn: i + 2, gridRow: 1 }}>
                      {/* ⚠️ THE WEEKDAY INITIAL DROPS AT A MONTH AND BEYOND (ref v18): seven letters
                          repeating thirty-one times is noise, and at week or month grain a column is
                          not a weekday at all. The date below it carries the column either way. */}
                      {range.grain === "day" && range.days <= 14 && (
                        <span className="tl-dw">{DOW[new Date(`${c.ymd}T12:00:00`).getDay()]}</span>
                      )}
                      <span className="tl-dd">{colLabel(c.ymd, range.grain)}</span>
                    </div>
                  ))}
                </div>
                {/**
                  * ⚠️ THE PINNED ROW IS ABOVE THE GROUPS, NOT IN ONE. It holds tasks from every
                  * manuscript and from none, so no group is true of it; its `group` is `null` and
                  * that is what filters it out of the buckets below rather than a special case.
                  */}
                {rows.filter((r) => r.group === null).map(row)}
                {GROUP_ORDER.map((g) => {
                  const mine = rows.filter((r) => r.group === g);
                  /* ⚠️ AN EMPTY GROUP IS OMITTED ENTIRELY, HEADER AND ALL. A header reading "0"
                     is a heading for nothing — it teaches the shape of a board the writer does
                     not have, and at six groups it would be most of the page. */
                  if (!mine.length) return null;
                  const open = !shut.includes(g);
                  return (
                    <React.Fragment key={g}>
                      <div className="tl-ghead">
                        <button type="button" className="tl-ghbtn"
                          aria-expanded={open}
                          onClick={() => setShut((cur) =>
                            cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g])}>
                          <span className="tl-ghcar" data-open={open ? "1" : "0"} aria-hidden>▸</span>
                          <span className="tl-ghname">{GROUP_LABEL[g]}</span>
                          {/* ⚠️ THE COUNT IS THE RENDERED ROWS, so it cannot disagree with what is
                              on screen. Filters run before grouping, so this is the filtered
                              figure by construction rather than by a second count. */}
                          <span className="tl-ghn">{mine.length}</span>
                        </button>
                      </div>
                      {open && mine.map(row)}
                    </React.Fragment>
                  );
                })}
              </div>
              {/* ⚠️ AN EMPTY BOARD IS NOT A FAILURE STATE. No apology, no prompt to do more — a
                  writer with a quiet week is entitled to read that as good news, or as nothing. */}
              {/* ⚠️ ONE LINE, NO ILLUSTRATION, NO ENCOURAGEMENT. A week with nothing in it is a
                  fact, and a writer with a quiet week is entitled to read it as good news or as
                  nothing at all. The EMPTY ROW is what this pack removed; the empty WEEK still
                  says its one line, once. */}
              {rows.length === 0 && (
                <div className="tl-none"><p className="tl-none-t">Nothing this week.</p></div>
              )}
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
