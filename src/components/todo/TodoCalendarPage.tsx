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
 * ⚠️ COMPLETED ITEMS ARE GOVERNED BY THE VIEW MODE, NOT BY A FACET (finishing pack, Phases 3–4).
 * The old rule was that they showed under "Everything" only, because a facet narrows to work of
 * that kind still WAITING and a struck pip inside "Urgent" would read as an urgent item. That
 * reasoning retired with the facet control: `Done & upcoming` shows them, `Upcoming only` does
 * not, and the kind filters file them by what they were rather than withholding them wholesale.
 */
import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { TasksPageLayout, TplGrow, TplZone } from "./TasksPageLayout";
import { useTagWrites } from "./useTagWrites";
import { useTodoToast } from "./useTodoToast";
import { FocusFlow } from "./FocusFlow";
import { useScriptAllyDb } from "../../lib/db";
import { localYMD } from "../../lib/shellSidebar";
import { TODO_OPEN_COMPOSER } from "../../lib/todoRoutes";
import { assembleBoardColumns } from "../../lib/todoColumns";
import { BoardCard } from "../../lib/todoBoard";
import {
  CalendarItem, calendarDays, monthGridDays, monthLabel,
  shiftMonth, sameMonth, calFoldCap, calFoldCapFolded,
  RecordItem, recordDays, cellSlots, dedupeAgainstRecord, pillLabel,
  FoldMetrics, FOLD_FALLBACK, foldMetricsFrom, foldFor, REC_TONE, REC_LEGEND,
  peekBox, PEEK_DELAY_MS, PEEK_SCALE, PEEK_OPACITY,
  CalMode, upcomingGridDays,
  CalKind, CAL_KINDS, CAL_KIND_ORDER, allKinds, itemInKinds, recordInKinds,
  GhostItem, ghostsFor, carriedLine, draggableTask,
  ExpectedItem, expectedDays, expectedInKinds, EXPECTED_PILL, expectedLine, shortCalDate,
} from "../../lib/todoCalendar";
import { CAL_PIP, CAL_LEGEND } from "../../lib/todoFamily";
/* ⚠️ REUSED, not re-written — `shortDate` already renders "7 Aug" for the RecordingCalendar's
   anchor button, and a third date formatter is a third chance for two surfaces to disagree. */
import { shortDate } from "../../lib/recordingCalendar";
import { tagUsageCounts, toggleTagSel, matchesTags } from "../../lib/todoTags";
import { classifyWriteError, saveErrorCopy } from "../../lib/todoWrite";
import "./tasksLayout.css";
import "./taskChrome.css";
import "./todoCalendar.css";

export interface TodoCalendarPageProps {
  /** ⚠️ THE SAME SIGNATURE `ToDoPage` AND `FocusFlow` USE, deliberately (`ToDoPage.tsx:275`,
   *  `FocusFlow.tsx:132`). It was narrower here — no `opts` — which typechecks, because a function
   *  taking fewer arguments satisfies one taking more. That is exactly what makes it dangerous: a
   *  flow routing to an agent would have had its `agentId` dropped at this boundary with nothing
   *  failing. App.tsx already passes `handleNavigate`, which accepts the third argument. */
  onNavigate: (tab: string, subPageName?: string, opts?: { agentId?: string; manuscriptId?: string }) => void;
  onNavigatePath?: (p: string) => void;
}

const DOW = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

/* ══ ONE PILL RENDERER, SHARED BY THE CELL AND THE PEEK (finishing pack, Phase 2) ══════════════
 *
 * ⚠️ THE PEEK'S WHOLE PROMISE IS THAT IT SHOWS THE SAME PILLS, UNCAPPED — so it must not have its
 * own renderer. Two would agree on the day they were written and drift on the day the grammar
 * changes, and the drift would show up as the peek quietly disagreeing with the cell it grew from.
 * These were inline JSX in the cell; lifting them changes no markup.
 *
 * ⚠️ IN THE PEEK THEY ARE INERT: no click handler, `tabIndex={-1}` so tab cannot walk into a
 * surface that only exists while the pointer rests, and no `title` — a tooltip inside a tooltip.
 */
/** "MON 12 AUG" — the peek's only chrome. Built from the ymd, never from a Date the caller holds. */
const peekDayLabel = (ymd: string): string => {
  const d = new Date(`${ymd}T12:00:00`);
  return `${DOW[(d.getDay() + 6) % 7]} ${d.getDate()} ${d.toLocaleString("en-GB", { month: "short" }).toUpperCase()}`;
};

const ItemPip: React.FC<{
  it: CalendarItem;
  onPick?: () => void;
  /* ⚠️ DRAG IS OPT-IN PER MOUNT, exactly as clicking is: the CELL passes handlers, the PEEK passes
     none, so the peek's copies are inert in both senses and the draggable attribute never appears
     on a surface that cannot accept the gesture. The predicate (`draggableTask`) lives in the pure
     layer — the component only asks whether it was given the handlers. */
  drag?: { onStart: (e: React.DragEvent) => void; onEnd: () => void };
}> = ({ it, onPick, drag }) => (
  <button
    type="button"
    className={`cal-pip${it.struck ? " struck" : ""}${it.card ? "" : " inert"}${drag ? " grab" : ""}`}
    style={{ background: CAL_PIP[it.family].bg, color: CAL_PIP[it.family].tx, borderColor: CAL_PIP[it.family].bd }}
    title={onPick ? it.label : undefined}
    tabIndex={onPick ? undefined : -1}
    onClick={onPick ? (e) => { e.stopPropagation(); onPick(); } : undefined}
    draggable={drag ? true : undefined}
    onDragStart={drag?.onStart}
    onDragEnd={drag?.onEnd}
  >
    {/* ⚠️ THE GRID SUMMARISES; NOTHING UPSTREAM DOES. `pillLabel` is the only place two-word
        labels exist — the tooltip above, the day panel and FocusFlow all still read `it.label` in
        full. A writer's own task returns its own words and the cell ellipsises them. */}
    {pillLabel(it)}
  </button>
);

/* ⚠️ THE GHOST IS THE SAME PILL, DRESSED AS PROVISIONAL — dashed outline, muted ink, `↦` at the
 * tail. It reuses `pillLabel` on the LIVE item, so the two marks always read the same words; a
 * second label here would be a second summarisation of one thing.
 *
 * ⚠️ DASHED MEANS PROVISIONAL, WHICH IS THE HOUSE GRAMMAR AND IS EXACTLY RIGHT HERE: nothing
 * happened on this day. The work fell due and moved on, and the ghost says so rather than
 * asserting an event.
 *
 * ⚠️ IT IS A SIGNPOST, NOT AN ACTION SURFACE. Clicking selects TODAY — where the work actually is
 * — and focuses the live row there. It never opens a sheet and never expands: two places to act on
 * one item is how two surfaces come to disagree about its state.
 */
/** What can sit in a cell's live stack: a real item, or a carried item's origin mark. */
type Occupant =
  | { readonly t: "item"; readonly it: CalendarItem }
  | { readonly t: "exp"; readonly x: ExpectedItem }
  | { readonly t: "ghost"; readonly g: GhostItem };

/* ⚠️ SAGE-DASHED — incoming and provisional — deliberately DISTINCT from the ghosts' warm-dashed
 * (your obligation, carried). Two dashed grammars, two meanings, two hues; the legend carries
 * neither because the panel row explains each on click. No agent name on the pill. */
const ExpPip: React.FC<{ onPick?: () => void }> = ({ onPick }) => (
  <button
    type="button"
    className="cal-pip cal-exp"
    title={onPick ? EXPECTED_PILL : undefined}
    tabIndex={onPick ? undefined : -1}
    onClick={onPick ? (e) => { e.stopPropagation(); onPick(); } : undefined}
  >
    <span className="cal-expdot" aria-hidden />
    {EXPECTED_PILL}
  </button>
);

const GhostPip: React.FC<{ g: GhostItem; onPick: () => void }> = ({ g, onPick }) => (
  <button
    type="button"
    className="cal-pip cal-ghost"
    title={`${g.of.label} — fell due here, carried to today`}
    onClick={(e) => { e.stopPropagation(); onPick(); }}
  >
    <span className="cal-ghtxt">{pillLabel(g.of)}</span>
    <span className="cal-ghfwd" aria-hidden>↦</span>
  </button>
);

