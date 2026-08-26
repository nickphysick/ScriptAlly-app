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
  shortCalDate, REC_TONE, CalendarItem, RecordItem, GhostItem,
} from "../../lib/todoCalendar";
import {
  windowDays, shiftWindow, timelineWeek, defaultView,
  TIMELINE_FILTERS, FILTER_LABEL, SHOW_LABEL, SHOW_ORDER, SORT_LABEL, SORT_ORDER,
  allFilters, YOU_ROW,
  type TimelineItem, type TimelineBand, type TimelineRow, type TimelineView,
  type ShowMode, type RowSort, type TimelineFilter,
} from "../../lib/todoTimeline";
import { classifyWriteError, saveErrorCopy } from "../../lib/todoWrite";
import "./tasksLayout.css";
import "./taskChrome.css";
import "./todoCalendar.css";

export interface TodoCalendarPageProps {
  onNavigate: (tab: string, sub?: string) => void;
  onNavigatePath?: (path: string) => void;
}

/** Seven days. The window is rolling, so there is no month to be a subset of. */
const TL_DAYS = 7;
const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

/**
 * ⚠️ POSITION IS A PERCENTAGE OF THE SEVEN COLUMNS, NEVER A PIXEL. The lane spans the day columns
 * of a grid whose tracks are `minmax(0, 1fr)`, so a percentage inside it lands on the same
 * boundaries the cells do at every width — which is what makes "seven columns fill, no horizontal
 * scroll" survive a resize with nothing to recompute.
 */
const pct = (n: number) => `${(n / TL_DAYS) * 100}%`;
/** the lane's vertical step — a chip's box plus the gap between two of them */
const LANE_STEP = 27;

const laneTop = (lane: number) => lane * LANE_STEP;

