/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenTasks — the dashboard's window onto the To-do page (Phase 5; rebuilt for v16, 18 Sep).
 *
 * A row per live card: the state glyph on an ink tile, what to do and with whom, the date the clock
 * runs from, how far through the window it has run, and the day count. A foot says how many more are
 * waiting and takes the reader to the page that holds them.
 *
 * ⚠️ THE TICKET GRID, THE CATEGORY RULE AND ITS LEGEND ARE RETIRED WITH v16. The rule was a filter
 * over a card that now shows rows and scrolls; the ref draws a list and a foot, and a filter that
 * changes what "All 18" means two lines above it is a second reading of the card's own count.
 *
 * ⚠️ IT DERIVES NOTHING ABOUT A TASK. The cards are `assembleBoardColumns`' — the same call the
 * sidebar badge and every Tasks page make — and the rows are `lib/dashTodo`'s over the same
 * accessors the To-do page's own list uses.
 *
 * ⚠️ THE DRAWER STAYS. A row opens the task in place, and the feed's "Send it" link opens the same
 * drawer on whichever card that query is raising — one drawer on the page, one session, one write
 * path. A second one in the feed would be a second answer to what finishing a send involves.
 */
import React, { Suspense, useMemo, useState } from "react";

/**
 * ⚠️ LAZY, AND IT IS NOT AN OPTIMISATION. The drawer reaches `useTaskCommit` → `lib/db` →
 * `lib/firebase`, which initialises the Firebase SDK AT MODULE LOAD; this repo's test environment is
 * `node` with no emulator, so a static import here put `auth/invalid-api-key` into the import graph
 * of ELEVEN dashboard suites and they stopped COLLECTING — the failure that reads as "no tests
 * found" rather than as a red.
 */
const DashTaskDrawer = React.lazy(() =>
  import("./DashTaskDrawer").then((m) => ({ default: m.DashTaskDrawer })));
import { Activity, Agent, Manuscript, ManuscriptVersion, Query, Task, TaskFlag, User, UserTask } from "../../types";
import { StatePill } from "./StatePill";
import { getStatusLabel } from "../StatusPill";
import type { TodoTitle } from "../../lib/dashTodo";
import { OneScreenPanel } from "./OneScreenPanel";
import { assembleBoardColumns } from "../../lib/todoColumns";
import {
  GETTING_STARTED_EYEBROW, GETTING_STARTED_FOOT, gettingStartedOpen, gettingStartedRows,
} from "../../lib/dashEmpty";
import { BoardCard } from "../../lib/todoBoard";
import { isUrgentCard } from "../../lib/todoCategory";
import { listRowInputs } from "../../lib/taskCardFacts";
import { moreWaiting, todoRows, type TodoDone, type TodoRow } from "../../lib/dashTodo";
import { localYMD } from "../../lib/shellSidebar";

export interface OneScreenTasksProps {
  loading: boolean;
  tasks: Task[];
  queries: Query[];
  agents: Agent[];
  manuscripts: Manuscript[];
  userTasks: UserTask[];
  activities: Activity[];
  taskFlags: TaskFlag[];
  currentUser: User | null;
  now: Date;
  dayOne?: boolean;
  /**
   * ⚠️ THE PAGE'S ZERO-QUERY BRANCH — the getting-started list (empty-states pack, Phase 1). It
   * OUTRANKS `dayOne` where both are true, because the getting-started list is what day one should
   * have been: five deeds with their own destinations, rather than two mini-CTAs and a sentence.
   */
  empty?: boolean;
  /** the manuscript's versions — read ONLY for the `materials` deed's tick */
  versions?: ManuscriptVersion[];
  /** the manuscript the page is scoped to, for the two book-bound deeds */
  activeManuscript?: Manuscript | null;
  onSeeAll: () => void;
  onAddManuscript?: () => void;
  onAddAgent?: () => void;
  onNavigate: (tab: string, sub?: string) => void;
  /**
   * ⚠️ THE FEED'S "Send it" OPENS THIS DRAWER, NOT ONE OF ITS OWN. The feed is a sibling in another
   * column, so the request arrives as a QUERY id and is resolved here against the live board — the
   * only place that knows which card a query is currently raising.
   */
  openForQueryId?: string | null;
  onOpenHandled?: () => void;
}

