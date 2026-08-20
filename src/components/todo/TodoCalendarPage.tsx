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
  CalendarItem, calendarDays, monthGridDays, monthLabel,
  shiftMonth, sameMonth, CAL_CELL_CAP, calFoldCap,
  RecordItem, recordDays, cellSlots, exchangeLine, REC_TONE, REC_LEGEND, REC_INK,
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

/* ══ THE IN-FOCUS DAY PANEL (record-layer pack, Phase 5) ════════════════════════════════════
 *
 * ⚠️ GROUPED BY VOICE, NOT BY CLOCK. These events carry DATES, not times — an activity is stamped
 * with the day it happened and nothing finer — so a chronological list would impose an order the
 * data does not have, and would do it convincingly. The sections answer "whose move is it" instead,
 * which is a question the data can actually answer.
 *
 * ⚠️ LIVE WORK FIRST, THE RECORD LAST. The panel reads top-down as: what is yours, what is coming
 * back, what is finished, what happened. A writer opening a day wants the first of those.
 */
interface CalDayPanelProps {
  ymd: string;
  today: string;
  items: CalendarItem[];
  recs: RecordItem[];
  manuscripts: { id: string; title: string }[];
  openRec: string | null;
  onToggleRec: (key: string) => void;
  onOpenCard: (item: CalendarItem) => void;
  onOpenQuery: (queryId: string) => void;
  onCompose: () => void;
}

