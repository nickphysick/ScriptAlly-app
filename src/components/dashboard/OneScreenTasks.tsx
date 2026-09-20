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
import React, { Suspense, useMemo, useRef, useState } from "react";

/**
 * ⚠️ LAZY, AND IT IS NOT AN OPTIMISATION. The drawer reaches `useTaskCommit` → `lib/db` →
 * `lib/firebase`, which initialises the Firebase SDK AT MODULE LOAD; this repo's test environment is
 * `node` with no emulator, so a static import here put `auth/invalid-api-key` into the import graph
 * of ELEVEN dashboard suites and they stopped COLLECTING — the failure that reads as "no tests
 * found" rather than as a red.
 */
/**
 * ⚠️ LAZY, AND NOT AS AN OPTIMISATION — see the module's own header. `useTaskCommit` reaches
 * `lib/db` → `lib/firebase`, which initialises the SDK at module load and would stop eleven
 * dashboard suites COLLECTING.
 */
const DashTaskCommit = React.lazy(() =>
  import("./DashTaskCommit").then((m) => ({ default: m.DashTaskCommit })));
/** ⚠️ LAZY FOR THE SAME REASON — the dial reads and writes the task flag through the db context. */
const DashSnooze = React.lazy(() =>
  import("./DashSnooze").then((m) => ({ default: m.DashSnooze })));
import { Activity, Agent, Manuscript, ManuscriptVersion, Query, Task, TaskFlag, User, UserTask } from "../../types";
import type { TodoTitle } from "../../lib/dashTodo";
import { OneScreenPanel } from "./OneScreenPanel";
import { assembleBoardColumns } from "../../lib/todoColumns";
import {
  GETTING_STARTED_EYEBROW, GETTING_STARTED_FOOT, gettingStartedOpen, gettingStartedRows,
} from "../../lib/dashEmpty";
import { BoardCard } from "../../lib/todoBoard";
import { isUrgentCard } from "../../lib/todoCategory";
import { listRowInputs } from "../../lib/taskCardFacts";
import { moreWaiting, todoGroups, todoRows, type TodoDone, type TodoRow } from "../../lib/dashTodo";
import { TodoRowCard, journeyFor, type RowPanel } from "./TodoRowCard";
import { TodoRowEditor, blankDraft, draftToValues, stripFor, type RowDraft } from "./TodoRowEditor";
import type { CommitRequest } from "./DashTaskCommit";
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
  /**
   * ⚠️ THE CARD IS MOUNTED ONCE, BY THE PAGE, AND THIS RAISES THE REQUEST. One mount is what makes
   * "one open at a time" structural rather than a rule two components have to keep — and the feed
   * and this card then open the same object rather than two that merely look alike.
   */
  onQuickRef?: (queryId: string, anchor: HTMLElement) => void;
  /** which query the page currently has a card open for, so the row's control can stay lit */
  refQueryId?: string | null;
}

