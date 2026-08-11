/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TodoCalendarPage — /todo/calendar (tasks-pages pack, Phase 3; ref design-refs/tasks-pages.html,
 * the CALENDAR frame).
 *
 * ⚠️ THE PAGE IS A PROJECTION OF THE SAME DERIVATION EVERY TASKS SURFACE READS — one
 * assembleBoardColumns, its cards placed on their action dates by the pure todoCalendar layer.
 * Nothing here is stored: roll-forward is the clock answering differently tomorrow, completed
 * days are the activity log re-read, and the FILTERS narrow the same live cards the board
 * narrows. The pip tones are todoFamily's CAL_PIP — the one colour module — and the legend
 * renders FROM it.
 *
 * ⚠️ COMPLETED ITEMS SHOW UNDER "Everything" ONLY. A facet narrows to work of that kind still
 * WAITING; finished work is not waiting, and a struck pip inside "Urgent" would read as an
 * urgent item. Deliberate, stated here and in the report.
 */
import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { TasksPageLayout, TplGrow, TplZone } from "./TasksPageLayout";
import { useTagWrites } from "./useTagWrites";
import { useTodoToast } from "./useTodoToast";
import { FocusFlow } from "./FocusFlow";
import { useScriptAllyDb } from "../../lib/db";
import { localYMD } from "../../lib/shellSidebar";
import { TODO_OPEN_COMPOSER } from "../../lib/todoRoutes";
import { TodoFacetId, facetCounts, applyFacet, TODO_FACETS } from "../../lib/todoBoardSort";
import { assembleBoardColumns, liveBoardCards } from "../../lib/todoColumns";
import { BoardCard } from "../../lib/todoBoard";
import {
  CalendarItem, calendarDays, monthGridDays, weekDays, monthLabel, weekLabel,
  shiftMonth, shiftWeek, sameMonth, CAL_CELL_CAP, calFoldCap,
} from "../../lib/todoCalendar";
import { CAL_PIP, CAL_LEGEND } from "../../lib/todoFamily";
import { tagUsageCounts, toggleTagSel, matchesTags } from "../../lib/todoTags";
import "./tasksLayout.css";
import "./taskChrome.css";
import "./todoCalendar.css";

export interface TodoCalendarPageProps {
  onNavigate: (tab: string, subPageName?: string) => void;
  onNavigatePath?: (p: string) => void;
}