const Chip: React.FC<{
  it: TimelineItem;
  selected: boolean;
  onPick: () => void;
  drag?: { onStart: (e: React.DragEvent) => void; onEnd: () => void };
}> = ({ it, selected, onPick, drag }) => (
  <button
    type="button"
    className={`tl-chip${selected ? " sel" : ""}${it.struck ? " struck" : ""}${drag ? " grab" : ""}`}
    data-kind={it.kind}
    {...(it.dir ? { "data-dir": it.dir } : {})}
    style={{
      left: `calc(${pct(it.idx)} + 4px)`,
      /* the chip runs to the column before the next occupant of its own lane — the room that is
         actually free, rather than all the width there is (which is what the ref gives it) */
      maxWidth: `calc(${pct(it.spanTo - it.idx + 1)} - 8px)`,
      top: laneTop(it.lane),
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

const Band: React.FC<{ b: TimelineBand; selected: boolean; onPick: () => void }> = ({ b, selected, onPick }) => (
  <button
    type="button"
    className={`tl-band${selected ? " sel" : ""}${b.openLeft ? " openl" : ""}${b.openRight ? " openr" : ""}${b.passed ? " passed" : ""}`}
    style={{
      left: `calc(${pct(b.fromIdx)} + 4px)`,
      width: `calc(${pct(b.toIdx - b.fromIdx + 1)} - 8px)`,
      top: laneTop(b.lane),
    }}
    onClick={onPick}
  >
    <span className="d" aria-hidden />
    <span className="tl-lbl">{b.label}</span>
  </button>
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
  /* ⚠️ SELECTING IS FREE — nothing is written and nothing opens. The ring is the whole of it here;
     the workspace it fills arrives in Phase 4. */
  const [sel, setSel] = useState<string | null>(null);
  const pageRef = React.useRef<HTMLDivElement>(null);


  const assembled = useMemo(
    () => assembleBoardColumns({
      tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, today, now,
      mutedTaskRules: currentUser?.mutedTaskRules,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, currentUser?.mutedTaskRules],
  );

  const visible = useMemo(() => windowDays(winStart, TL_DAYS), [winStart]);

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
      if (e.key === "ArrowLeft") { e.preventDefault(); setWinStart((s) => shiftWindow(s, TL_DAYS, -1)); }
      else if (e.key === "ArrowRight") { e.preventDefault(); setWinStart((s) => shiftWindow(s, TL_DAYS, 1)); }
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

  const { rows, bands } = useMemo(
    () => timelineWeek({ queries, agents, today, itemsFor, recordFor, ghostsOn }, winStart, TL_DAYS, view),
    [queries, agents, today, itemsFor, recordFor, ghostsOn, winStart, view],
  );
  const bandsByRow = useMemo(() => {
    const m = new Map<string, TimelineBand[]>();
    for (const b of bands) m.set(b.rowKey, [...(m.get(b.rowKey) ?? []), b]);
    return m;
  }, [bands]);

  /* ⚠️ THE COUNT STATES WHAT IS ON SCREEN, never a total the filters have stopped describing. */
  const shown = rows.reduce((n, r) => n + r.items.length, 0) + bands.length;
  const agentRows = rows.filter((r) => r.key !== YOU_ROW).length;

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
    /* ⚠️ NO DOCK CURSOR HERE. `/todo` advances to the next card in its dock; a calendar day is not
       a queue, so a completed card simply leaves the day and the pane closes with it. */
    advance: () => setPaneCard(null),
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
   * ⚠️ ESCAPE CLOSES THE PANE, AND ONLY WHILE IT IS OPEN. It is captured so it does not also reach
   * the page beneath — a day expansion or a peek would otherwise close at the same time, and the
   * writer pressed once. `FocusFlow` keeps its own handler; the two are mutually exclusive, since
   * the pane closes itself before handing a card over.
   */
  React.useEffect(() => {
    if (!paneCard) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      setPaneCard(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [paneCard]);


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

  const openSheet = (card?: BoardCard) => { if (card) setPaneCard(card); };

  const subtitle = `${shortCalDate(visible[0])} – ${shortCalDate(visible[visible.length - 1])} — every relationship, and the time between.`;

  const setView1 = <K extends keyof TimelineView>(k: K, v: TimelineView[K]) =>
    setView((cur) => ({ ...cur, [k]: v }));
  const toggleKind = (k: TimelineFilter) =>
    setView((cur) => ({
      ...cur,
      kinds: cur.kinds.includes(k) ? cur.kinds.filter((x) => x !== k) : [...cur.kinds, k],
    }));

  const row = (r: TimelineRow) => {
    const rowBands = bandsByRow.get(r.key) ?? [];
    const lanes = Math.max(1, r.lanes);
    return (
      <div
        key={r.key}
        className={`tl-grid tl-row${r.key === YOU_ROW ? " tl-row--pin" : ""}${r.closed ? " closed" : ""}`}
        style={{ minHeight: lanes * LANE_STEP + 18 }}
      >
        <div className="tl-rowhead" style={{ gridColumn: 1 }}>
          <span className="tl-nm">
            <i className="tl-sd" data-dot={r.dot} aria-hidden />
            <span className="tl-nmtxt">{r.name}</span>
          </span>
          {r.agency && <span className="tl-ag">{r.agency}</span>}
        </div>
        {/* ⚠️ EVERY PARTICIPANT NAMES ITS OWN COLUMN. Auto-placement never overlaps: an auto-placed
            cell beside the explicitly placed lane would be pushed into an implicit new column and
            the grid would silently grow sideways — measured at 688px of phantom right margin the
            last time this page mixed the two. */}
        {visible.map((ymd, i) => (
          <div
            key={ymd}
            className={`tl-cell${ymd === today ? " today" : ""}${ymd < today ? " past" : ""}${dropYmd === ymd ? " dropok" : ""}`}
            style={{ gridColumn: i + 2, gridRow: 1 }}
            onDragOver={dragTask && ymd !== dragTask.from ? (e) => { e.preventDefault(); setDropYmd(ymd); } : undefined}
            onDragLeave={dropYmd === ymd ? () => setDropYmd(null) : undefined}
            onDrop={(e) => { e.preventDefault(); dropOn(ymd); }}
          />
        ))}
        <div className="tl-lane">
          {r.items.length + rowBands.length === 0 && (
            <span className="tl-quiet">Nothing this week</span>
          )}
          {rowBands.map((b) => (
            <Band key={b.key} b={b} selected={sel === b.key}
              onPick={() => setSel((c) => (c === b.key ? null : b.key))} />
          ))}
          {r.items.map((it) => (
            <Chip
              key={it.key}
              it={it}
              selected={sel === it.key}
              onPick={() => setSel((c) => (c === it.key ? null : it.key))}
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

  return (
    <div className="t-f12 spine-root" ref={pageRef}>
      <div className="tdb-wrap today-off">
        <TasksPageLayout
          title="Calendar"
          mark="calendar"
          subtitle={subtitle}
          tools={
            <>
              <button type="button" className="cal-nav calm-nav" aria-label="Previous week"
                onClick={() => setWinStart((s) => shiftWindow(s, TL_DAYS, -1))}>
                <ChevronLeft size={14} aria-hidden />
              </button>
              <button type="button" className="cal-nav calm-nav cal-today"
                onClick={() => setWinStart(today)}>Today</button>
              <button type="button" className="cal-nav calm-nav" aria-label="Next week"
                onClick={() => setWinStart((s) => shiftWindow(s, TL_DAYS, 1))}>
                <ChevronRight size={14} aria-hidden />
              </button>
              <TplGrow />
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
          {/* ⚠️ THE FILTERS SIT ABOVE THE BOARD, NOT IN THE TOOL ROW. The tool row is navigation —
              which week, and the creation action; this is what the board is showing. */}
          <div className="tl-bar">
            <div className="tl-kinds" role="group" aria-label="Kinds">
              {TIMELINE_FILTERS.map((k) => (
                <button key={k} type="button" className="tl-kind"
                  data-on={view.kinds.includes(k)} aria-pressed={view.kinds.includes(k)}
                  onClick={() => toggleKind(k)}>
                  {FILTER_LABEL[k]}
                </button>
              ))}
              {/* ⚠️ THE RESET RESTORES FROM THE LIST, never a hand-written literal — a literal
                  silently misses the facet added the day after it was typed. */}
              {view.kinds.length !== TIMELINE_FILTERS.length && (
                <button type="button" className="tl-kind" onClick={() => setView1("kinds", allFilters())}>
                  Show every kind
                </button>
              )}
            </div>
            <Menu<ShowMode> label="Which rows" value={view.show} options={SHOW_ORDER}
              labels={SHOW_LABEL} onPick={(v) => setView1("show", v)} />
            <Menu<RowSort> label="Sort" value={view.sort} options={SORT_ORDER}
              labels={SORT_LABEL} onPick={(v) => setView1("sort", v)} />
            <input
              className="tl-search" type="search" value={view.search}
              aria-label="Search agents, agencies and tasks"
              placeholder="Search…"
              onChange={(e) => setView1("search", e.target.value)}
            />
            <span className="tl-count">
              {agentRows} {agentRows === 1 ? "row" : "rows"} · {shown} {shown === 1 ? "item" : "items"}
            </span>
          </div>

          <div className="tl-board">
            <TplZone className="tl-zone" hem={false} label="The week">
              <div className="tl">
                <div className="tl-grid tl-head">
                  <div className="tl-corner" style={{ gridColumn: 1, gridRow: 1 }}>Agents &amp; you</div>
                  {visible.map((ymd, i) => (
                    <div key={ymd} className={`tl-dh${ymd === today ? " today" : ""}`}
                      style={{ gridColumn: i + 2, gridRow: 1 }}>
                      <span className="tl-dw">{DOW[new Date(`${ymd}T12:00:00`).getDay()]}</span>
                      <span className="tl-dd">{Number(ymd.slice(8))}</span>
                    </div>
                  ))}
                </div>
                {rows.map(row)}
              </div>
              {/* ⚠️ AN EMPTY BOARD IS NOT A FAILURE STATE. No apology, no prompt to do more — a
                  writer with a quiet week is entitled to read that as good news, or as nothing. */}
              {rows.length === 1 && rows[0].items.length === 0 && bands.length === 0 && (
                <div className="tl-none">
                  <p className="tl-none-t">A quiet week.</p>
                  <p className="tl-none-s">Nothing scheduled · nothing waiting</p>
                </div>
              )}
            </TplZone>
          </div>
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

      {/**
        * ⚠️ THE PANE'S WINDOW — scrim, one lifted card, its own scroll region, and it closes on
        * ESCAPE AND THE × ONLY. Scrim-click is deliberately not a close: the pane holds answers the
        * writer has typed, and a stray click on the ground is not a decision to discard them.
        */}
      {paneCard && (
        <div className="cal-panescrim" role="presentation">
          <div className="cal-panewin" role="dialog" aria-modal="true" aria-label="Task"
               ref={paneRef} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="cal-panex" aria-label="Close" onClick={() => setPaneCard(null)}>×</button>
            <div className="cal-panescroll">
              {paneSession.journey && (
                <TaskPane journey={paneSession.journey} onPrimary={paneSession.onPrimary} />
              )}
            </div>
          </div>
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