const CalDayPanel: React.FC<CalDayPanelProps> = ({
  ymd, today, items, recs, manuscripts, openRec, onToggleRec, onOpenCard, onOpenQuery, onCompose,
}) => {
  const d = new Date(`${ymd}T12:00:00`);
  const weekday = d.toLocaleDateString("en-GB", { weekday: "long" });
  const dateLine = d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });

  /* the sections, derived from the families the grid already placed — never a second grouping rule */
  const yours = items.filter((i) => i.family === "agent" || i.family === "task");
  const back = items.filter((i) => i.family === "snoozed");
  const done = items.filter((i) => i.family === "done");
  const total = items.length + recs.length;

  /* ⚠️ THE COUNT LINE STATES WHAT IS THERE, and says nothing when there is nothing. "0 ITEMS" on a
     free day is a tally nobody asked for; the empty state below speaks for that case instead. */
  const countLine = total === 0 ? "" : [
    `${total} ITEM${total === 1 ? "" : "S"}`,
    yours.length ? `${yours.length} YOURS` : "",
    recs.length ? `${recs.length} ON THE RECORD` : "",
  ].filter(Boolean).join(" · ");

  const section = (title: string, rows: React.ReactNode[]) =>
    rows.length === 0 ? null : (
      <div className="cal-fpsec">
        <div className="cal-fpsech"><span>{title}</span><i aria-hidden /></div>
        {rows}
      </div>
    );

  const liveRow = (it: CalendarItem, extra = "") => (
    <button
      key={it.key}
      type="button"
      className={`cal-fprow${extra}${it.struck ? " struck" : ""}`}
      disabled={!it.card}
      onClick={() => onOpenCard(it)}
    >
      <i className="cal-fpdot" style={{ background: CAL_PIP[it.family].bg, borderColor: CAL_PIP[it.family].bd }} aria-hidden />
      <span className="cal-fptxt">{it.label}</span>
    </button>
  );

  const msTitle = (id: string) => manuscripts.find((m) => m.id === id)?.title ?? "";

  return (
    <aside className="cal-focus" aria-label={`${weekday} ${dateLine}`}>
      <div className="cal-fphead">
        <div className="cal-fpwk">
          {weekday}
          {ymd === today && <span className="cal-fptoday">TODAY</span>}
        </div>
        <div className="cal-fpdate">{dateLine}</div>
        {countLine && <div className="cal-fpcount">{countLine}</div>}
      </div>

      <div className="cal-fpbody">
        {total === 0 ? (
          /* ⚠️ AN EMPTY DAY IS NOT A FAILURE STATE. No apology, no prompt to do more — a writer
             with a clear day is entitled to read that as good news, or as nothing at all. */
          <div className="cal-fpempty">
            <p className="cal-fpempty-t">A clear day.</p>
            <p className="cal-fpempty-s">Nothing scheduled · nothing waiting</p>
          </div>
        ) : (
          <>
            {/* ⚠️ "Yours" — the pack named this section with a phrase the To-do session retired
                repo-wide, and `todoWorkbench.test.ts` greps all of `src/` for it ("THE RENAME…zero
                matches"). A pack does not overturn a recorded decision, and the lock reads RAW
                source, so the phrase cannot even be quoted in this comment to explain itself. The
                heading takes the panel's own word instead: the count line already reads "N YOURS",
                and this section holds exactly that — query-derived actions and the writer's own
                tasks. Flagged for Nick. */}
            {section("Yours", yours.map((it) => liveRow(it)))}
            {section("Coming back", back.map((it) => liveRow(it, " prov")))}
            {section("Done", done.map((it) => liveRow(it)))}
            {section("On the record", recs.map((r) => {
              const open = openRec === r.key;
              const title = msTitle(r.manuscriptId);
              return (
                <div key={r.key} className={`cal-recrow${open ? " open" : ""}`}>
                  <button
                    type="button"
                    className="cal-recmain"
                    aria-expanded={open}
                    onClick={() => onToggleRec(r.key)}
                  >
                    <i className="cal-recdot" style={{ background: REC_TONE[r.dir].dot }} aria-hidden />
                    <span className="cal-recname">
                      {r.label}
                      {r.agent && <span className="cal-recwho"> · {r.agent}</span>}
                    </span>
                    <span className="cal-recchev" aria-hidden>{open ? "▾" : "▸"}</span>
                  </button>
                  {open && (
                    <div className="cal-recdet">
                      <dl className="cal-recgrid">
                        {r.agent && (<><dt>Agent</dt><dd>{r.agent}{r.agency && <span className="cal-recmuted"> · {r.agency}</span>}</dd></>)}
                        {title && (<><dt>Manuscript</dt><dd>{title}</dd></>)}
                        {r.detail && (<><dt>What went</dt><dd>{r.detail}</dd></>)}
                        <dt>Timeline</dt><dd>{exchangeLine(r)}</dd>
                        <dt>Record</dt><dd>{new Date(`${r.ymd}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</dd>
                      </dl>
                      {r.note && <p className="cal-recnote">{r.note}</p>}
                      <div className="cal-recacts">
                        <button type="button" className="cal-recbtn2" onClick={() => onOpenQuery(r.queryId)}>
                          OPEN QUERY
                        </button>
                        {/* ⚠️ THE CORRECTION UI IS UNREACHABLE, so this ROUTES rather than editing
                            here (record-layer Step 0, flag 2). `TimelineComposer` holds the only
                            `editActivity` call in a component and has NO importer anywhere in the
                            repo — Queries.tsx:5388 claims it "survives for the dashboard's own
                            flows"; there are none. A calendar-local editor is fenced out and would
                            be a second correction surface besides. The reading pane is where the
                            entry lives, so that is where the writer is sent. */}
                        <button type="button" className="cal-recbtn2" onClick={() => onOpenQuery(r.queryId)}>
                          EDIT THIS ENTRY
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            }))}
          </>
        )}
      </div>

      {/* ⚠️ NO COMPOSER HERE — one composer, on the To-do list page. This is a door to it, in the
          same navigate-and-announce pattern the tool row's ＋ already uses. */}
      <div className="cal-fpfoot">
        <span>Tasks and notes are added on the To-do list.</span>
        <button type="button" className="cal-fpfootb" onClick={onCompose}>Open the list</button>
      </div>
    </aside>
  );
};

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
  /* ⚠️ THE WEEK VIEW IS RETIRED (record-layer P6). A week of seven cells showed the same items the
     month already showed, in more space and with less context — and the record layer sharpened the
     point: "what happened in August" is the question this page answers, and a week cannot answer
     it. `weekDays`, `weekLabel` and `shiftWeek` went with it, traced to zero remaining callers
     first. (The `weekLabel` in the dashboard files is a different, local symbol.) There was never
     a List view to delete. */
  /* ⚠️ THE RECORD'S TOGGLE IS THE PAGE'S OWN STATE, AND DELIBERATELY NOT A FACET (record-layer P4).
     `TODO_FACETS` is ONE vocabulary shared with the board and the sidebar badge; the board has no
     history, so a fifth facet would leak a calendar-only concept into a control two other surfaces
     read. Session-only and default on: the record is what the page gained, so it shows by default,
     and a preference stored for a view toggle is a preference nobody asked to keep. */
  const [showRecord, setShowRecord] = useState(true);
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
      /* the month grid is always six week rows */
      const rows = 6;
      /* the grid's height less the day-name row, divided by the week rows it holds */
      const first = el.firstElementChild as HTMLElement | null;
      const dow = first?.offsetHeight ?? 0;
      setRowPx(Math.max(0, (el.clientHeight - dow) / rows));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const cellCap = calFoldCap(rowPx);

  const [facetOpen, setFacetOpen] = useState(false);
  const [anchor, setAnchor] = useState(today);
  /* ⚠️ THE DAY PANEL REPLACES THE MODAL (record-layer P5). A day is now SELECTED rather than
     opened: the panel is permanent chrome beside the grid, so there is no dialogue to dismiss and
     no scrim between the writer and the month. `selDay` therefore always holds a day — today until
     they choose another — where `openDay` held null for "closed". */
  const [selDay, setSelDay] = useState<string>(today);
  /* which record row is expanded, if any. Cleared whenever the day changes — an expansion belongs
     to the entry the writer opened, not to the position it occupied in some other day's list. */
  const [openRec, setOpenRec] = useState<string | null>(null);
  const selectDay = (ymd: string) => { setSelDay(ymd); setOpenRec(null); };
  const [flowCard, setFlowCard] = useState<BoardCard | null>(null);

  const assembled = useMemo(
    () => assembleBoardColumns({
      tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, today, now,
      mutedTaskRules: currentUser?.mutedTaskRules,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, currentUser?.mutedTaskRules],
  );

  const visible = monthGridDays(anchor);
  /* ⚠️ THE KEYBOARD MOVES THE SELECTION, AND IT KEEPS THE MONTH IN STEP. Arrowing off the edge of
     the visible grid re-anchors the month, so the selected day is never one the writer cannot see —
     the state and the view cannot drift apart.
     ⚠️ INERT WHILE TYPING, like every other Tasks shortcut: a bare `T` reaching the page from
     inside the tag composer would jump the month mid-word. */
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (el?.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const step = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1
        : e.key === "ArrowUp" ? -7 : e.key === "ArrowDown" ? 7 : 0;
      if (step !== 0) {
        e.preventDefault();
        const d = new Date(`${selDay}T12:00:00`);
        d.setDate(d.getDate() + step);
        const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        setSelDay(next);
        setOpenRec(null);
        if (!visible.includes(next)) setAnchor(next);
        return;
      }
      if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        setSelDay(today);
        setOpenRec(null);
        setAnchor(today);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selDay, today, visible.join("|")]);

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

  /* ⚠️ THE RECORD IS A SECOND, INDEPENDENT DERIVATION OVER THE SAME VISIBLE DAYS (record-layer P2).
     It reads `activities` — already loaded unwindowed by the db provider — so the whole layer costs
     one pass over an array in memory: no new query, no new hook, no stored field. It is deliberately
     NOT narrowed by the facet: FILTERS narrow live WORK ("show me only what is urgent"), and there
     is no urgent history — a facet reaching the record would quietly answer a question about the
     past with a rule written for the present. The one control that governs it is THE RECORD. */
  const recByDay = useMemo(
    () => recordDays(activities, queries, agents, visible),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activities, queries, agents, visible.join("|")],
  );

  const subtitle = `${monthLabel(anchor)} — every item on the day it needs you.`;

  const openSheet = (item: CalendarItem) => {
    if (item.card) setFlowCard(item.card);
  };

  const dayData = (ymd: string) => byDay.get(ymd) ?? { items: [], rolled: 0 };
  const recordFor = (ymd: string): RecordItem[] => (showRecord ? recByDay.get(ymd) ?? [] : []);

  return (
    <div className="t-f12 spine-root">
      <div className="tdb-wrap today-off">
        <TasksPageLayout
          title="Calendar"
          mark="calendar"
          subtitle={subtitle}
          tools={
            <>
              <button type="button" className="cal-nav" aria-label="Previous" onClick={() => setAnchor(shiftMonth(anchor, -1))}><ChevronLeft size={14} aria-hidden /></button>
              <button type="button" className="cal-nav cal-today" onClick={() => setAnchor(today)}>Today</button>
              <button type="button" className="cal-nav" aria-label="Next" onClick={() => setAnchor(shiftMonth(anchor, 1))}><ChevronRight size={14} aria-hidden /></button>

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
              {/* ⚠️ THE RECORD'S CONTROL STANDS APART FROM THE FACETS, AND THE RULE BETWEEN THEM IS
                  THE POINT (record-layer P4). `TODO_FACETS` is ONE vocabulary shared with the board
                  and the sidebar badge — a fifth entry there would leak a calendar-only concept into
                  a control two other surfaces read, and the board has no history for it to mean
                  anything about. So this is a separate switch for a separate layer, and the
                  separator says so before anyone has to read a tooltip. */}
              <span className="cal-sep" aria-hidden />
              <button
                type="button"
                className="cal-nav cal-recbtn"
                aria-pressed={showRecord}
                onClick={() => setShowRecord((v) => !v)}
              >
                <span className="cal-recsw" style={{ background: REC_TONE.out.dot }} aria-hidden />
                The record
              </button>
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
          {/* ⚠️ THE PANEL LIVES INSIDE THE CHASSIS — no fork of TasksPageLayout (record-layer P5).
              `children` lands in `.tpl-body`, already a flex column carrying the min-height:0
              chain, so the two-column split is this page's own box inside it. `TplZone` is not
              used here and never was: the month COMPRESSES to the frame rather than scrolling
              (tasks-viewport P1/P3), and only the panel has a scroller of its own. */}
          <div className="cal-layout">
          <div className="cal-main">
          <div className="cal-grid" role="grid" ref={gridRef} aria-label={monthLabel(anchor)}>
            {DOW.map((d) => <div key={d} className="cal-dow" role="columnheader">{d}</div>)}
            {visible.map((ymd) => {
              const { items, rolled } = dayData(ymd);
              const recs = recordFor(ymd);
              /* ⚠️ THE FOLD RESPONDS TO THE VIEWPORT (tasks-viewport P3): the cap comes from the
                 row height the grid actually resolved to, so a short laptop folds sooner rather
                 than shearing a pip in half.
                 ⚠️ THE RECORD FOLDS WITH EVERYTHING ELSE (record-layer P3), and the arithmetic is
                 `cellSlots` rather than three expressions here — a rule this easy to get subtly
                 wrong belongs somewhere a test can call it. `calFoldCap` is untouched. */
              const { shownItems: shown, shownRecs, overflow } = cellSlots(items, recs, cellCap);
              const past = ymd < today;
              const off = !sameMonth(ymd, anchor);
              return (
                <div
                  key={ymd}
                  role="gridcell"
                  className={`cal-cell${ymd === today ? " today" : ""}${ymd === selDay ? " sel" : ""}${past ? " past" : ""}${off ? " off" : ""}`}
                  onClick={() => selectDay(ymd)}
                >
                  <div className="cal-d">
                    {Number(ymd.slice(8))}
                    {items.length + recs.length > 0 && <span className="cal-c2">{items.length + recs.length}</span>}
                  </div>
                  {shown.map((it) => (
                    <button
                      key={it.key}
                      type="button"
                      className={`cal-pip${it.struck ? " struck" : ""}${it.card ? "" : " inert"}`}
                      style={{ background: CAL_PIP[it.family].bg, color: CAL_PIP[it.family].tx, borderColor: CAL_PIP[it.family].bd }}
                      title={it.label}
                      onClick={(e) => { e.stopPropagation(); it.card ? openSheet(it) : selectDay(ymd); }}
                    >
                      {it.label}
                    </button>
                  ))}
                  {/* ⚠️ THE RECORD SITS UNDER THE LIVE WORK, AND WEARS THE SAME BOX. It reuses
                      `.cal-pip` geometry deliberately: `CAL_PIP_H` is the fold's unit, so a record
                      pip of a different height would make the measured cap describe a cell it does
                      not fit. Only the paint differs — no fill, no border, a dot and muted ink. */}
                  {shownRecs.map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      className="cal-pip cal-rec"
                      title={r.agent ? `${r.label} · ${r.agent}` : r.label}
                      onClick={(e) => { e.stopPropagation(); selectDay(ymd); }}
                    >
                      <span className="cal-recdot" style={{ background: REC_TONE[r.dir].dot }} aria-hidden />
                      {r.label}
                    </button>
                  ))}
                  {overflow > 0 && <div className="cal-more2">+{overflow} MORE</div>}
                  {rolled > 0 && <span className="cal-rolled">{rolled} ROLLED FORWARD ↗</span>}
                </div>
              );
            })}
          </div>

          {/* ⚠️ THE LEGEND RENDERS FROM THE RECORDS — never a second list. It reads TWO now, each
              owning the layer it describes: CAL_LEGEND for the live families, REC_LEGEND for the
              record. The rule that matters is unchanged — no label or tone is written here. */}
          <div className="cal-legend" aria-hidden>
            {CAL_LEGEND.map((l) => (
              <span key={l.family}>
                <i style={{ background: CAL_PIP[l.family].bg, borderColor: CAL_PIP[l.family].bd }} />
                {l.label}
              </span>
            ))}
            {showRecord && REC_LEGEND.map((l) => (
              <span key={l.dir}>
                <i className="cal-legdot" style={{ background: REC_TONE[l.dir].dot }} />
                {l.label}
              </span>
            ))}
          </div>
          </div>
          <CalDayPanel
            ymd={selDay}
            today={today}
            items={dayData(selDay).items}
            recs={recordFor(selDay)}
            manuscripts={manuscripts}
            openRec={openRec}
            onToggleRec={(k) => setOpenRec((cur) => (cur === k ? null : k))}
            onOpenCard={openSheet}
            onOpenQuery={(queryId) => onNavigatePath(`/queries?q=${encodeURIComponent(queryId)}`)}
            onCompose={() => {
              onNavigatePath("/todo");
              window.dispatchEvent(new CustomEvent(TODO_OPEN_COMPOSER));
            }}
          />
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