const DOW = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export const TodoCalendarPage: React.FC<TodoCalendarPageProps> = ({ onNavigatePath = () => {} }) => {
  const {
    tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, currentUser,
  } = useScriptAllyDb();
  const now = Date.now();
  const today = localYMD(now);
  /* board-optimise P2 — the page gained tag CREATION (the sidebar's ＋ New tag row), so it needs
     a failure surface: the same toast every other Tasks page uses, never a silent catch. */
  const { toast, flash, dismiss, pause, resume } = useTodoToast();
  const { createTagDef } = useTagWrites(flash);
  const [facet, setFacet] = useState<TodoFacetId>("all");
  const [tagSel, setTagSel] = useState<string[]>([]); // tasks-pages P5 — additive with FILTERS
  const [view, setView] = useState<"month" | "week">("month");
  /* ⚠️ THE FOLD THRESHOLD IS MEASURED, NOT GUESSED (tasks-viewport P3). The grid resolves its own
     row height from whatever the frame leaves it, so the only honest source for "how many pips
     fit" is the grid itself. A ResizeObserver keeps it true through window resizes and through
     the month↔week switch; before the first measure `calFoldCap(0)` returns the old flat cap, so
     nothing renders emptier while it settles. */
  const gridRef = React.useRef<HTMLDivElement>(null);
  const [rowPx, setRowPx] = useState(0);
  React.useEffect(() => {
    const el = gridRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      const rows = view === "month" ? 6 : 1;
      /* the grid's height less the day-name row, divided by the week rows it holds */
      const first = el.firstElementChild as HTMLElement | null;
      const dow = first?.offsetHeight ?? 0;
      setRowPx(Math.max(0, (el.clientHeight - dow) / rows));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [view]);
  const cellCap = calFoldCap(rowPx);
  const [viewOpen, setViewOpen] = useState(false);
  const [facetOpen, setFacetOpen] = useState(false);
  const [anchor, setAnchor] = useState(today);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [flowCard, setFlowCard] = useState<BoardCard | null>(null);

  const assembled = useMemo(
    () => assembleBoardColumns({
      tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, today, now,
      mutedTaskRules: currentUser?.mutedTaskRules,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, currentUser?.mutedTaskRules],
  );

  const visible = view === "month" ? monthGridDays(anchor) : weekDays(anchor);

  /* FILTERS narrow the LIVE cards exactly as the board narrows its columns; completed items ride
     only the unfiltered view (see the head note). Tag selection joins here in Phase 5. */
  const byDay = useMemo(() => {
    const narrow = (cards: BoardCard[]) =>
      applyFacet(cards, facet).filter((c) => matchesTags(c.tags, tagSel));
    const cols = {
      todo: narrow(assembled.cols.todo),
      today: narrow(assembled.cols.today),
      snoozed: narrow(assembled.cols.snoozed),
      done: assembled.cols.done,
    };
    return calendarDays({
      cols, flags: taskFlags, queries, agents,
      userTasks: facet === "all" ? userTasks : [],
      activities: facet === "all" ? activities : [],
      today, nowMs: now,
    }, visible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assembled, facet, tagSel, taskFlags, queries, agents, userTasks, activities, today, visible.join("|")]);

  /* ⚠️ THE COUNTS ARE THE ONE DERIVATION'S (tasks-viewport P3) — the same `facetCounts` over the
     same `liveBoardCards(assembled.cols)` the sidebar fed, so the Calendar's control cannot state
     a different number from the board's for the same facet. */
  const facetTotals = facetCounts(liveBoardCards(assembled.cols));

  const subtitle = view === "month"
    ? `${monthLabel(anchor)} — every item on the day it needs you.`
    : `${weekLabel(anchor)} — every item on the day it needs you.`;

  const openSheet = (item: CalendarItem) => {
    if (item.card) { setOpenDay(null); setFlowCard(item.card); }
  };

  const dayData = (ymd: string) => byDay.get(ymd) ?? { items: [], rolled: 0 };

  return (
    <div className="t-f12 spine-root">
      <div className="tdb-wrap today-off">
        <TasksPageLayout
          title="Calendar"
          mark="calendar"
          subtitle={subtitle}
          tools={
            <>
              <button type="button" className="cal-nav" aria-label="Previous" onClick={() => setAnchor(view === "month" ? shiftMonth(anchor, -1) : shiftWeek(anchor, -1))}><ChevronLeft size={14} aria-hidden /></button>
              <button type="button" className="cal-nav cal-today" onClick={() => setAnchor(today)}>Today</button>
              <button type="button" className="cal-nav" aria-label="Next" onClick={() => setAnchor(view === "month" ? shiftMonth(anchor, 1) : shiftWeek(anchor, 1))}><ChevronRight size={14} aria-hidden /></button>
              <span className="cal-viewwrap">
                <button type="button" className="cal-nav" aria-haspopup="menu" aria-expanded={viewOpen} onClick={() => setViewOpen((v) => !v)}>
                  {view === "month" ? "Month" : "Week"} ▾
                </button>
                {viewOpen && (
                  <div className="cal-viewmenu" role="menu">
                    {(["month", "week"] as const).map((v) => (
                      <button key={v} type="button" role="menuitem" aria-current={view === v}
                        onClick={() => { setView(v); setViewOpen(false); }}>
                        {v === "month" ? "Month" : "Week"}
                      </button>
                    ))}
                  </div>
                )}
              </span>
              {/* ⚠️ THE FACET LIVES IN THE TOOL ROW NOW (tasks-viewport P3). It was the page
                  sidebar's FILTERS list; the sidebar is the To-do list's alone since P1, and
                  between P1 and here the Calendar could not be narrowed at all. Same four facets
                  from the SAME derivation the board and the badge read, in the Noteboard's
                  `#All ▾` grammar so the two pages' filters are one control with two vocabularies
                  rather than two controls. It reaches the pips, the day lists AND the day sheet,
                  because they all read `byDay`, which is derived under the facet. */}
              <span className="cal-facetwrap">
                <button type="button" className="cal-nav cal-facet" aria-haspopup="menu"
                  aria-expanded={facetOpen} onClick={() => setFacetOpen((o) => !o)}>
                  {TODO_FACETS.find((f) => f.id === facet)?.label} ▾
                </button>
                {facetOpen && (
                  <div className="cal-menu" role="menu">
                    {/* ⚠️ TODO_FACETS, never a second label list — the sidebar, the board and this
                        control all read the one definition, so they cannot come to disagree about
                        what "Urgent" means or which four exist. */}
                    {TODO_FACETS.map((f) => (
                      <button key={f.id} type="button" role="menuitem" aria-current={facet === f.id}
                        onClick={() => { setFacet(f.id); setFacetOpen(false); }}>
                        <span className="cal-facetsw" style={{ background: f.swatch }} aria-hidden />
                        {f.label}
                        <span className="cal-facetn">{facetTotals[f.id]}</span>
                      </button>
                    ))}
                  </div>
                )}
              </span>
              <TplGrow />
              {/* the pink creation action: the ONE composer lives on the To-do list page — go
                  there and announce, the bar's ＋ New pattern (never a second create surface) */}
              <button type="button" className="tdb-addb" onClick={() => {
                onNavigatePath("/todo");
                window.dispatchEvent(new CustomEvent(TODO_OPEN_COMPOSER));
              }}>
                <Plus size={13} aria-hidden /> Add task or note
              </button>
            </>
          }
        >
          <div className="cal-grid" role="grid" ref={gridRef} aria-label={view === "month" ? monthLabel(anchor) : weekLabel(anchor)}>
            {DOW.map((d) => <div key={d} className="cal-dow" role="columnheader">{d}</div>)}
            {visible.map((ymd) => {
              const { items, rolled } = dayData(ymd);
              /* ⚠️ THE FOLD RESPONDS TO THE VIEWPORT (tasks-viewport P3): the cap comes from the
                 row height the grid actually resolved to, so a short laptop folds sooner rather
                 than shearing a pip in half. */
              const overflow = Math.max(0, items.length - cellCap);
              const shown = items.slice(0, cellCap);
              const past = ymd < today;
              const off = view === "month" && !sameMonth(ymd, anchor);
              return (
                <div
                  key={ymd}
                  role="gridcell"
                  className={`cal-cell${ymd === today ? " today" : ""}${past ? " past" : ""}${off ? " off" : ""}`}
                  onClick={() => items.length > 0 && setOpenDay(ymd)}
                >
                  <div className="cal-d">
                    {Number(ymd.slice(8))}
                    {items.length > 0 && <span className="cal-c2">{items.length}</span>}
                  </div>
                  {shown.map((it) => (
                    <button
                      key={it.key}
                      type="button"
                      className={`cal-pip${it.struck ? " struck" : ""}${it.card ? "" : " inert"}`}
                      style={{ background: CAL_PIP[it.family].bg, color: CAL_PIP[it.family].tx, borderColor: CAL_PIP[it.family].bd }}
                      title={it.label}
                      onClick={(e) => { e.stopPropagation(); it.card ? openSheet(it) : setOpenDay(ymd); }}
                    >
                      {it.label}
                    </button>
                  ))}
                  {overflow > 0 && <div className="cal-more2">+{overflow} MORE</div>}
                  {rolled > 0 && <span className="cal-rolled">{rolled} ROLLED FORWARD ↗</span>}
                </div>
              );
            })}
          </div>

          {/* the legend renders FROM the one map — never a second list */}
          <div className="cal-legend" aria-hidden>
            {CAL_LEGEND.map((l) => (
              <span key={l.family}>
                <i style={{ background: CAL_PIP[l.family].bg, borderColor: CAL_PIP[l.family].bd }} />
                {l.label}
              </span>
            ))}
          </div>
        </TasksPageLayout>
      </div>

      {/* the day's list — click a day, read its items, open one */}
      {openDay && (
        <div className="cal-dayscrim" onClick={() => setOpenDay(null)}>
          <div className="cal-daypanel" role="dialog" aria-label={openDay} onClick={(e) => e.stopPropagation()}>
            <div className="cal-dayhead">
              {new Date(openDay).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
              <button type="button" className="cal-dayx" aria-label="Close" onClick={() => setOpenDay(null)}>✕</button>
            </div>
            {dayData(openDay).items.map((it) => (
              <button key={it.key} type="button" className={`cal-dayrow${it.struck ? " struck" : ""}`} disabled={!it.card} onClick={() => openSheet(it)}>
                <i style={{ background: CAL_PIP[it.family].bg, borderColor: CAL_PIP[it.family].bd }} aria-hidden />
                {it.label}
              </button>
            ))}
          </div>
        </div>
      )}

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

      {/* the item sheet — the same FocusFlow surface every other To-do entrance opens */}
      {flowCard && (
        <FocusFlow
          items={[{ kind: "card", card: flowCard }]}
          onClose={() => setFlowCard(null)}
          onNavigate={() => {}}
          onToast={() => {}}
        />
      )}
    </div>
  );
};
