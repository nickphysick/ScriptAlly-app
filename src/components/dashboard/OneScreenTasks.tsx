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
/** the same dial, hosted inside the modal — see `DashSnoozeInline` */
const DashSnoozeInline = React.lazy(() =>
  import("./DashSnooze").then((m) => ({ default: m.DashSnoozeInline })));
/**
 * ⚠️ LAZY FOR A DIFFERENT REASON FROM THE TWO ABOVE, AND WORTH SAYING. The modal itself touches no
 * db — it collects an answer and hands it up. It is split because it is 300 lines and a stylesheet
 * that only a reader who opens a task ever needs, and because keeping the split uniform here means
 * nobody has to work out which of three neighbours is safe to import statically.
 */
const TaskModal = React.lazy(() =>
  import("../task/TaskModal").then((m) => ({ default: m.TaskModal })));
import { Activity, Agent, Manuscript, ManuscriptVersion, Query, QueryStatus, Task, TaskFlag, User, UserTask } from "../../types";
import type { TodoTitle } from "../../lib/dashTodo";
import { OneScreenPanel } from "./OneScreenPanel";
import { assembleBoardColumns } from "../../lib/todoColumns";
import {
  GETTING_STARTED_EYEBROW, GETTING_STARTED_FOOT, gettingStartedOpen, gettingStartedRows,
} from "../../lib/dashEmpty";
import { BoardCard } from "../../lib/todoBoard";
import { isUrgentCard } from "../../lib/todoCategory";
import { listRowInputs } from "../../lib/taskCardFacts";
import { moreWaiting, nudgeCount, replyWindow, todoGroups, todoRows, type TodoDone, type TodoRow } from "../../lib/dashTodo";
import { TodoRowCard, type RowPanel } from "./TodoRowCard";
import { modalJourney, modalWhen } from "../../lib/taskModal";
import type { TaskModalValues } from "../task/TaskModal";
import type { SendMethod } from "../../lib/paneJourney";
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
  /** which row has the modal open, and whether the feed opened it (§4 — no counter, no chevrons) */
  const [modal, setModal] = useState<{ key: string; fromFeed: boolean } | null>(null);
  /** §8 · the guard's question, shown as the modal's banner rather than as a dialog over a dialog */
  const [warn, setWarn] = useState<string | null>(null);
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
    /**
     * ⚠️ IT OPENS THE MODAL AND COMMITS NOTHING (§10). It used to call `tick(r)`, which for a send
     * journey WROTE immediately with the defaults — the direct commit this round supersedes.
     *
     * ⚠️ AND THE OLD LINE WAS `if (r) tick(r)` WITH NO ELSE, WHICH IS A BUG ON ITS OWN. The feed
     * offers the link from `markSentOffered`, which reads the QUERY's status; the board reads task
     * FLAGS. A snoozed or dismissed task is suppressed from `live` while the feed still draws the
     * link, so the click found no row and silently did nothing. Opening from the query rather than
     * from a board row is what removes it — the modal wants a card, but a `null` here now says so
     * in the one place that can, rather than being absorbed by a guard.
     */
    if (r) openModal(r, { fromFeed: true });
    onOpenHandled?.();
  }, [openForQueryId]);

  /**
   * ⚠️ THE TICK OPENS THE MODAL AND WRITES NOTHING (task-modal round §1). It used to commit
   * optimistically on a send and on a nudge and ask only on a quiet card. Nick, 21 Sep: *"a commit
   * the user can't see is a commit they don't trust. One click plus a visible confirmation is the
   * price, and it's the right price."* Undo on the strip stays as the safety net after.
   *
   * A housekeeping card still goes to the page: it is a gap in a record, filled where the gap is,
   * and the modal has no takeover to host it in — which is what `openFlow` exists to hand off.
   */
  const openModal = (r: TodoRow, opts?: { fromFeed?: boolean }) => {
    if (panels[r.key]) return;
    const c = cardFor(r.key);
    if (!c) return;
    if (!modalJourney(c)) { openGap(c); return; }
    setWarn(null);
    setModal({ key: r.key, fromFeed: !!opts?.fromFeed });
  };
  const tick = (r: TodoRow) => openModal(r);

  /**
   * ⚠️ THE QUIET MENU AND THE IN-ROW EDITOR ARE BOTH RETIRED (§11), and their three jobs moved
   * WHOLE rather than being dropped: the menu's three choices are the modal's three answer cards
   * for the quiet journey — same titles, same glosses, same "what it records" footers — and the
   * editor's fields are the modal's form rows. What is gone is the idea that a row hosts either.
   *
   * ⚠️ AND `Change` IS GONE FROM THE STRIP WITH THEM (§9). To change something you press Undo and
   * tick again, or open the query. A `Change` that re-opened the editor was a third surface for one
   * question, and the receipt is a record rather than a form.
   */
  /* ── the modal's inputs and its one way out ─────────────────────────────────────────────── */

  const modalRow = modal ? rows.find((x) => x.key === modal.key) ?? null : null;
  const modalCard = modalRow ? cardFor(modalRow.key) ?? null : null;

  /**
   * Everything the modal renders that it cannot derive.
   *
   * ⚠️ IT READS THE SAME ACCESSORS THE ROW DOES — `listRowInputs` for the agency, the anchor date
   * and whether the ask was a partial; `replyWindow` for the agency's own figure. A second
   * derivation here would let the modal and the row it opened from state different facts about one
   * task, three inches apart.
   */
  const modalFacts = useMemo(() => {
    const r = modalRow, c = modalCard;
    const j = c ? modalJourney(c) : null;
    if (!r || !c || !j) {
      return { journey: "sent" as const, title: { pre: "", who: "", post: "" }, when: "",
        agent: { name: "", initials: "", meta: "" }, partial: false, materials: "",
        expected: null, remind: null, method: "Email" as const };
    }
    const inputs = listRowInputs(c, taskData);
    const q = c.relatedRecordId ? queries.find((x) => x.id === c.relatedRecordId) : undefined;
    const agent = agents.find((a) => a.id === (q?.agentId ?? c.agentId));
    const win = replyWindow((q?.status as QueryStatus) ?? null, agent?.responseTimeWeeks);
    const day = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
    return {
      journey: j,
      title: r.title,
      when: modalWhen(j, inputs.anchorDate, r.days, nudgeCount(r.queryId, activities)),
      agent: {
        name: c.who || "the agent",
        initials: r.initials,
        /* ⚠️ THE WINDOW IS STATED ONLY WHERE THE AGENCY STATED ONE — `replyWindow` carries that
           flag, and a house figure presented as theirs is a guess wearing a fact's clothes. */
        meta: [inputs.agency, win.stated ? `${Math.round(win.days / 7)}-week window` : null].filter(Boolean).join(" · "),
      },
      partial: inputs.partial,
      materials: inputs.ask || (inputs.partial ? "Partial" : "Full manuscript"),
      expected: win.days ? { date: day(win.days), hint: win.stated ? `Their ${Math.round(win.days / 7)}-week window` : "House estimate" } : null,
      remind: win.days ? { date: day(win.days + 14), hint: "2 weeks after" } : null,
      method: (q?.sendMethod as SendMethod) ?? "Email",
    };
  }, [modalRow, modalCard, taskData, queries, agents, activities]);

  /**
   * The modal's answer, routed to the write that names it.
   *
   * ⚠️ FOUR ANSWERS, FOUR KINDS, AND NONE OF THEM ROUTES ON THE CARD (Nick, 21 Sep). `close` and
   * `mute` are their own `CommitRequest` kinds for exactly that reason: `commitFromPane` routes on
   * the CARD's journey, so a send card asking to close would land in the send arm.
   *
   * ⚠️ AND `allowDuplicate` RIDES THE REQUEST. If the banner is up, this press IS the writer's
   * answer to the guard's question — see `onDuplicate` in `DashTaskCommit`.
   */
  const commitFromModal = (r: TodoRow, c: BoardCard, v: TaskModalValues) => {
    /* ⚠️ THE DUPLICATE GUARD IS NOT ASKED HERE, AND WAS FOR ONE COMMIT. It belongs beside the
       WRITE (`commitSendFromPane`), not beside a surface — a guard in a caller protects that caller
       and leaves the next one unguarded, which is exactly how it came to be missed. It reaches this
       modal through `confirmAsk`: `DashTaskCommit` declines, hands the question up, and the banner
       carries it with `Log it anyway` on the primary. `allowDuplicate` is that press. */
    seq.current += 1;
    const id = seq.current;
    const allow = !!warn;
    setModal(null); setWarn(null);
    if (v.answer.write === "close") { ask({ id, kind: "close", card: c, note: v.note || undefined }); return; }
    if (v.answer.write === "mute") { ask({ id, kind: "mute", card: c }); return; }
    /* "Nudge once more" on a quiet card — the nudge's own write, as before */
    if (v.answer.write === "commit" && modalJourney(c) === "quiet") { ask({ id, kind: "nudge", card: c }); return; }
    const mode = modalJourney(c) === "nudge" ? "nudge" as const : "sent" as const;
    const draft: RowDraft = {
      ...blankDraft(r),
      materials: v.materials ? [v.materials] : blankDraft(r).materials,
      also: v.also, sentDate: v.when, method: v.method,
      expected: v.expected, remind: v.remind, note: v.note,
    };
    ask({ id, kind: "values", card: c, values: draftToValues(draft, mode), allowDuplicate: allow });
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
                  onUndo={() => undo(r)}
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
              const c = cardFor(key);
              /* the strip states the OUTCOME, which is what the request asked for — never the row's
                 category, which is what it was before the write */
              const outcome = request.kind === "dismiss" || request.kind === "mute" ? "dismiss" as const
                : request.kind === "nudge" ? "nudge" as const
                  : request.kind === "close" ? "close" as const
                    : request.kind === "values" && request.values.reason ? "close" as const
                      : c && modalJourney(c) === "nudge" ? "nudge" as const : "sent" as const;
              /* ⚠️ THE STRIP CARRIES UNDO ALONE NOW (§9) — see the note where the editor was. */
              setPanels((ps) => ({ ...ps, [key]: { kind: "strip", text: stripFor(r, logged, outcome), canChange: false } }));
              setUndos((u) => ({ ...u, [key]: undoFn }));
              holdCompletion(key, { logged, undo: undoFn });
              setRequest(null);
            }}
            /* §8 · the modal stays open and grows a banner; nothing was written */
            onDuplicate={(key, prompt) => { setWarn(prompt); setModal((m) => m ?? { key, fromFeed: false }); setRequest(null); }}
            onFailed={(key, message) => {
              setPanels((ps) => { const n = { ...ps }; delete n[key]; return n; });
              setNote(message);
              setRequest(null);
            }}
            onNeedsPage={() => { setRequest(null); onSeeAll(); }}
          />
        </Suspense>
      )}

      {/* ⚠️ THE APP'S OWN DIAL, MOUNTED A THIRD TIME — never a second implementation. It carries an
          offer CEILING (an offer stops at tomorrow) that a fresh six-stop track would silently drop. */}
      {snooze && (
        <Suspense fallback={null}>
          <DashSnooze
            card={live.find((c) => c.key === snooze.key) ?? null}
            anchor={snooze.anchor}
            onClose={() => setSnooze(null)}
            /**
             * ⚠️ A SNOOZE RAISES A STRIP, EXACTLY AS A DISMISS DOES — it did not, for one build, and
             * the two controls sit three pixels apart. Dismiss went through the commit path and came
             * back with a strip and an Undo; snooze wrote its flag, closed the dial, and the row
             * simply disappeared with no trace and no way back short of the To-do page. §4 says Undo
             * on every strip, and the honest reading is that an action which removes a row from the
             * board must LEAVE a strip to carry one.
             *
             * ⚠️ IT DOES NOT GO THROUGH `ask`. The write has already happened inside the dial — the
             * dial owns its own commit, which is what makes it mountable anywhere — so routing a
             * second request through `DashTaskCommit` would write the flag twice. This reuses the
             * state the commit path sets (`panels` · `undos` · `held`) without reusing its writer.
             */
            onSnoozed={(days, undoFlag) => {
              const key = snooze.key;
              setSnooze(null);
              const r = rows.find((x) => x.key === key);
              const logged = days === 1
                ? "Put off until tomorrow."
                : `Put off for ${days} days.`;
              setPanels((ps) => ({ ...ps, [key]: { kind: "strip", text: stripFor(r, logged, "dismiss"), canChange: false } }));
              setUndos((u) => ({ ...u, [key]: undoFlag }));
              holdCompletion(key, { logged, undo: undoFlag });
            }}
          />
        </Suspense>
      )}

      {/**
        * ⚠️ THE MODAL IS MOUNTED ONCE, BY THIS CARD, AND EVERY DOOR RAISES IT (§1). Three components
        * each rendering their own would be three modals free to ask different questions about one
        * task — the fault this page closed when two panes briefly coexisted.
        */}
      {modalRow && modalCard && (
        <Suspense fallback={null}>
          <TaskModal
            facts={modalFacts}
            /* §4 · the list you stepped in from, never a global — and absent from the feed door */
            order={modal?.fromFeed ? null : {
              index: rows.findIndex((x) => x.key === modalRow.key),
              total: rows.length,
              onPrev: () => { const i = rows.findIndex((x) => x.key === modalRow.key); if (i > 0) setModal({ key: rows[i - 1].key, fromFeed: false }); },
              onNext: () => { const i = rows.findIndex((x) => x.key === modalRow.key); if (i < rows.length - 1) setModal({ key: rows[i + 1].key, fromFeed: false }); },
            }}
            fromFeed={!!modal?.fromFeed}
            warn={warn}
            busy={!!request}
            onOpenQuery={() => { setModal(null); if (modalRow.queryId) onNavigate("queries", modalRow.queryId); }}
            onClose={() => { setModal(null); setWarn(null); }}
            onCommit={(v) => commitFromModal(modalRow, modalCard, v)}
            /**
             * ⚠️ THE SNOOZE ANSWER WRITES FROM THE DIAL, SO IT DOES NOT GO THROUGH `ask` — the dial
             * owns its own commit, which is what makes it mountable anywhere, and a second request
             * through `DashTaskCommit` would write the flag twice. It raises the same strip the
             * anchored control does, so a task put off from the modal still leaves a way back.
             */
            renderSnooze={() => (
              <Suspense fallback={null}>
                <DashSnoozeInline
                  card={modalCard}
                  onPick={() => { setModal(null); setWarn(null); }}
                  onSnoozed={(days, undoFlag) => {
                    const key = modalRow.key;
                    const logged = days === 1 ? "Put off until tomorrow." : `Put off for ${days} days.`;
                    setPanels((ps) => ({ ...ps, [key]: { kind: "strip", text: stripFor(modalRow, logged, "dismiss"), canChange: false } }));
                    setUndos((u) => ({ ...u, [key]: undoFlag }));
                    holdCompletion(key, { logged, undo: undoFlag });
                  }}
                />
              </Suspense>
            )}
          />
        </Suspense>
      )}

      {/* a refusal the writer did not make needs saying out loud; everything else is the strip's */}
      {note && <p className="os-tdnote-line" role="alert">{note}</p>}
    </OneScreenPanel>
  );
};
