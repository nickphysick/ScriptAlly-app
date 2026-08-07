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
import { TasksPageLayout, TplGrow } from "./TasksPageLayout";
import { TodoSideContainer } from "./TodoSideContainer";
import { useTagWrites } from "./useTagWrites";
import { useTodoToast } from "./useTodoToast";
import { FocusFlow } from "./FocusFlow";
import { useScriptAllyDb } from "../../lib/db";
import { localYMD } from "../../lib/shellSidebar";
import { TODO_OPEN_TASK_SETTINGS, TODO_OPEN_COMPOSER } from "../../lib/todoRoutes";
import { TodoFacetId, facetCounts, applyFacet } from "../../lib/todoBoardSort";
import { assembleBoardColumns, liveBoardCards } from "../../lib/todoColumns";
import { BoardCard } from "../../lib/todoBoard";
import {
  CalendarItem, calendarDays, monthGridDays, weekDays, monthLabel, weekLabel,
  shiftMonth, shiftWeek, sameMonth, CAL_CELL_CAP,
} from "../../lib/todoCalendar";
import { CAL_PIP, CAL_LEGEND } from "../../lib/todoFamily";
import { tagUsageCounts, toggleTagSel, matchesTags } from "../../lib/todoTags";
import "./todoSide.css";
import "./tasksLayout.css";
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
  const [viewOpen, setViewOpen] = useState(false);
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
          sidebar={
            <TodoSideContainer
              counts={facetCounts(liveBoardCards(assembled.cols))}
              active={facet}
              onSelect={setFacet}
              onOpenTaskSettings={() => window.dispatchEvent(new CustomEvent(TODO_OPEN_TASK_SETTINGS))}
              onNoteboard={() => onNavigatePath("/todo/noteboard")}
              tags={currentUser?.tags ?? []}
              tagCounts={tagUsageCounts(userTasks)}
              selectedTags={tagSel}
              onToggleTag={(id) => setTagSel((sel) => toggleTagSel(sel, id))}
              /* board-optimise P2: ONE clear resets both narrowings — a half-reset that did not
                 say so was the fault. */
              onClearAll={() => { setFacet("all"); setTagSel([]); }}
              onCreateTag={(tag) => void createTagDef(tag)}
            />
          }
        >
          <div className="cal-grid" role="grid" aria-label={view === "month" ? monthLabel(anchor) : weekLabel(anchor)}>
            {DOW.map((d) => <div key={d} className="cal-dow" role="columnheader">{d}</div>)}
            {visible.map((ymd) => {
              const { items, rolled } = dayData(ymd);
              const overflow = Math.max(0, items.length - CAL_CELL_CAP);
              const shown = items.slice(0, CAL_CELL_CAP);
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