/** The row's sentence as plain words — the tick's accessible name cannot carry the italic run. */
const plain = (t: TodoTitle): string => `${t.pre}${t.who}${t.post}`.replace(/\s+/g, " ").trim();

export const OneScreenTasks: React.FC<OneScreenTasksProps> = ({
  loading, tasks, queries, agents, manuscripts, userTasks, activities, taskFlags, currentUser,
  now, dayOne = false, empty = false, versions = [], activeManuscript = null,
  onSeeAll, onAddManuscript, onAddAgent, onNavigate,
  openForQueryId, onOpenHandled,
}) => {
  const [openKey, setOpenKey] = useState<string | null>(null);
  /**
   * ⚠️ HELD, BECAUSE THE BOARD STOPS RAISING THE CARD THE MOMENT THE WRITE LANDS. A row that vanishes
   * as it is ticked leaves the writer nothing to check and nowhere to undo from — so the completion
   * is kept here, with the row it happened to, and drawn until this card next mounts.
   *
   * ⚠️ SESSION STATE, NOT A FACT ABOUT THE BOARD. Nothing is stored and nothing is derived: the board
   * is still the only authority on what needs doing, and this is a receipt sitting on top of it.
   */
  const [held, setHeld] = useState<Record<string, { row: TodoRow; at: number }>>({});

  /* ⚠️ THE SAME CALL THE RAIL BADGE AND EVERY TASKS PAGE MAKE, on the dashboard's SCOPED arrays —
     so switching the manuscript chip moves this card and nothing else about the derivation. */
  const cols = useMemo(() => assembleBoardColumns({
    tasks, userTasks, queries, agents, manuscripts, taskFlags, activities,
    now: now.getTime(), today: localYMD(now.getTime()), mutedTaskRules: currentUser?.mutedTaskRules,
  }).cols, [tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, now, currentUser?.mutedTaskRules]);

  /* ⚠️ THE CHIP COUNTS WHAT THE CARD SHOWS, AND SNOOZED IS NOT SHOWN — the same two columns
     `boardFigures` reads, for the reason its own note gives: a count over a set the page does not
     draw is the two-numbers fault arriving one surface along. */
  const live = useMemo<BoardCard[]>(() => [...cols.todo, ...cols.today], [cols]);
  const taskData = useMemo(() => ({ queries, agents, manuscripts, userTasks, activities }),
    [queries, agents, manuscripts, userTasks, activities]);
  const board = useMemo(
    () => todoRows({
      cards: live,
      data: taskData,
      isUrgent: (c) => isUrgentCard(c, listRowInputs(c, taskData).days),
    }),
    [live, taskData],
  );

  /* The board's rows with any completion stamped on, plus the rows the board has since dropped put
     back where they were. `at` is the index the row held when it was ticked, so a receipt does not
     jump to the foot of the list at the moment the reader looks away from it. */
  const rows = useMemo(() => {
    const keys = new Set(board.map((r) => r.key));
    const out: TodoRow[] = board.map((r) => (held[r.key] ? { ...r, done: held[r.key].row.done } : r));
    for (const [key, h] of Object.entries(held)) {
      if (!keys.has(key)) out.splice(Math.min(h.at, out.length), 0, h.row);
    }
    return out;
  }, [board, held]);

  /**
   * ⚠️ HOUSEKEEPING IS THE EXCEPTION, AND IT IS AN EXCEPTION ABOUT WHAT FINISHING MEANS. Every other
   * row finishes by RECORDING something — a send, a reply, a nudge — which is what the panel is for.
   * A housekeeping card is a gap in a record, so there is nothing to record: it finishes by the
   * writer going and filling the gap in. Opening a completion panel over it would ask them to state
   * that they had done a thing they had not been given the chance to do.
   *
   * ⚠️ THE DESTINATION COMES OFF THE CARD, NEVER OFF THE TASK TYPE. The card already names the agent
   * or the manuscript whose record the gap is in; a table from task type to route here would be a
   * second place that has to learn every new housekeeping rule, and would silently send the next one
   * to the wrong page.
   */
  const openGap = (c: BoardCard) => {
    if (c.agentId) {
      try { sessionStorage.setItem("sa.agentReveal", c.agentId); } catch { /* private mode */ }
      onNavigate("agents");
    } else if (c.msTitle) {
      onNavigate("manuscripts");
    } else {
      /* a gap the dashboard cannot place: the page that owns every card is the honest fallback */
      onSeeAll();
    }
  };

  const tick = (r: TodoRow) => {
    if (r.done) return;
    const c = live.find((x) => x.key === r.key);
    if (c?.hk) openGap(c);
    else setOpenKey(r.key);
  };

  /* ⚠️ THE ROW IS SNAPSHOT BEFORE THE BOARD ANSWERS, not looked up afterwards — by the time the
     write has landed there is nothing left to look up. */
  const holdCompletion = (key: string, done: TodoDone) => {
    const at = board.findIndex((r) => r.key === key);
    const row = board[at] ?? rows.find((r) => r.key === key);
    if (row) setHeld((h) => ({ ...h, [key]: { row: { ...row, done }, at: Math.max(at, 0) } }));
  };

  /* ⚠️ THE OPEN CARD IS RESOLVED AGAINST THE LIVE BOARD, so a card that leaves the board while its
     drawer is open closes it rather than stranding a pane over a task that no longer exists. Two
     selectors, one card: the row the writer clicked, and the query the feed asked for. */
  const openCard = useMemo(
    () => live.find((c) => c.key === openKey)
      ?? (openForQueryId ? live.find((c) => c.relatedRecordId === openForQueryId) ?? null : null),
    [live, openKey, openForQueryId]);
  const closeDrawer = () => { setOpenKey(null); onOpenHandled?.(); };

  /**
   * ⚠️ DERIVED, NEVER STORED, AND `assembleBoardColumns` NEVER SEES IT. These five rows are a
   * projection of "does this record exist" over data the page already holds — so the To-do page's own
   * figures cannot move, and nothing goes stale when a writer deletes the record a row was reading.
   */
  const started = useMemo(
    () => (empty
      ? gettingStartedRows({
        manuscripts, agentCount: agents.length, queryCount: queries.length, versions, activeManuscript,
      })
      : []),
    [empty, manuscripts, agents.length, queries.length, versions, activeManuscript],
  );

  const total = empty ? gettingStartedOpen(started) : live.length;
  const more = moreWaiting(live.length, rows.length);

  return (
    <OneScreenPanel
      variant="os-todo" probe="todo-card" loading={loading} skel={["h", "grow", "grow"]}
      /* ⚠️ NO SUB-HEADING UNDER ANY TITLE (v33) — so in the first-run moment the words that named
         the list ("Getting started") have one place left to live, and it is the title. */
      band={(
        <div className="os-bandrow">
          <h3 className="os-cardttl" data-probe-text="todo-title">{empty ? GETTING_STARTED_EYEBROW : "To-do list"}</h3>
          <button type="button" className="os-mini" data-probe="todo-badge" onClick={onSeeAll}>
            All {loading ? "" : total}
          </button>
        </div>
      )}
    >

      <div className="os-scroll" data-probe="todo-rows">
        {empty ? (
          /**
           * ⚠️ AHEAD OF `dayOne`, DELIBERATELY. Both can be true (no queries and no manuscript) and
           * this is the better answer to that moment: five deeds each naming where it is done,
           * against two mini-CTAs and a sentence.
           */
          <div className="os-tgs">
            <ul className="os-tgs-list">
              {started.map((r) => (
                <li key={r.key} className={r.done ? "done" : undefined}>
                  {/* the tick is a mark, not a control — the row states a record, and pressing it
                      could only ever disagree with the record */}
                  <span className="os-tgs-ck" aria-hidden="true" />
                  <span className="os-tgs-deed">
                    {r.deed}
                    <small>{r.done ? r.doneNote : r.note}</small>
                  </span>
                  {/* ⚠️ HIDDEN, NOT REMOVED, on a finished row — removing it collapses the row's third
                      column and the remaining chips shift under the pointer. */}
                  {r.done ? (
                    <span className="os-tgs-go" aria-hidden="true">{r.chip}</span>
                  ) : (
                    <button type="button" className="os-tgs-go" onClick={() => onNavigate(r.tab, r.sub)}>
                      {r.chip}
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <p className="os-tgs-foot">{GETTING_STARTED_FOOT}</p>
          </div>
        ) : dayOne ? (
          <div className="os-tempty">
            <span>Tasks appear here as your queries progress.</span>
            <div className="os-dayone-ctas">
              <button type="button" className="os-btn-mini ghost" onClick={onAddManuscript}>Add your manuscript</button>
              <button type="button" className="os-btn-mini ghost" onClick={onAddAgent}>Add an agent</button>
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="os-tempty"><span>Nothing needs you today.</span></div>
        ) : (
          rows.map((r) => (
            <div
              className={`os-tdrow${r.urgent ? " os-tdrow--urgent" : ""}${r.done ? " os-tdrow--done" : ""}`}
              key={r.key}
              data-probe="todo-row"
            >
              {/* ⚠️ TICKING IS NOT COMPLETING — IT OPENS THE PANEL AT THIS TASK (§6). A bare tick would
                  mark the task done without recording what was sent or when, and two days later the
                  query says "requested" while the list says "done". The tick opens a record; the panel
                  writes it. A row already ticked is inert: its undo is the way back. */}
              <button
                type="button"
                className={`os-tdbox${r.done ? " os-tdbox--done" : ""}`}
                data-probe="todo-tick"
                aria-label={r.done ? `${r.done.logged} — ${plain(r.title)}` : `Record: ${plain(r.title)}`}
                aria-disabled={r.done ? true : undefined}
                onClick={() => tick(r)}
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#f5f1eb" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <span className="os-tdt">
                {r.title.pre}{r.title.who ? <i>{r.title.who}</i> : null}{r.title.post}
                <span className="os-tdmeta">
                  {/* ⚠️ THE STATE IN WORDS, DRAWN BY `StatusDot` INSIDE THE PILL — the house law is that
                      a query status has one drawing, and `StatePill` is the feed's own mount of it. */}
                  {r.status && <StatePill status={r.status} state={null} label={getStatusLabel(r.status)} />}
                  {r.done
                    ? (
                      <>
                        <span className="os-tdwhen">{r.done.logged}</span>
                        {r.done.undo && (
                          <button type="button" className="os-tdundo" data-probe="todo-undo" onClick={r.done.undo}>undo</button>
                        )}
                      </>
                    )
                    : <span className="os-tdwhen">{r.meta}</span>}
                </span>
              </span>
              <span className="os-tdn">
                {r.days === null ? <em className="os-tdgo">→</em> : <>{r.days}<em>d</em></>}
              </span>
            </div>
          ))
        )}
      </div>

      {!empty && (
        <p className="os-tdfoot">
          {more > 0 ? `${more} more waiting. ` : ""}
          <button type="button" className="os-see" onClick={onSeeAll}>See all →</button>
        </p>
      )}

      {/* ⚠️ MOUNTED ONLY ONCE A ROW IS OPEN — with no fallback, deliberately. The drawer's own
          entrance is what announces it; a spinner in the sheet's place would be a second arrival. */}
      {openCard && (
        <Suspense fallback={null}>
          <DashTaskDrawer
            card={openCard}
            onClose={closeDrawer}
            onCompleted={(done) => holdCompletion(openCard.key, done)}
            onSeeAll={onSeeAll}
            onNavigate={onNavigate}
          />
        </Suspense>
      )}
    </OneScreenPanel>
  );
};