const RecPip: React.FC<{ r: RecordItem; onPick?: () => void }> = ({ r, onPick }) => (
  <button
    type="button"
    className="cal-pip cal-rec"
    title={onPick ? (r.agent ? `${r.label} · ${r.agent}` : r.label) : undefined}
    tabIndex={onPick ? undefined : -1}
    onClick={onPick ? (e) => { e.stopPropagation(); onPick(); } : undefined}
  >
    <span className="cal-recdot" style={{ background: REC_TONE[r.dir].dot }} aria-hidden />
    {/* ⚠️ NO AGENT NAME ON A PILL — on Nick's instruction. The grid is a density map; the name is
        one click away in the panel, and the tooltip above still carries `Label · Name` in full. */}
    {pillLabel(r)}
  </button>
);

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
  exps: ExpectedItem[];
  manuscripts: { id: string; title: string }[];
  openRec: string | null;
  /** A row to bring into view — set by a grid pill click, cleared once honoured. */
  focusKey: string | null;
  onFocused: () => void;
  onToggleRec: (key: string) => void;
  onOpenCard: (item: CalendarItem) => void;
  onOpenQuery: (queryId: string) => void;
  onCompose: () => void;
}

const CalDayPanel: React.FC<CalDayPanelProps> = ({
  ymd, today, items, recs, exps, manuscripts, openRec, focusKey, onFocused, onToggleRec, onOpenCard, onOpenQuery, onCompose,
}) => {
  const d = new Date(`${ymd}T12:00:00`);
  const weekday = d.toLocaleDateString("en-GB", { weekday: "long" });
  const dateLine = d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });

  /* the sections, derived from the families the grid already placed — never a second grouping rule */
  const yours = items.filter((i) => i.family === "agent" || i.family === "task");
  const back = items.filter((i) => i.family === "snoozed");
  const done = items.filter((i) => i.family === "done");
  const total = items.length + recs.length + exps.length;

  /* ⚠️ THE COUNT LINE STATES WHAT IS THERE, and says nothing when there is nothing. "0 ITEMS" on a
     free day is a tally nobody asked for; the empty state below speaks for that case instead.
     ⚠️ ONE DEVIATION FROM THE REF, AND IT IS A CORRECTNESS ONE. The ref counts only the LIVE items
     (`items.length ? … : ''`), so a day holding nothing but history renders no line at all — the
     panel would show an "On the record" section under a blank head. The total counts both layers
     and the record clause names its share, which is true of every day rather than most of them. */
  const countLine = total === 0 ? "" : [
    `${total} ITEM${total === 1 ? "" : "S"}`,
    recs.length ? `${recs.length} ON THE RECORD` : "",
  ].filter(Boolean).join(" · ");

  /* ⚠️ THE PILL BRINGS ITS ROW INTO VIEW, and the effect is the only place that scrolls. It runs
     on the KEY and the DAY together: a pill on a different day changes both, and honouring only
     the key would scroll to a row the panel has not rendered yet. `onFocused` clears the request
     so a later re-render cannot scroll a second time under the reader. */
  const bodyRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!focusKey) return;
    const el = bodyRef.current?.querySelector(`[data-rowkey="${CSS.escape(focusKey)}"]`);
    if (el) (el as HTMLElement).scrollIntoView({ block: "nearest", behavior: "auto" });
    onFocused();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey, ymd]);

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
      data-rowkey={it.key}
      disabled={!it.card}
      onClick={() => onOpenCard(it)}
    >
      <i className="cal-fpdot" style={{ background: CAL_PIP[it.family].bg, borderColor: CAL_PIP[it.family].bd }} aria-hidden />
      <span className="cal-fptxt">{it.label}</span>
      {/* ⚠️ PROVENANCE TRAVELS WITH THE ITEM, not with the day it left. The grid's marker sat on an
          empty day and said a move had happened there; this says the same thing where the reader is
          actually looking — on today's row, in the panel, muted. Derived from `rolledFrom`, which
          is the value the marker itself was counted from.
          ⚠️ IT STATES THE GAP NOW (finishing pack, Phase 5), because "Originally due 7 Aug" leaves
          the reader to do the arithmetic — and the gap is the whole point of a carried item. It
          reports and does not judge: "12 days waiting" is a fact, "12 days overdue" is a judgement
          wearing a number, and the house copy law forbids that word outright. No colour
          escalation, no bold, no urgency styling — see `carriedLine`. */}
      {it.rolledFrom && <span className="cal-fporig">{carriedLine(it.rolledFrom, today)}</span>}
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

      <div className="cal-fpbody" ref={bodyRef}>
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
            {/* ⚠️ THE EXPECTED ROW STATES ITS SOURCE AS FACT, because the two sources mean
                different things — an agency's standing window and the writer's own date are not
                the same claim about the future, and collapsing them would launder one into the
                other. `expectedLine` owns the copy; "reply"/null-sourced items never reach here
                (the derivation refuses them — do not invent a date). Sage-dashed like its pill:
                provisional, incoming. Routes to the query, the same door the record rows use. */}
            {section("Expected", exps.map((x) => (
              <button
                key={x.key}
                type="button"
                className="cal-fprow cal-exprow"
                data-rowkey={x.key}
                onClick={() => onOpenQuery(x.queryId)}
              >
                <i className="cal-expdot" aria-hidden />
                <span className="cal-fptxt">
                  {EXPECTED_PILL}
                  {x.agent && <span className="cal-recwho"> · {x.agent}</span>}
                </span>
                <span className="cal-fporig">{expectedLine(x)}</span>
              </button>
            )))}
            {section("On the record", recs.map((r) => {
              const open = openRec === r.key;
              const title = msTitle(r.manuscriptId);
              return (
                <div key={r.key} className={`cal-recrow${open ? " open" : ""}`} data-rowkey={r.key}>
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
                      {/* ⚠️ HEADLINES PLUS A LINK — the reduction is the point (proposals pack,
                          Phase 1b). The expanded row carried Agent, Manuscript, What went,
                          Timeline, Record, the deed sentence and two buttons: a duplicate of the
                          reading pane, three inches from a link to the reading pane. The panel is
                          a READING SURFACE; one muted context line names what this entry belongs
                          to, and the link goes where the full record lives. The "Record" date line
                          went because the row already sits on its date; the key/value grid and the
                          deed went with the duplication.
                          ⚠️ `EDIT THIS ENTRY` IS REMOVED, NOT RELOCATED. Correction belongs in the
                          reading pane, which the link reaches — and `TimelineComposer` has no
                          importer anywhere in the repo today, so the button could never have
                          edited from here anyway (record-layer Step 0, flag 2, still true). */}
                      <p className="cal-recctx">
                        {[r.agency, title, `Exchange ${r.exchange}`].filter(Boolean).join(" · ")}
                      </p>
                      <button type="button" className="cal-reclink" onClick={() => onOpenQuery(r.queryId)}>
                        Open in Query Centre ›
                      </button>
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

export const TodoCalendarPage: React.FC<TodoCalendarPageProps> = ({ onNavigate, onNavigatePath = () => {} }) => {
  const {
    tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, currentUser,
    updateUserTask,
  } = useScriptAllyDb();
  const now = Date.now();
  const today = localYMD(now);
  /* board-optimise P2 — the page gained tag CREATION (the sidebar's ＋ New tag row), so it needs
     a failure surface: the same toast every other Tasks page uses, never a silent catch. */
  const { toast, flash, dismiss, pause, resume } = useTodoToast();
  const { createTagDef } = useTagWrites(flash);
  const [tagSel, setTagSel] = useState<string[]>([]); // tasks-pages P5 — additive with FILTERS
  /* ⚠️ THE WEEK VIEW IS RETIRED (record-layer P6). A week of seven cells showed the same items the
     month already showed, in more space and with less context — and the record layer sharpened the
     point: "what happened in August" is the question this page answers, and a week cannot answer
     it. `weekDays`, `weekLabel` and `shiftWeek` went with it, traced to zero remaining callers
     first. (The `weekLabel` in the dashboard files is a different, local symbol.) There was never
     a List view to delete. */
  /* ⚠️ TWO VIEW MODES REPLACE "THE RECORD" (finishing pack, Phase 3). The old control named a
     LAYER, and a control named after a layer asks the reader to know what that layer is before
     they can decide whether they want it — which is what made it opaque. These name what you get.
     `Done & upcoming` is everything the page showed with the record on; `Upcoming only` drops the
     record AND the done cards and starts the grid at today's week.
     ⚠️ STILL THE PAGE'S OWN STATE, and still NOT A FACET. `TODO_FACETS` is one vocabulary shared
     with the board and the sidebar badge; the board has no history, so a mode leaked into it would
     be a calendar-only concept in a control two other surfaces read. Session-only, defaulting to
     `both`: the record is what the page gained, so it shows by default, and a preference stored
     for a view toggle is a preference nobody asked to keep. */
  const [mode, setMode] = useState<CalMode>("both");
  /* ⚠️ THE KIND FILTERS SUPERSEDE THE FACET CONTROL, and the supersession is deliberate — see
     `CAL_KINDS` for the full reasoning. In one sentence: `TODO_FACETS` names live WORK, and since
     the record layer this page shows EVENTS, most of which are not tasks and never were. "Urgent"
     has no meaning applied to a query sent three weeks ago. The board and the sidebar badge keep
     `TODO_FACETS` untouched; this control is calendar-local.
     ⚠️ THEY COMPOSE WITH THE MODE RATHER THAN OVERLAPPING IT: the mode decides which LAYERS are on
     screen, the kinds decide which EVENTS survive within them. */
  const [kinds, setKinds] = useState<CalKind[]>(allKinds);
  const [kindOpen, setKindOpen] = useState(false);
  /* ⚠️ THE FOLD THRESHOLD IS MEASURED, NOT GUESSED (tasks-viewport P3). The grid resolves its own
     row height from whatever the frame leaves it, so the only honest source for "how many pips
     fit" is the grid itself. A ResizeObserver keeps it true through window resizes and through
     the month↔week switch; before the first measure `calFoldCap(0)` returns the old flat cap, so
     nothing renders emptier while it settles. */
  const gridRef = React.useRef<HTMLDivElement>(null);
  /**
   * ⚠️ THE READ RUNS AFTER EVERY RENDER, NOT ONLY ON RESIZE — and that is not belt-and-braces, it
   * is the fix for a real fault this pack's own acceptance caught. A `ResizeObserver` fires once on
   * `observe`, and at that moment the month's PILLS may not be painted yet; with no pill to measure
   * the metrics stayed at their declared fallback for the life of the page, and the fold went on
   * dividing by a stale `chrome` — which is exactly the staleness Phase 2 exists to end. Measured:
   * the grid reported `data-fold-short="6.5"` at 1280 while the cells fitted comfortably.
   * It cannot loop: `setMetrics` writes only when a value actually changes.
   */
  const readMetrics = React.useCallback((el: HTMLElement) => {
    const cell = el.querySelector(".cal-cell") as HTMLElement | null;
    const pill = el.querySelector(".cal-pip") as HTMLElement | null;
    const more = el.querySelector(".cal-more2") as HTMLElement | null;
    if (!cell || !pill) return;
    const ccs = getComputedStyle(cell);
    const head = cell.querySelector(".cal-d") as HTMLElement | null;
    const pcs = getComputedStyle(pill);
    const next = foldMetricsFrom(
      {
        clientHeight: cell.clientHeight,
        paddingY: parseFloat(ccs.paddingTop) + parseFloat(ccs.paddingBottom),
        headH: head?.getBoundingClientRect().height ?? 0,
      },
      { height: pill.getBoundingClientRect().height, marginTop: parseFloat(pcs.marginTop) },
      more ? more.getBoundingClientRect().height : null,
    );
    if (next) setMetrics((cur) =>
      cur.pipH === next.pipH && cur.moreH === next.moreH && cur.chrome === next.chrome ? cur : next);
  }, []);
  const [rowPx, setRowPx] = useState(0);
  /* the cell's measured costs; the declared values stand in only until a cell has been read */
  const [metrics, setMetrics] = useState<FoldMetrics>(FOLD_FALLBACK);
  React.useEffect(() => {
    const el = gridRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      /* ⚠️ THE ROW COUNT IS COUNTED, NOT ASSUMED (finishing pack, Phase 3). This said
         `const rows = 6` — "the month grid is always six week rows" — which was true until
         `Upcoming only` began showing between one and six. A hard six against a five-row grid
         divides the height by one row too many, so every cell is told it is SHORTER than it is and
         the fold caps tighter than it needs to: a silent under-report, no error, no overflow to
         notice. Counting the cells cannot go stale the way a constant can, and it is the same
         lesson the fold's own metrics learned one pack ago. */
      const rows = Math.max(1, Math.round(el.querySelectorAll(".cal-cell").length / 7));
      /* the grid's height less the day-name row, divided by the week rows it holds */
      const first = el.firstElementChild as HTMLElement | null;
      const dow = first?.offsetHeight ?? 0;
      setRowPx(Math.max(0, (el.clientHeight - dow) / rows));

      /* ⚠️ AND THE CELL'S OWN COSTS, READ FROM A RENDERED ONE (reclaim pack, Phase 2). The fold
         used to divide by declared constants — a hand-kept copy of the stylesheet — and when the
         numeral box and the cell's padding moved by 8.75px in this same pack, `CAL_CELL_CHROME`
         went stale and THE WHOLE SUITE STAYED GREEN. Asking the page what a pill costs cannot
         drift from what a pill costs.
         ⚠️ THE ELEMENTS ARE FOUND WITHIN THE GRID, never across the document: every workspace page
         stays mounted, and a document-wide query can return a hidden page's zero-sized copy. */
      readMetrics(el);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  /* the pills exist by the time this runs, which the observer's first fire cannot promise */
  React.useEffect(() => { if (gridRef.current) readMetrics(gridRef.current); });

  const cellCap = calFoldCap(rowPx, metrics);
  /* ⚠️ WHAT THE PAGE DOES WHEN THE FLOOR CANNOT BE HONOURED. `CAL_CELL_FLOOR` is a product ruling
     and cannot create space, so when the cell affords fewer pills than the ruling asks for, the
     grid still draws the ruling — reversing it unattended is not this file's call — and STATES the
     shortfall on itself. Silence was the old behaviour: the fold returned the floor into a cell
     with room for one and the pills overflowed to say so. Now a measurement can see it before a
     reader can, and `calReclaim.measure.ts` asserts the attribute is absent at every width.
     No user-facing copy is invented for this overnight; the attribute is the honest minimum. */
  const fold = foldFor(rowPx, metrics, true);
  /* the cap for a day that folds — the counter is 12px, not a whole pip (see calFoldCapFolded) */
  const cellCapFolded = calFoldCapFolded(rowPx, metrics);

  const [anchor, setAnchor] = useState(today);
  /* ⚠️ THE DAY PANEL REPLACES THE MODAL (record-layer P5). A day is now SELECTED rather than
     opened: the panel is permanent chrome beside the grid, so there is no dialogue to dismiss and
     no scrim between the writer and the month. `selDay` therefore always holds a day — today until
     they choose another — where `openDay` held null for "closed". */
  const [selDay, setSelDay] = useState<string>(today);
  /* which record row is expanded, if any. Cleared whenever the day changes — an expansion belongs
     to the entry the writer opened, not to the position it occupied in some other day's list. */
  const [openRec, setOpenRec] = useState<string | null>(null);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  /* ══ THE COLLAPSIBLE DAY PANEL (foot-panel pack, Phase 2) ═══════════════════════════════
     ⚠️ SESSION-LOCAL, NEVER PERSISTED — the same rule the view mode follows: a preference stored
     for a view toggle is a preference nobody asked to keep. Default OPEN: the panel is the page's
     reading surface, and a writer arriving should not have to ask for it.
     ⚠️ BELOW 1080 THE STATE IS IGNORED BY CONSTRUCTION, not by a width check here. The collapse is
     expressed as a CSS class whose rules live inside `@media (min-width: 1080px)`, and the panel
     stays MOUNTED in both states (hidden by `display: none`, never unrendered) — so the narrow
     single-column layout always shows it, and its internal state survives a collapse. */
  const [panelOpen, setPanelOpen] = useState(true);
  const pageRef = React.useRef<HTMLDivElement>(null);
  /* ⚠️ ONE CHEVRON, ONE MOUNT — positioned by the layout, moved by a class. Rendering a mount per
     state would remount the control on toggle and drop keyboard focus on the floor; a single
     element keeps focus across the toggle for free, which is the accessible behaviour with no
     machinery at all. */
  /* ⚠️ AFTER A TOGGLE THE PEEK WAITS FOR A REAL MOVE (foot-panel pack, Phase 3 finding). The
     collapse reflows the month under a STATIONARY pointer, the cell that slides beneath it fires
     `mouseenter` with no movement at all, and 450ms later a peek bloomed uninvited over the
     freshly widened month — caught in the acceptance screenshot, not by any assertion. A peek is
     "450ms of uninterrupted hover", and hover is something the reader DOES; layout arriving under
     a resting cursor is not it. The flag drops on the first genuine `mousemove`, so ordinary
     hovering is untouched. */
  const pointerParked = React.useRef(false);
  React.useEffect(() => {
    const onMove = () => { pointerParked.current = false; };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);
  const togglePanel = () => { pointerParked.current = true; setPanelOpen((o) => !o); clearPeek(); };

  /* ⚠️ SELECTING A DAY WHILE COLLAPSED REOPENS — the writer has asked to READ something, and
     silently discarding that click would be worse than the panel reappearing. It rides the three
     selection helpers rather than the cell's onClick, so a pip, a ghost and whitespace all reopen
     by the same rule. */
  const reopenForReading = () => setPanelOpen((o) => (o ? o : true));

  const selectDay = (ymd: string) => { setSelDay(ymd); setOpenRec(null); setFocusKey(null); reopenForReading(); };
  /* ⚠️ A PILL SELECTS ITS DAY *AND* POINTS AT ITS ROW (pill pack, Phase 3). The grid is a density
     map now: two words and a colour. Whatever the pill abbreviates is one click away in full, so
     the click has to land somewhere — the panel row it summarises.
     ⚠️ NOT VIA `selectDay`: that clears the expansion, which is right for whitespace and wrong
     here. These set the day and the target together, in one render, so nothing is set and undone.
     ⚠️ ACTIONING IS UNCHANGED. The row still opens `FocusFlow` with the same card and the same
     props; the pill routes to the row rather than past it. */
  const focusCard = (ymd: string, key: string) => { setSelDay(ymd); setOpenRec(null); setFocusKey(key); reopenForReading(); };
  const focusRecord = (ymd: string, key: string) => { setSelDay(ymd); setOpenRec(key); setFocusKey(key); reopenForReading(); };
  const [flowCard, setFlowCard] = useState<BoardCard | null>(null);

  const assembled = useMemo(
    () => assembleBoardColumns({
      tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, today, now,
      mutedTaskRules: currentUser?.mutedTaskRules,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, currentUser?.mutedTaskRules],
  );

  /* ⚠️ ONE RANGE PRODUCER PER MODE, and `Upcoming only`'s is month-bounded so `monthLabel` and
     `sameMonth` both keep working untouched — see `upcomingGridDays`'s own note for why a rolling
     five weeks was rejected. Everything downstream reads `visible`, so the mode reaches the
     record derivation, the day derivation and the grid through the one value. */
  const visible = mode === "upcoming" ? upcomingGridDays(anchor, today) : monthGridDays(anchor);
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
      cards.filter((c) => matchesTags(c.tags, tagSel));
    const cols = {
      todo: narrow(assembled.cols.todo),
      today: narrow(assembled.cols.today),
      snoozed: narrow(assembled.cols.snoozed),
      /* ⚠️ THE CALENDAR SHOWS NO DISMISSED CARDS, DELIBERATELY. A dismissed task has no action
         date — that is what dismissing it removed — so it has no day to sit on. Empty rather than
         narrowed: there is nothing to narrow. */
      dismissed: [],
      done: assembled.cols.done,
    };
    return calendarDays({
      cols, flags: taskFlags, queries, agents,
      /* ⚠️ THESE ARE NO LONGER GATED (finishing pack, Phase 4). Under the facet control they were
         withheld unless "Everything" was chosen, because a writer's task and a completed item have
         no facet — neither is urgent or housekeeping — so any narrower facet had to drop them
         wholesale. The kind vocabulary HAS names for both ("Your tasks", and done items filed by
         what they were), so they can be filtered honestly instead of withheld. */
      userTasks,
      activities,
      today, nowMs: now,
    }, visible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assembled, tagSel, taskFlags, queries, agents, userTasks, activities, today, visible.join("|")]);

  /* ⚠️ THE FACET'S COUNTS ARE RETIRED WITH THE CONTROL (finishing pack, Phase 4). They existed so
     the Calendar's facet chip could not state a different number from the board's for the same
     facet — a real risk while both drew the same four buckets. There is no such risk now: the two
     controls name different things, so a shared count would be a coincidence rather than a
     guarantee. `facetCounts` and `liveBoardCards` are untouched and still the board's.
     ⚠️ AND THE KIND CHECKLIST DELIBERATELY SHOWS NO COUNTS. A count beside a checkbox invites the
     reading "this many will disappear", which is wrong in both modes — the number of events of a
     kind depends on the month AND the mode, and computing it per kind per view is a second
     derivation of what the grid already draws. */

  /* ⚠️ THE RECORD IS A SECOND, INDEPENDENT DERIVATION OVER THE SAME VISIBLE DAYS (record-layer P2).
     It reads `activities` — already loaded unwindowed by the db provider — so the whole layer costs
     one pass over an array in memory: no new query, no new hook, no stored field. It is deliberately
     NOT narrowed here: the derivation reads every activity on the visible days, and the KINDS then
     narrow it at the point of reading (`recordFor`). The old note said "a facet reaching the record
     would quietly answer a question about the past with a rule written for the present" — that was
     right about FACETS, which name live work, and it is the reason the calendar now has an event
     vocabulary of its own. A kind IS a fact about the past, so it may narrow this layer honestly.
     The controls that govern it are the MODE (whether the layer is on) and the KINDS (which of it
     survives). */
  const recByDay = useMemo(
    () => recordDays(activities, queries, agents, visible),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activities, queries, agents, visible.join("|")],
  );

  /* ⚠️ THE EXPECTED LAYER IS A THIRD INDEPENDENT DERIVATION over the same visible days —
     `resolveExpectedDate` per waiting query, never `responseDeadline`/`writerExpectedDate` raw
     (Phase 3; the module's own header carries the list-level reply-window caveat). It obeys BOTH
     modes by construction: its items are future-only, so `Upcoming only` cannot lose one, and the
     kinds gate it through the same const the checklist reads. */
  const expByDay = useMemo(
    () => expectedDays(queries, agents, visible, today),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queries, agents, today, visible.join("|")],
  );
  const expectedFor = (ymd: string): ExpectedItem[] =>
    (expectedInKinds(kinds) ? expByDay.get(ymd) ?? [] : []);


  /* ══ THE HOVER PEEK (finishing pack, Phase 2; ref calendar-month-focus-v5.html) ═══════════
   *
   * ⚠️ IT IS PORTALLED, SO IT SPENDS NO CELL CUSHION. The reclaim pack left exactly +4.0px inside
   * a cell at 1280 and above. A peek drawn as a child of the cell — even one absolutely positioned
   * — would still have had to grow the cell's own box to hold a full uncapped set, and that budget
   * took three packs to earn. `position: fixed`, over the grid, cell untouched.
   *
   * ⚠️ AND IT NEVER OPENS FROM THE KEYBOARD. Arrowing through the month moves the SELECTION, and
   * the day panel already answers "what is on this day" for the selected day in full. A peek that
   * followed the caret would put a second, worse answer on screen beside the good one — and one
   * the reader cannot dismiss without reaching for the mouse.
   */
  /* ⚠️ THE CELL'S OWN RECT IS KEPT, not reconstructed. The re-clamp below needs the cell the peek
     grew from, and inverting the first clamp to recover it is arithmetic that is right until an
     edge cell clamps — at which point the inverse is simply wrong, silently and only at the edges. */
  const [peek, setPeek] = useState<
    { ymd: string; left: number; top: number; width: number; cell: { left: number; top: number; width: number } } | null
  >(null);
  const peekTimer = React.useRef<number | null>(null);
  const peekRef = React.useRef<HTMLDivElement>(null);

  const clearPeek = React.useCallback(() => {
    if (peekTimer.current !== null) { window.clearTimeout(peekTimer.current); peekTimer.current = null; }
    setPeek((p) => (p === null ? p : null));
  }, []);

  /* ⚠️ THE CELL ELEMENT IS CAPTURED NOW, NOT READ IN THE TIMEOUT. React pools nothing here, but
     `currentTarget` is null by the time a 450ms timer fires, so the rect must be taken from a
     reference held across the wait. */
  const armPeek = React.useCallback((ymd: string, cell: HTMLElement) => {
    if (peekTimer.current !== null) window.clearTimeout(peekTimer.current);
    if (pointerParked.current) return;
    peekTimer.current = window.setTimeout(() => {
      peekTimer.current = null;
      if (pointerParked.current) return;
      const grid = gridRef.current;
      if (!grid) return;
      /* ⚠️ EMPTY CELLS NEVER PEEK — a 1.6× parchment card saying nothing is worse than no card. */
      /* ⚠️ A DAY HOLDING ONLY A GHOST IS NOT EMPTY — it has a mark, so it peeks. Counting only
         items and records here would make hovering a ghost do nothing, which reads as broken. */
      if (itemsFor(ymd).length + recordFor(ymd).length + ghostsOn(ymd).length + expectedFor(ymd).length === 0) return;
      const c = cell.getBoundingClientRect();
      const g = grid.getBoundingClientRect();
      /* height 0 on this pass: the box is measured once it has been laid out, below */
      const cellRect = { left: c.left, top: c.top, width: c.width };
      const box = peekBox(cellRect, { left: g.left, top: g.top, right: g.right, bottom: g.bottom }, 0, PEEK_SCALE);
      setPeek({ ymd, left: box.left, top: box.top, width: box.width, cell: cellRect });
    }, PEEK_DELAY_MS);
  /* ⚠️ `kinds` IS IN THE DEPS, and leaving it out was a live staleness bug rather than a lint
     nicety: this callback closes over `itemsFor`/`recordFor`/`ghostsOn`, which are rebuilt every
     render and read the CURRENT filters. A memo that skipped `kinds` would keep the callback built
     when the checklist was last touched, so switching a kind off and hovering would test emptiness
     against the OLD filter set — a peek opening on a day it had just emptied.
     ⚠️ THOSE THREE ARE DECLARED BELOW THIS LINE and that is safe here, but only because nothing
     calls this during render: the body runs on mouseenter, by which time the consts are assigned.
     The same shape read during render is the temporal-dead-zone fault this repo has shipped once
     and `tsc` does not catch. Do not move the call site. */
  }, [byDay, recByDay, expByDay, mode, kinds]);

  /* ⚠️ THE SECOND CLAMP IS NOT OPTIONAL, because the height is the one term `peekBox` cannot
     derive: the peek holds every item on the day with no cap, so how tall it is depends on how
     many there are. It is placed, measured, then re-clamped — and the re-clamp writes only when it
     MOVES, so this cannot loop. A day near the foot of the month would otherwise hang past the
     grid's bottom edge, which is precisely the case the clamp exists for. */
  React.useLayoutEffect(() => {
    const el = peekRef.current, grid = gridRef.current;
    if (!el || !grid || !peek) return;
    const h = el.getBoundingClientRect().height;
    const g = grid.getBoundingClientRect();
    const box = peekBox(peek.cell, { left: g.left, top: g.top, right: g.right, bottom: g.bottom }, h, PEEK_SCALE);
    if (Math.abs(box.top - peek.top) > 0.5) setPeek({ ...peek, top: box.top });
  }, [peek]);

  /* ⚠️ SCROLL DISMISSES, ON THE CAPTURE PHASE. The peek is `position: fixed` against a grid that
     can move under it — the day panel beside it scrolls, and so does the page's own frame on a
     short viewport. A fixed card left behind by a scrolled grid points at the wrong day, which is
     worse than no card at all. Capture, because these scrolls happen on inner elements and do not
     bubble to the window. */
  React.useEffect(() => {
    if (!peek) return;
    window.addEventListener("scroll", clearPeek, true);
    return () => window.removeEventListener("scroll", clearPeek, true);
  }, [peek, clearPeek]);

  /* ══ DRAG A TASK TO A NEW DAY (proposals pack, Phase 2) ═══════════════════════════════════
     ⚠️ THE DROP WRITES THROUGH `updateUserTask` — the existing writer — and writes `dueDate`
     ALONE. Dates are input, not derived state: the writer moves the date and nothing auto-fires.
     The feed re-derives from the store, so the pill appears on the new day, the panel follows and
     the /todo row's date follows in the SAME derivation — one field, every surface.
     ⚠️ THE ORIGIN DAY IS NOT A VALID TARGET, which makes dropping there a no-op by construction:
     `dragover` only calls `preventDefault` on a DIFFERENT day, so the browser never permits the
     drop and no write can fire. A no-op enforced at the gesture beats one checked at the write.
     ⚠️ FAILURE IS VISIBLE — the house law (todoWrite): the write's catch flashes the page's own
     toast; a dropped pill that silently stayed put would read as a broken feature. */
  const [dragTask, setDragTask] = useState<{ id: string; from: string } | null>(null);
  const [dropYmd, setDropYmd] = useState<string | null>(null);
  const endDrag = () => { setDragTask(null); setDropYmd(null); };
  const dropOn = (ymd: string) => {
    if (!dragTask || ymd === dragTask.from) { endDrag(); return; }
    /* ⚠️ THE FAILURE COPY IS `todoWrite`'s, NOT AUTHORED HERE — a page lock forbids this page
       flashing a literal, and it caught exactly this line carrying one. The lock is right twice
       over: `saveErrorCopy(classifyWriteError(e))` is the ONE producer of save-failure copy in
       the Tasks world (permission and offline get their own true sentences), and no raw Firebase
       message ever reaches the UI through it. */
    updateUserTask(dragTask.id, { dueDate: ymd }).catch((e) => {
      flash(saveErrorCopy(classifyWriteError(e)));
    });
    endDrag();
  };

  /* ══ THE MONTH JUMP (proposals pack, Phase 4) ═════════════════════════════════════════════
     ⚠️ THE CONTROL LIVES IN THE TOOL ROW, NOT THE SUBTITLE. The pack says "the month title
     becomes a control", and the subtitle is where the month is WRITTEN — but the subtitle is
     `TasksPageLayout`'s, typed `string`, and that file is read-only territory. The tool row is
     where month NAVIGATION already lives (‹ Today ›), it is this page's own markup, and a control
     belongs with its siblings rather than smuggled through a chrome component's prose line.
     Deviation flagged in the report.
     ⚠️ HIDDEN IN `Upcoming only` — the view is a range, not a month, and the subtitle there names
     the range; a month picker under a range heading would navigate to something the heading
     stopped claiming. */
  const [jumpOpen, setJumpOpen] = useState(false);
  const [jumpYear, setJumpYear] = useState(() => Number(anchor.slice(0, 4)));

  /* ⚠️ ESCAPE IS CONSUMED ON THE CAPTURE PHASE — the house cascade law (the country picker's
     precedent): dismissing a popover must never fall through to page-level handlers. Outside
     pointerdown closes too, scoped exactly like the panel's own click-away. */
  React.useEffect(() => {
    if (!jumpOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      setJumpOpen(false);
    };
    const onDown = (e: PointerEvent) => {
      if (!(e.target as HTMLElement | null)?.closest(".cal-mjwrap")) setJumpOpen(false);
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onDown, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("pointerdown", onDown, true);
    };
  }, [jumpOpen]);

  /* ⚠️ CLICK-AWAY, SCOPED TO THE PAGE'S OWN ROOT — DELIBERATELY NOT `document` (foot-panel pack,
     Phase 2). "Outside the calendar" is defined by what the listener can reach: it hangs on this
     page's root element, so a click on the NAV, the MASTHEAD, or any PORTALLED surface (the peek,
     the overlay, menus, toasts — all portalled to `document.body`) never reaches it and cannot
     collapse the panel. A click that opens a menu is not a click away — and that falls out of the
     SCOPING, not out of a list of exceptions that would go stale as surfaces are added.
     ⚠️ THE LIMITATION THAT BUYS, stated for the report: a click on the shell's own furniture (the
     sidebar, the top bar) collapses nothing, because listening above the page's container is what
     the pack forbids. It reads as correct anyway — leaving the page is not "clicking away" inside
     it.
     ⚠️ WITHIN the page the exclusions are the pack's four, by `closest`: the month grid, the panel,
     the command bar (`.tpl-tools` — the row holding Today/prev/next, the segment and the kinds; the
     kind MENU lives inside it, so an open checklist is covered by the same test), and the chevron.
     Everything else — the legend, the title, empty ground — collapses. `pointerdown`, matching the
     app's other dismissal patterns, so it cannot lose a race with a click handler that re-renders
     the tree from under the event. */
  React.useEffect(() => {
    if (!panelOpen) return;
    const root = pageRef.current;
    if (!root) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.closest(".cal-grid, .cal-focus, .cal-paneltab, .tpl-tools")) return;
      setPanelOpen(false);
    };
    root.addEventListener("pointerdown", onDown);
    return () => root.removeEventListener("pointerdown", onDown);
  }, [panelOpen]);

  /* the timer must not outlive the page */
  React.useEffect(() => () => {
    if (peekTimer.current !== null) window.clearTimeout(peekTimer.current);
  }, []);

  /* ⚠️ THE SUBTITLE STATES WHAT IS ON SCREEN. In `Upcoming only` the month is truncated at
     today's week, so the old sentence — "every item on the day it needs you" — would be a claim
     the page had stopped meeting. */

  /* ⚠️ IN `Upcoming only` THE HEADING NAMES THE RANGE, NOT A MONTH (Phase 4) — the view starts at
     today's week and a month name over a truncated month claims more than is shown. The month
     picker hides with it. An empty range (a past month) keeps the month name: "Nothing ahead in
     August" is the grid's own statement and the heading should agree with it. */
  const subtitle = mode === "upcoming"
    ? (visible.length > 0
        ? `${shortCalDate(visible[0])} – ${shortCalDate(visible[visible.length - 1])} — what is still ahead.`
        : `${monthLabel(anchor)} — what is still ahead.`)
    : `${monthLabel(anchor)} — every item on the day it needs you.`;

  const openSheet = (item: CalendarItem) => {
    if (item.card) setFlowCard(item.card);
  };

  const dayData = (ymd: string) => byDay.get(ymd) ?? { items: [], rolled: 0 };
  /* ⚠️ THE MODE HIDES THE RECORD THROUGH THE SAME ONE FUNCTION THE TOGGLE DID. That is what keeps
     the dedupe composing rather than fighting: `dedupeAgainstRecord` takes the day's record as an
     ARGUMENT, so an empty record restores every superseded done card automatically — and then the
     mode's own done-filter takes them out again, for its own reason. Two rules, one order, tested
     together. */
  const recordFor = (ymd: string): RecordItem[] =>
    (mode === "both" ? recByDay.get(ymd) ?? [] : []).filter((r) => recordInKinds(r, kinds));
  /* ⚠️ THE ONE READING OF A DAY, so the grid, the day panel and the count line cannot disagree
     about what is on it. `recordFor` returns [] when the layer is hidden, so the same call restores
     every superseded done card — the record-off behaviour needs no branch of its own. */
  const itemsFor = (ymd: string): CalendarItem[] => {
    const deduped = dedupeAgainstRecord(dayData(ymd).items, recordFor(ymd));
    /* ⚠️ `Upcoming only` DROPS DONE CARDS BY ITS OWN RULE, not by the dedupe's. With the record
       hidden the dedupe hands every superseded done card straight back — correctly, since nothing
       is left to supersede them — and a mode promising upcoming work would then show finished
       work. The family is the test, never the strikethrough, which is presentation. */
    const byMode = mode === "upcoming" ? deduped.filter((it) => it.family !== "done") : deduped;
    /* ⚠️ THE KIND FILTER IS THE LAST WORD, so the panel's counts and the cell's `+N` both describe
       the FILTERED set — they read this one function, which is what has kept them agreeing since
       the dedupe landed. */
    return byMode.filter((it) => itemInKinds(it, kinds));
  };

  /* ⚠️ GHOSTS ARE DERIVED FROM TODAY'S ITEMS, NEVER THE DAY'S OWN — carried work renders on today,
     so that is the only list its origin can be read from. They obey the kind filters through the
     SAME predicate the live pill obeys (`itemsFor(today)` is already filtered), so a switched-off
     kind takes the mark and the pill together rather than leaving one orphaned.
     ⚠️ AND THEY ARE NEVER FED TO `dedupeAgainstRecord`. That exists because a completed card and a
     record entry can be two readings of one ACTIVITY; a carried task is not an activity — nothing
     happened on its origin day, which is the whole of what the ghost says. Deduping them would let
     a record entry on the origin day delete the mark for work that is still outstanding.
     ⚠️ IN `Upcoming only` THIS COMPOSES WITHOUT A RULE OF ITS OWN: an origin outside `visible` has
     no cell to render in, and one inside it is by definition a dimmed lead-in day. The panel's age
     line carries the fact either way. */
  const ghostsOn = (ymd: string): GhostItem[] =>
    ymd === today ? [] : ghostsFor(ymd, itemsFor(today));

  return (
    <div className="t-f12 spine-root" ref={pageRef}>
      <div className="tdb-wrap today-off">
        <TasksPageLayout
          title="Calendar"
          mark="calendar"
          subtitle={subtitle}
          tools={
            <>
              <button type="button" className="cal-nav calm-nav" aria-label="Previous" onClick={() => setAnchor(shiftMonth(anchor, -1))}><ChevronLeft size={14} aria-hidden /></button>
              <button type="button" className="cal-nav calm-nav cal-today" onClick={() => setAnchor(today)}>Today</button>
              <button type="button" className="cal-nav calm-nav" aria-label="Next" onClick={() => setAnchor(shiftMonth(anchor, 1))}><ChevronRight size={14} aria-hidden /></button>

              {/* ⚠️ THE MONTH NAME IS THE DOOR — chevron-only navigation is tedious across a
                  querying timeline that spans seasons. Current month highlighted, year paged,
                  choosing navigates. Hidden in `Upcoming only`, where the heading names a range. */}
              {mode !== "upcoming" && (
                <span className="cal-mjwrap">
                  <button
                    type="button"
                    className="cal-nav calm-nav cal-mjbtn"
                    aria-haspopup="true"
                    aria-expanded={jumpOpen}
                    aria-label="Jump to a month"
                    onClick={() => { setJumpYear(Number(anchor.slice(0, 4))); setJumpOpen((o) => !o); clearPeek(); }}
                  >
                    {monthLabel(anchor)} ▾
                  </button>
                  {jumpOpen && (
                    <div className="cal-mjump" aria-label="Jump to a month">
                      <div className="cal-mjyr">
                        <button type="button" aria-label="Previous year" onClick={() => setJumpYear((y) => y - 1)}>‹</button>
                        <span>{jumpYear}</span>
                        <button type="button" aria-label="Next year" onClick={() => setJumpYear((y) => y + 1)}>›</button>
                      </div>
                      <div className="cal-mjgrid">
                        {["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"].map((m, i) => {
                          const ymd = `${jumpYear}-${String(i + 1).padStart(2, "0")}-01`;
                          const cur = sameMonth(ymd, anchor);
                          return (
                            <button
                              key={m}
                              type="button"
                              className={cur ? "cur" : undefined}
                              aria-current={cur || undefined}
                              onClick={() => { setAnchor(ymd); setJumpOpen(false); }}
                            >
                              {m}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </span>
              )}

              {/* ⚠️ EVENT KINDS REPLACE THE FACET CONTROL (finishing pack, Phase 4) — and this
                  SUPERSEDES the recorded ruling that "the calendar uses `TODO_FACETS` as the single
                  shared vocabulary". That ruling was right when the calendar was a projection of
                  TASKS. The record layer changed what the page is: it shows EVENTS now, most of
                  which are not tasks and never were, and "Urgent" has no meaning applied to a query
                  sent three weeks ago. `TODO_FACETS` is UNTOUCHED — the board and the sidebar badge
                  keep it; this control is calendar-local, and `CAL_KINDS` carries the full reason.
                  ⚠️ MULTI-SELECT, ALL ON BY DEFAULT: a kind is a thing to switch OFF, so the
                  resting state hides nothing and needs no explaining. */}
              <span className="cal-kwrap">
                <button type="button" className="cal-nav calm-nav cal-kbtn" aria-haspopup="true"
                  aria-expanded={kindOpen} onClick={() => { setKindOpen((o) => !o); clearPeek(); }}>
                  {kinds.length === CAL_KIND_ORDER.length
                    ? "All kinds"
                    : `${kinds.length} of ${CAL_KIND_ORDER.length} kinds`} ▾
                </button>
                {kindOpen && (
                  <div className="cal-kmenu">
                    {/* ⚠️ `CAL_KINDS`, never a second label list — the same rule the facet control
                        obeyed, pointed at the vocabulary this page actually needs. */}
                    {CAL_KIND_ORDER.map((k) => {
                      const on = kinds.includes(k);
                      return (
                        <label key={k} className="cal-krow">
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => setKinds((cur) =>
                              cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k])}
                          />
                          <span className="cal-kbox" data-on={on} aria-hidden />
                          {CAL_KINDS[k].label}
                        </label>
                      );
                    })}
                    {/* ⚠️ THE RESET SAYS WHAT IT RESTORES, and it is `allKinds()` rather than a
                        hand-written list — the agent-list pack's `emptyFilterSet()` lesson, where a
                        literal silently missed a facet the day one was added. */}
                    <button type="button" className="cal-kall" onClick={() => setKinds(allKinds())}>
                      Show every kind
                    </button>
                  </div>
                )}
              </span>
              {/* ⚠️ THE VIEW SEGMENT REPLACES "THE RECORD" (finishing pack, Phase 3). It sits in the same
                  place and it is still SEPARATE from the facet control, behind the same rule — a
                  mode is a calendar-only concept and `TODO_FACETS` is one vocabulary shared with the
                  board and the sidebar badge. What changed is what the control NAMES: the old one
                  named a layer, so it asked the reader to know what "the record" was before they
                  could decide whether they wanted it. These name what you get. */}
              <span className="cal-sep" aria-hidden />
              <div className="cal-seg" role="group" aria-label="What the month shows">
                {([["both", "Done & upcoming"], ["upcoming", "Upcoming only"]] as const).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className="cal-segb"
                    aria-pressed={mode === id}
                    data-on={mode === id}
                    onClick={() => { setMode(id); clearPeek(); }}
                  >
                    {label}
                  </button>
                ))}
              </div>
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
          <div className={`cal-layout${panelOpen ? "" : " cal-nopanel"}`}>
          <div className="cal-main">
          {/* ⚠️ A PAST MONTH IN `Upcoming only` HAS AN HONEST ANSWER, AND IT IS NOTHING. Rather
              than clamp to "the last week anyway" — which would put a week of finished days under
              a heading promising upcoming work — the range comes back empty and this says so. It
              reports; it does not suggest, apologise or offer to do anything about it. */}
          {visible.length === 0 ? (
            <div className="cal-nowt">
              <p className="cal-nowt-t">Nothing ahead in {monthLabel(anchor)}.</p>
              <p className="cal-nowt-s">Switch to Done &amp; upcoming to see what happened.</p>
            </div>
          ) : (
          <div className="cal-grid" role="grid" ref={gridRef}
            {...(fold.shortfall > 0 ? { "data-fold-short": String(fold.shortfall) } : {})} aria-label={monthLabel(anchor)}>
            {DOW.map((d) => <div key={d} className="cal-dow" role="columnheader">{d}</div>)}
            {visible.map((ymd) => {
              const items = itemsFor(ymd);
              const recs = recordFor(ymd);
              /* ⚠️ THE FOLD RESPONDS TO THE VIEWPORT (tasks-viewport P3): the cap comes from the
                 row height the grid actually resolved to, so a short laptop folds sooner rather
                 than shearing a pip in half.
                 ⚠️ THE RECORD FOLDS WITH EVERYTHING ELSE (record-layer P3), and the arithmetic is
                 `cellSlots` rather than three expressions here — a rule this easy to get subtly
                 wrong belongs somewhere a test can call it. `calFoldCap` is untouched. */
              /* ⚠️ A GHOST IS AN ORDINARY CELL OCCUPANT and pays for its slot like any other pill
                 — it is the same box, so a fold that ignored it would draw one pill too many into
                 room for the cap. `cellSlots` is generic, so items and ghosts travel through it as
                 one tagged list and are split again at render; the arithmetic is untouched. */
              const exps = expectedFor(ymd);
              const occupants: Occupant[] = [
                ...items.map((it) => ({ t: "item", it } as const)),
                ...exps.map((x) => ({ t: "exp", x } as const)),
                ...ghostsOn(ymd).map((g) => ({ t: "ghost", g } as const)),
              ];
              const { shownItems: shown, shownRecs, overflow } = cellSlots(occupants, recs, cellCap, cellCapFolded);
              const past = ymd < today;
              const off = !sameMonth(ymd, anchor);
              /* ⚠️ THE LEAD-IN IS DIMMED, NEVER DELETED (finishing pack, Phase 3): whole weeks are
                 preserved, so `Upcoming only`'s first row still carries the days before today. It
                 gets its OWN class rather than borrowing `.off` — `.off` means "another month",
                 and a same-month day wearing it would state something untrue about the date. */
              const lead = mode === "upcoming" && ymd < today;
              return (
                <div
                  key={ymd}
                  role="gridcell"
                  className={`cal-cell${ymd === today ? " today" : ""}${ymd === selDay ? " sel" : ""}${past ? " past" : ""}${off ? " off" : ""}${lead ? " lead" : ""}${dropYmd === ymd ? " dropok" : ""}`}
                  onClick={() => selectDay(ymd)}
                  onMouseEnter={(e) => armPeek(ymd, e.currentTarget)}
                  onMouseLeave={clearPeek}
                  onDragOver={dragTask && ymd !== dragTask.from ? (e) => { e.preventDefault(); setDropYmd(ymd); } : undefined}
                  onDragLeave={dropYmd === ymd ? () => setDropYmd(null) : undefined}
                  onDrop={(e) => { e.preventDefault(); dropOn(ymd); }}
                >
                  <div className="cal-d">
                    {/* ⚠️ THE NUMERAL IS ITS OWN BOX (fixes pack, Phase 3) — a bare text node has
                        nothing for today's disc to sit on, and nothing to hold the row's height
                        when a day is empty. */}
                    <span className="cal-dn">{Number(ymd.slice(8))}</span>
                    {/* ⚠️ THE CHIP COUNTS THE DAY'S OWN CONTENTS — items, records and expected
                        dates. Ghosts stay out: a ghost is a signpost for a thing that lives on
                        TODAY, and counting it here would count one task twice across the month. */}
                    {items.length + recs.length + exps.length > 0 && <span className="cal-c2">{items.length + recs.length + exps.length}</span>}
                  </div>
                  {shown.map((o) => (o.t === "exp" ? (
                    <ExpPip key={o.x.key} onPick={() => selectDay(ymd)} />
                  ) : o.t === "item" ? (
                    <ItemPip key={o.it.key} it={o.it}
                      onPick={() => { o.it.card ? focusCard(ymd, o.it.key) : selectDay(ymd); }}
                      drag={draggableTask(o.it) ? {
                        onStart: (e) => {
                          /* the payload rides the event too, for protocol correctness — but the
                             STATE is what the drop reads; dataTransfer is write-only in dragover */
                          e.dataTransfer.setData("text/plain", o.it.card!.userTaskId!);
                          e.dataTransfer.effectAllowed = "move";
                          setDragTask({ id: o.it.card!.userTaskId!, from: ymd });
                          clearPeek();
                        },
                        onEnd: endDrag,
                      } : undefined} />
                  ) : (
                    /* the ghost points AT today — select it and focus the live row there */
                    <GhostPip key={o.g.key} g={o.g} onPick={() => focusCard(today, o.g.of.key)} />
                  )))}
                  {/* ⚠️ THE RECORD SITS UNDER THE LIVE WORK, AND WEARS THE SAME BOX. It reuses
                      `.cal-pip` geometry deliberately: `CAL_PIP_H` is the fold's unit, so a record
                      pip of a different height would make the measured cap describe a cell it does
                      not fit. Only the paint differs — no fill, no border, a dot and muted ink. */}
                  {shownRecs.map((r) => (
                    <RecPip key={r.key} r={r} onPick={() => focusRecord(ymd, r.key)} />
                  ))}
                  {overflow > 0 && <div className="cal-more2">+{overflow} MORE</div>}
                  {/* ⚠️ "{n} ROLLED FORWARD ↗" IS GONE (pill pack, Phase 4). It was bookkeeping
                      about a MOVE, drawn on a day where nothing happened — which on a calendar
                      reads as an event. The work itself was never on that day once it rolled; it
                      is on today, and its provenance now rides the item's own panel row as
                      "Originally due {date}". Nothing else consumed the marker. */}
                </div>
              );
            })}
          </div>
          )}

          {/* ⚠️ THE PEEK IS PORTALLED TO `document.body` (finishing pack, Phase 2). `.cal-grid` has
              `overflow: hidden` — that is what clips its corner cells to the outer radius — so a
              peek rendered inside it would be cut off by exactly the cells it is trying to unfold.
              Portalling also takes it out of the cell's box entirely, which is what keeps it off
              the fold's cushion.
              ⚠️ `aria-hidden` AND EVERY PILL AT `tabIndex={-1}`: it is a pointer affordance that
              exists for a few hundred milliseconds, and the day panel already states the same day
              in full for anyone not using a mouse. */}
          {peek && createPortal(
            <div
              ref={peekRef}
              className="cal-peek"
              aria-hidden
              style={{ left: peek.left, top: peek.top, width: peek.width, background: `rgba(253, 250, 245, ${PEEK_OPACITY})` }}
            >
              <div className="cal-pkday">{peekDayLabel(peek.ymd)}</div>
              {/* ⚠️ NO CAP, NO COUNTER — the peek IS the answer to "+N MORE". `itemsFor` and
                  `recordFor` are the same two calls the cell makes, so a filtered-out kind or a
                  hidden record layer is absent here for the same reason it is absent there. */}
              {itemsFor(peek.ymd).map((it) => <ItemPip key={it.key} it={it} />)}
              {expectedFor(peek.ymd).map((x) => <ExpPip key={x.key} />)}
              {/* ⚠️ GHOSTS APPEAR IN THE PEEK TOO. The peek is the answer to "+N MORE", and a
                  ghost can be what the counter is counting — unfolding a day and finding the mark
                  missing would make the peek disagree with the cell it grew from. Inert here like
                  every other pill: the peek takes no clicks at all. */}
              {ghostsOn(peek.ymd).map((g) => (
                <span key={g.key} className="cal-pip cal-ghost" aria-hidden>
                  <span className="cal-ghtxt">{pillLabel(g.of)}</span>
                  <span className="cal-ghfwd">↦</span>
                </span>
              ))}
              {recordFor(peek.ymd).map((r) => <RecPip key={r.key} r={r} />)}
            </div>,
            document.body,
          )}

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
            {/* ⚠️ THE RECORD IS ONE LAYER, NOT TWO MORE FAMILIES. Its entries wear the layer's own
                dot (6px, solid, no frame) and sit behind a rule, so a reader counts four card
                families and one record rather than six peers. */}
            {mode === "both" && <i className="cal-legsep" />}
            {mode === "both" && REC_LEGEND.map((l) => (
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
            items={itemsFor(selDay)}
            recs={recordFor(selDay)}
            exps={expectedFor(selDay)}
            manuscripts={manuscripts}
            openRec={openRec}
            focusKey={focusKey}
            onFocused={() => setFocusKey(null)}
            onToggleRec={(k) => setOpenRec((cur) => (cur === k ? null : k))}
            onOpenCard={openSheet}
            onOpenQuery={(queryId) => onNavigatePath(`/queries?q=${encodeURIComponent(queryId)}`)}
            onCompose={() => {
              onNavigatePath("/todo");
              window.dispatchEvent(new CustomEvent(TODO_OPEN_COMPOSER));
            }}
          />

          {/* ⚠️ THE CHEVRON (foot-panel pack, Phase 2). Open: it straddles the PANEL's left edge
              and points right — "push it away". Collapsed: it straddles the widened month's right
              edge and points left — "bring it back". One absolutely-positioned element against the
              layout; the position moves by class, and the panel's column width is read from the
              SAME token the grid template reads (`--cal-panel-w`), so the two cannot drift.
              ⚠️ `aria-expanded` + a verb-first name, per the pack; the focus ring rides the same
              rule as the view segment's. Hidden below 1080 in CSS — the narrow layout stacks the
              panel under the grid, so there is nothing beside the month to push away. */}
          <button
            type="button"
            className="cal-paneltab"
            aria-expanded={panelOpen}
            aria-label={panelOpen ? "Hide the day panel" : "Show the day panel"}
            onClick={togglePanel}
          >
            {panelOpen ? <ChevronRight size={13} aria-hidden /> : <ChevronLeft size={13} aria-hidden />}
          </button>
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

      {/* ⚠️ THE SAME `FocusFlow` EVERY OTHER To-do ENTRANCE OPENS — presentation scoped, behaviour
          untouched (finishing pack, Phase 6). Recon established that the To-do page's right-hand
          pane is a DIFFERENT component (`TaskPane` + `TaskPaneBody`, fed by `buildJourney`), and
          that `TaskPane` takes a BUILT journey rather than a card — so true parity means extracting
          the input-gathering `ToDoPage` does at :936, which is daylight work needing that session's
          cooperation. It is estimated in the report and deliberately NOT begun here.
          ⚠️ WHAT WAS ALREADY RIGHT IS LEFT ALONE. `FocusFlow` is already `role="dialog"
          aria-modal="true"` over a fixed scrim, already centred by `.tdb-ffstage`, already scrolls
          in `.tdb-ffbody`, and already closes on Escape and scrim-click. Rebuilding any of that to
          "match the intent" would be replacing a working implementation with a second one. The one
          thing that did not match was the WIDTH.
          ⚠️ THE WRAPPER EXISTS ONLY TO CARRY A CLASS. `FocusFlow` is read-only territory, so the
          narrowing is scoped from this page's own stylesheet through `.cal-flow`; the wrapper adds
          no box of its own, since everything inside it is `position: fixed`. */}
      {flowCard && (
        <div className="cal-flow">
        <FocusFlow
          items={[{ kind: "card", card: flowCard }]}
          onClose={() => setFlowCard(null)}
          /* ⚠️ THESE WERE BOTH `() => {}`, AND THE COST WAS NOT COSMETIC. The write FocusFlow makes
             is shared and was always correct; what was missing was the receipt — and this app
             offers UNDO ON THE TOAST. So a completion made from the calendar could not be reversed,
             while the identical completion made from `/todo` could. Silence read as "nothing
             happened" and removed the one control that could take it back.
             ⚠️ IT IS `ToDoPage`'s WIRING, NOT A SECOND ONE (`ToDoPage.tsx:2162`): the same
             `useTodoToast` flash this page already holds for its tag-creation failures, and the
             page's own navigation prop. No new toast, no new host, no new copy — the receipts and
             their Undo are whatever the shared hook already produces, which is the only way the
             two pages can be relied on to say the same thing. */
          onNavigate={onNavigate}
          onToast={flash}
        />
        </div>
      )}
    </div>
  );
};