export const OneScreenTasks: React.FC<OneScreenTasksProps> = ({
  loading, tasks, queries, agents, manuscripts, userTasks, activities, taskFlags, currentUser,
  now, dayOne = false, empty = false, versions = [], activeManuscript = null,
  onSeeAll, onAddManuscript, onAddAgent, onNavigate,
  openForQueryId, onOpenHandled, onQuickRef, refQueryId,
}) => {
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

  /* ── what each row is showing, and what it has drafted ─────────────────────────────────────
     ⚠️ KEYED BY ROW, NOT A SINGLE "open" — two rows can hold a strip at once (tick one, tick the
     next), and a single slot would silently drop the first receipt the moment the second landed. */
  const [panels, setPanels] = useState<Record<string, RowPanel>>({});
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [undos, setUndos] = useState<Record<string, (() => void) | undefined>>({});
  const [snooze, setSnooze] = useState<{ key: string; anchor: HTMLElement } | null>(null);
  const [request, setRequest] = useState<CommitRequest | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const seq = useRef(0);
  const ask = (r: CommitRequest) => { setNote(null); setRequest(r); };

  const closePanel = (key: string) => setPanels((ps) => { const n = { ...ps }; delete n[key]; return n; });

  const cardFor = (key: string) => live.find((c) => c.key === key);

  /**
   * ⚠️ THE FEED'S "Send it" RUNS THIS CARD'S OWN JOURNEY — it does not open a second surface.
   * It used to open the task drawer, which is retired with this round; the contract it was keeping
   * is unchanged and is now stronger, because the feed and the row commit through one function
   * rather than through one component. The request arrives as a QUERY id and is resolved here,
   * against the live board — the only place that knows which card a query is currently raising.
   */
  React.useEffect(() => {
    if (!openForQueryId) return;
    const r = rows.find((x) => x.queryId === openForQueryId);
    if (r) tick(r);
    onOpenHandled?.();
  }, [openForQueryId]);

  /**
   * ⚠️ THE TICK'S MEANING, AND NOTHING IS WRITTEN UNTIL IT IS UNAMBIGUOUS. `sent` and `nudge` have
   * one honest completion each, so they commit with the defaults `useTaskCommit` owns; `choose`
   * has three and opens the menu; housekeeping is a gap in a record and goes to the page where the
   * gap is filled. A ticked row is inert — its Undo is the way back.
   */
  const tick = (r: TodoRow) => {
    if (panels[r.key]) return;
    const c = cardFor(r.key);
    if (!c) return;
    const j = journeyFor(r.category);
    if (j === "choose") { setPanels((ps) => ({ ...ps, [r.key]: { kind: "menu" } })); return; }
    if (j === "page") { openGap(c); return; }
    seq.current += 1;
    ask({ id: seq.current, kind: "quick", card: c });
  };

  /** the quiet menu — nothing was written when it opened, and two of the three write now */
  const choose = (r: TodoRow, choice: "close" | "nudge" | "snooze") => {
    const c = cardFor(r.key);
    if (!c) return;
    if (choice === "snooze") {
      closePanel(r.key);
      const el = document.querySelector<HTMLElement>(`[data-probe="todo-row"][data-key="${CSS.escape(r.key)}"] [data-probe="todo-snooze"]`);
      if (el) setSnooze({ key: r.key, anchor: el });
      return;
    }
    seq.current += 1;
    /* ⚠️ BOTH GO THROUGH `commit`, WHICH IS THE ONE WRITE PATH. "Close it" is the `no_reply`
       reason — the same `CLOSE_REASONS[0]` the pane's close journey uses — and "Nudge once more"
       is a nudge like any other, so neither is a second way of doing a thing the app already does. */
    ask({
      id: seq.current, kind: "values", card: c,
      values: draftToValues(blankDraft(r), choice === "close" ? "close" : "nudge"),
    });
  };

  const openEditor = (r: TodoRow) => {
    setDrafts((ds) => ({ ...ds, [r.key]: ds[r.key] ?? blankDraft(r) }));
    setPanels((ps) => ({ ...ps, [r.key]: { kind: "edit", mode: journeyFor(r.category) === "nudge" ? "nudge" : "sent" } }));
  };

  const save = (r: TodoRow, mode: "sent" | "nudge") => {
    const c = cardFor(r.key);
    if (!c) return;
    seq.current += 1;
    ask({ id: seq.current, kind: "values", card: c, values: draftToValues(drafts[r.key] ?? blankDraft(r), mode) });
  };

  /**
   * ⚠️ UNDO REVERSES THE WRITE AND RESTORES THE ROW — in that order, and the row only comes back if
   * the reversal is actually available. An Undo that put the row back without reversing anything
   * would be the worst of the three outcomes: it looks like it worked.
   */
  const undo = (r: TodoRow) => {
    const fn = undos[r.key];
    if (fn) fn();
    closePanel(r.key);
    setUndos((u) => { const n = { ...u }; delete n[r.key]; return n; });
    setHeld((h) => { const n = { ...h }; delete n[r.key]; return n; });
  };

  /* ⚠️ ONE CLICK, NO DIALOGUE, AND THE ROW KEEPS THE WAY BACK. Dismissing is the app's own
     `dismissTask` — the same writer the To-do page uses — so "stop suggesting this nudge" means the
     same thing on both pages. */
  const dismiss = (r: TodoRow) => {
    const c = cardFor(r.key);
    if (!c?.taskType || !c.relatedRecordId) return;
    seq.current += 1;
    ask({ id: seq.current, kind: "dismiss", card: c });
  };

  /* ⚠️ THE ROW IS SNAPSHOT BEFORE THE BOARD ANSWERS, not looked up afterwards — by the time the
     write has landed there is nothing left to look up. */
  const holdCompletion = (key: string, done: TodoDone) => {
    const at = board.findIndex((r) => r.key === key);
    const row = board[at] ?? rows.find((r) => r.key === key);
    if (row) setHeld((h) => ({ ...h, [key]: { row: { ...row, done }, at: Math.max(at, 0) } }));
  };


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
          todoGroups(rows).map((g, gi) => (
            <React.Fragment key={g.key}>
              {/* ⚠️ RUST ON THE FIRST HEADING ONLY — it is the one group where somebody is waiting
                  on the writer, and a second rust heading would make the colour mean "a heading". */}
              <p className={`os-tdgh${g.key === "req" ? " os-tdgh--hot" : ""}`} data-probe="todo-group">
                {g.label}<span className="os-tdgc">{g.rows.length}</span>
              </p>
              {g.rows.map((r) => (
                <TodoRowCard
                  key={r.key}
                  row={r}
                  panel={panels[r.key] ?? null}
                  peeking={!!r.queryId && refQueryId === r.queryId}
                  onTick={() => tick(r)}
                  onQuickRef={(anchor) => { if (r.queryId) onQuickRef?.(r.queryId, anchor); }}
                  onSnooze={(anchor) => setSnooze({ key: r.key, anchor })}
                  onDismiss={() => dismiss(r)}
                  onChange={() => openEditor(r)}
                  onUndo={() => undo(r)}
                  onChoose={(choice) => choose(r, choice)}
                  onSave={(mode) => save(r, mode)}
                  onCancelEdit={() => closePanel(r.key)}
                  editor={<TodoRowEditor
                    mode={panels[r.key]?.kind === "edit" ? (panels[r.key] as { mode: "sent" | "nudge" }).mode : "sent"}
                    draft={drafts[r.key] ?? blankDraft(r)}
                    onChange={(d) => setDrafts((ds) => ({ ...ds, [r.key]: d }))}
                  />}
                />
              ))}
              {gi === 0 ? null : null}
            </React.Fragment>
          ))
        )}
      </div>

      {!empty && (
        <p className="os-tdfoot">
          {more > 0 ? `${more} more waiting. ` : ""}
          <button type="button" className="os-see" onClick={onSeeAll}>See all →</button>
        </p>
      )}

      {/* ⚠️ MOUNTED ONLY WHILE THERE IS SOMETHING TO WRITE, and with no fallback: the strip is what
          announces the result, so a spinner here would be a second arrival for one act. */}
      {request && (
        <Suspense fallback={null}>
          <DashTaskCommit
            request={request}
            onLogged={(key, logged, undoFn) => {
              const r = rows.find((x) => x.key === key);
              setPanels((ps) => ({ ...ps, [key]: { kind: "strip", text: stripFor(r, logged), canChange: journeyFor(r?.category ?? "house") !== "page" } }));
              setUndos((u) => ({ ...u, [key]: undoFn }));
              holdCompletion(key, { logged, undo: undoFn });
              setRequest(null);
            }}
            onDuplicate={(key, prompt) => {
              const r = rows.find((x) => x.key === key);
              if (r) setDrafts((ds) => ({ ...ds, [key]: ds[key] ?? blankDraft(r) }));
              setPanels((ps) => ({ ...ps, [key]: { kind: "edit", mode: "sent", warn: prompt } }));
              setRequest(null);
            }}
            onFailed={(key, message) => {
              setPanels((ps) => { const n = { ...ps }; delete n[key]; return n; });
              setNote(message);
              setRequest(null);
            }}
            onNeedsPage={() => { setRequest(null); onSeeAll(); }}
          />
        </Suspense>
      )}

      {/* ⚠️ THE APP'S OWN DIAL, MOUNTED A THIRD TIME — never a second implementation. It carries a
          CEILING (you cannot snooze past the thing you are waiting for) that no prose here asks for
          and that a fresh six-stop track would silently drop. */}
      {snooze && (
        <Suspense fallback={null}>
          <DashSnooze
            card={live.find((c) => c.key === snooze.key) ?? null}
            anchor={snooze.anchor}
            onClose={() => setSnooze(null)}
            onSnoozed={() => setSnooze(null)}
          />
        </Suspense>
      )}

      {/* a refusal the writer did not make needs saying out loud; everything else is the strip's */}
      {note && <p className="os-tdnote-line" role="alert">{note}</p>}
    </OneScreenPanel>
  );
};
