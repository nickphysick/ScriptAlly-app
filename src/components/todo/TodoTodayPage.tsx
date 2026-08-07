/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TodoTodayPage — the Today route's body (workspace pack, Phase 3; ref
 * design-refs/todo-workspace-pages.html).
 *
 * ⚠️ TODAY IS A LIST YOU BUILT, not a view of what exists. Every other To-do surface shows what
 * the data says; this one shows what you committed to. That distinction is what the page has to
 * protect, and it is why the quick-add makes exactly one kind of thing, why the bench refuses to
 * re-offer what you have already declined, and why an auto-surfaced due item announces itself
 * rather than appearing as though you had put it there.
 *
 * ⚠️ THE PAGE'S SIDE CONTAINER IS HOSTED HERE, not in the body, because it belongs to every To-do
 * page rather than to one of them.
 *
 * Every derivation is in lib/todoToday (pure, unit-locked). This file is wiring and presentation.
 */
import React, { useMemo, useState } from "react";
import { Play, Plus, Undo2, ListChecks, LoaderCircle, MoreHorizontal } from "lucide-react";
import { useTagWrites } from "./useTagWrites";
import { ArtSlot } from "./ArtSlot";
import { TasksPageLayout, TplGrow, TplZone } from "./TasksPageLayout";
import { TodoFacetId, facetCounts, applyFacet } from "../../lib/todoBoardSort";
import { useScriptAllyDb } from "../../lib/db";
import { todaySplit, BoardCard } from "../../lib/todoBoard";
import { assembleBoardColumns, liveBoardCards } from "../../lib/todoColumns";
import { tagUsageCounts, toggleTagSel, matchesTags } from "../../lib/todoTags";
import { localYMD } from "../../lib/shellSidebar";
import {
  clearedAtLabel, suggestedBench, todayQuickAddFields,
  todayEyebrow, todayStats, todayListCount, planUsedToday, markPlanUsed,
} from "../../lib/todoToday";
import { longDate, weekOfQuerying } from "../../lib/dashboardStats";
import { estimateTotal, estimateChip } from "../../lib/todoEstimate";
import { useTodoToast } from "./useTodoToast";
import "./todoToday.css";

/** The Today page announces these; ToDoPage owns the surfaces that answer them. One event each,
 *  named once, because a literal typed in two places is a listener that silently never fires. */
export const TODO_WORK_THE_LIST = "sa:todo-work-the-list";
export const TODO_ADD_TO_TODAY = "sa:todo-add-to-today";

export interface TodoTodayPageProps {
  onNavigate: (tab: string, subPageName?: string) => void;
}

export const TodoTodayPage: React.FC<TodoTodayPageProps & { onNavigatePath?: (p: string) => void }> = ({ onNavigatePath = () => {} }) => {
  const [facet, setFacet] = useState<TodoFacetId>("all");
  const [tagSel, setTagSel] = useState<string[]>([]); // tasks-pages P5 — additive with FILTERS
  const {
    tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, currentUser,
    addUserTask, updateUserTask,
  } = useScriptAllyDb();
  const { toast, flash, dismiss, pause, resume } = useTodoToast();
  // board-optimise P2 — the shared tag-write pair
  const { createTagDef } = useTagWrites(flash);
  const [draft, setDraft] = useState("");
  /* ⚠️ THE PLAN CARD'S DISMISSAL IS PER DAY, and it is a UI preference — localStorage, never
     task data. Seeded from the store on mount so a reload inside the same day does not bring the
     card back; the state is what makes the dismissal immediate rather than waiting for a
     re-render from somewhere else. */
  const [planUsed, setPlanUsed] = useState(false);
  const [saving, setSaving] = useState(false);

  const now = Date.now();
  const today = localYMD(now);

  /* ⚠️ THE ONE DERIVATION (tasks-pages P2, walk fix 1): the SAME assembleBoardColumns the board
     page and the sidebar badge use, identically scoped — this page's FILTERS used to count the
     raw lanes (members, blind to Snoozed) and read 27/24 against the list's 15/12. */
  const assembled = useMemo(
    () => assembleBoardColumns({
      tasks, userTasks, queries, agents, manuscripts, taskFlags, activities,
      now, today, mutedTaskRules: currentUser?.mutedTaskRules,
    }),
    // The page's own dep discipline — the data arrays are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, currentUser?.mutedTaskRules],
  );
  const board = assembled.board;

  const split = todaySplit(board, today);
  const committed = applyFacet(split.committed, facet).filter((c) => matchesTags(c.tags, tagSel));
  const done = applyFacet(split.done, facet).filter((c) => matchesTags(c.tags, tagSel));

  /* THE BENCH — the open lanes minus everything the four exclusions rule out. Urgent before
     housekeeping: the order is what you would reach for, not what the array happened to hold.
     ⚠️ THE ACTIVE FILTER REACHES THE BENCH TOO (tasks-audit P5): a page narrowed to Urgent
     suggesting housekeeping would be the FILTERS contract holding for one region and not the
     other — the bench honours facet ∧ tags exactly as the committed list does, and its header
     says "matching" while anything narrows. */
  const filtersActive = facet !== "all" || tagSel.length > 0;
  const bench = useMemo(
    () => suggestedBench({
      candidates: applyFacet([...board.do, ...board.hk], facet).filter((c) => matchesTags(c.tags, tagSel)),
      flags: taskFlags,
      onToday: new Set(committed.map((c) => c.key)),
      nowMs: now,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [board.do, board.hk, taskFlags, committed.length, facet, tagSel],
  );
  /* the header's pool, card-unit and narrowed the same way — the To do column under this filter */
  const benchPool = applyFacet(assembled.cols.todo, facet).filter((c) => matchesTags(c.tags, tagSel)).length;

  /* ⚠️ THE ALL-CLEAR IS A THREE-WAY AND (board-optimise P3; ref art-slots §1 brief 1): nothing
     COMMITTED, nothing URGENT, and the bench EXHAUSTED. Any two of the three is an ordinary
     quiet moment — it is the third that makes it earned, and the hero is worthless the day it
     appears over work the writer can still see. Read UNFILTERED, deliberately: a desk that looks
     clear only because a filter is hiding the rest would be the app congratulating you for
     narrowing a view. Rare by design. */
  const deskClear = committed.length === 0 && board.do.length === 0 && bench.length === 0;

  /** ⚠️ Creates a TASK DUE TODAY — never a note (audit item 7). A note made here would leave the
   *  page the instant it was made, which is the clearest possible sign the verb was wrong. */
  React.useEffect(() => { setPlanUsed(planUsedToday(today)); }, [today]);

  const quickAdd = async () => {
    const text = draft.trim();
    if (!text || saving) return;
    setSaving(true);
    try {
      await addUserTask(todayQuickAddFields(text, today));
      setDraft("");
    } catch {
      flash("Could not add that — try again");
    } finally {
      setSaving(false);
    }
  };

  /** Un-tick a cleared item — the completion primitive's own reverse, never a compensating write. */
  const undoDone = async (c: BoardCard) => {
    if (!c.userTaskId) return;
    try {
      await updateUserTask(c.userTaskId, { done: false, completedAt: undefined });
    } catch {
      flash("Could not undo that — try again");
    }
  };

  return (
    /* ⚠️ THE ALIGNMENT CONTRACT (tasks-pages P1). This page used to render `.tdw` at its root —
       no theme root, no column, no top token — so the sidebar mounted LEVEL WITH THE TITLE and
       the header sat squashed against the top bar. The squash WAS the missing token: the page
       never wore `.tdb-col`, whose `--tdb-chrome-gap` is where every other Tasks title gets its
       offset. It stands on TasksPageLayout now, same as the rest. */
    <div className="t-f12 spine-root">
      <div className="tdb-wrap today-off">
      <TasksPageLayout
        title="Today"
        /* ⚠️ THE DASHBOARD'S GRAMMAR (tasks-viewport P2; ref today-redesign.html). Mono eyebrow
           over a Playfair title over a pill stat row — this page must read as a sibling of the
           Dashboard, not as a narrow board. Both derivations are the DASHBOARD'S OWN, imported
           rather than reimplemented, so the two pages cannot disagree about the date or the
           week. */
        eyebrow={todayEyebrow(longDate(new Date(now)), weekOfQuerying(queries, new Date(now)))}
        titleActions={
          <>
            {/* ⚠️ ONE HEIGHT FOR THE PAIR, and the ink one is DISABLED AT ZERO — an enabled
                "Work the list" with nothing committed offers to walk an empty list. The house
                disabled grammar (paper, hairline, faint, not-allowed), never opacity. */}
            <button
              type="button"
              className="tdt-ghost"
              onClick={() => document.getElementById("tdt-add")?.focus()}
            >
              <Plus size={13} aria-hidden /> Add to today
            </button>
            <button
              type="button"
              className="tdt-ink"
              disabled={committed.length === 0}
              onClick={() => window.dispatchEvent(new CustomEvent(TODO_WORK_THE_LIST))}
            >
              <Play size={12} aria-hidden /> Work the list
            </button>
          </>
        }
        /* ⚠️ THE PILL ROW REPLACES THE PROSE SUBTITLE ENTIRELY, and it REPORTS rather than
            appraises: three figures, no verdict on whether that is a good day's showing. The
            estimate pill is absent when nothing carries one — "Estimated 0 min" would state an
            absence as a figure. */
        beneath={
          <div className="tdt-stats">
            {todayStats(committed.length, done.length, estimateTotal(committed.map((c) => c.estimateMin)))
              .map((st) => (
                <span key={st.label} className="tdt-stat">
                  {st.label} <b>{st.value}</b>
                </span>
              ))}
          </div>
        }
      >
        {/* ⚠️ TWO NAMED REGIONS, SIDE BY SIDE (tasks-viewport P2; ref today-redesign.html).
            Today's list takes the measure; Up next sits in a ~320px right rail behind a left
            hairline. EACH SCROLLS INDEPENDENTLY under its own hem, so a long list never pushes
            the suggestions off the page and neither region can take the header with it. */}
        <div className="tdt-split">

          {/* ── TODAY'S LIST ──────────────────────────────────────────────── */}
          <div className="tdt-region">
            {/* ⚠️ THE PLAN CARD — white, hairline, above the list. It opens the pass over Up next
                and DISMISSES FOR THE DAY once used: repeating the offer the same afternoon is
                nagging, and tomorrow it is a fresh day. Not rendered when there is nothing to
                plan from. */}
            {!planUsed && bench.length > 0 && (
              <div className="tdt-plan">
                <ArtSlot name="seize-the-day" maxWidth={62} className="tdt-planart" />
                <div className="tdt-plantx">
                  <b>Seize the day</b>
                  <p>Populate today’s list with your most pressing actions, then get them done.</p>
                </div>
                <button
                  type="button"
                  className="tdt-ink"
                  onClick={() => {
                    markPlanUsed(today);
                    setPlanUsed(true);
                    window.dispatchEvent(new CustomEvent(TODO_WORK_THE_LIST));
                  }}
                >
                  Start →
                </button>
              </div>
            )}

            {/* ⚠️ THE SECTION HEAD: 18px line icon centred on the cap-height, Playfair title, the
                figures right of it, then a PLAIN sentence beneath — never italic. */}
            <div className="tdt-sechead">
              <ListChecks size={18} strokeWidth={1.8} aria-hidden className="tdt-secicon" />
              <h2>Today’s list</h2>
              <span className="tdt-seccount">{todayListCount(committed.length, done.length)}</span>
            </div>

            <TplZone label="Today’s list" hem={committed.length + done.length > 6}>
              {committed.map((c) => (
                <div key={c.key} className="tdt-row">
                  <span className="tdt-tick" aria-hidden />
                  <div className="tdt-rowmain">
                    <div className="tdt-t">{c.title}</div>
                    <div className="tdt-chips">
                      {/* ⚠️ THE DUE-TODAY CHIP is the seam between "a list you built" and the
                          surfacing rule — an item that arrived on its own date says so, or the
                          list quietly stops being yours. */}
                      {c.surfaced && c.committedDate !== today && <span className="tdt-chip pk">Due today</span>}
                      {c.record && <span className="tdt-chip">{c.record}</span>}
                      {estimateChip(c.estimateMin) && (
                        <span className="tdt-chip est">⏲ {estimateChip(c.estimateMin)}</span>
                      )}
                    </div>
                  </div>
                  {/* the reserved corner — the ⋯ keeps its seat whether or not the row is
                      actionable, so rows do not shuffle as you read down them */}
                  <span className="tdt-act">
                    {c.record && <button type="button" className="tdt-rowink">Action</button>}
                    <button type="button" className="tdt-dots" aria-label={`Actions for ${c.title}`}>
                      <MoreHorizontal size={14} aria-hidden />
                    </button>
                  </span>
                </div>
              ))}

              {committed.length === 0 && !deskClear && (
                <div className="tdt-empty">Nothing committed yet — add something below, or take one from Up next.</div>
              )}

              {/* CLEARED — settling IN PLACE, struck through, with the time and a way back. They
                  stay for the rest of the day: erasing what you finished would hide the only
                  evidence the day went anywhere. */}
              {done.map((c) => (
                <div key={c.key} className="tdt-row done">
                  <span className="tdt-tick on" aria-hidden>✓</span>
                  <div className="tdt-rowmain">
                    <div className="tdt-t">{c.title}</div>
                    <div className="tdt-chips"><span className="tdt-chip">{clearedAtLabel(c.whenMs)}</span></div>
                  </div>
                  {c.userTaskId && (
                    <span className="tdt-act">
                      <button type="button" className="tdt-ghost sm" onClick={() => void undoDone(c)}>
                        <Undo2 size={12} aria-hidden /> Undo
                      </button>
                    </span>
                  )}
                </div>
              ))}

              {/* ⚠️ ART · DESK-CLEAR — the workspace's one full illustration, and the rarest
                  thing in it (the three-way AND above). */}
              {deskClear && (
                <div className="tdt-deskclear">
                  <ArtSlot name="desk-clear" />
                  <h3>The desk is clear.</h3>
                  <p>Nothing urgent, nothing waiting, nothing left to suggest.</p>
                  <div className="tdt-dcacts">
                    <button type="button" className="tdt-ink" onClick={() => onNavigatePath("/manuscripts")}>
                      Go and write →
                    </button>
                    <button type="button" className="tdt-ghost" onClick={() => document.getElementById("tdt-add")?.focus()}>
                      ＋ Add a task
                    </button>
                  </div>
                </div>
              )}
            </TplZone>

            {/* THE QUICK-ADD — at the region's foot, OUTSIDE the zone so it never scrolls away
                from the list it adds to. One verb, one kind of thing: a TASK DUE TODAY, never a
                note (a note made here would leave the page the instant it was made). */}
            <div className="tdt-add">
              <input
                id="tdt-add"
                type="text"
                value={draft}
                disabled={saving}
                placeholder="Add something to today…"
                aria-label="Add something to today"
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); void quickAdd(); }
                  if (e.key === "Escape") setDraft("");
                }}
              />
              <button
                type="button"
                className="tdt-addbtn"
                onClick={() => void quickAdd()}
                disabled={!draft.trim() || saving}
              >
                {saving ? "Adding…" : "Add"}
              </button>
            </div>
          </div>

          {/* ── UP NEXT ───────────────────────────────────────────────────────
              ⚠️ "UP NEXT", NEVER "THE BENCH". THE COPY LAW: no private metaphors for functional
              elements. "The bench" meant something to whoever named it and nothing to a writer
              reading it for the first time; a suggestion list is called what it is.
              ⚠️ AND IT CARRIES NO COUNT, ANYWHERE. A number here invites you to work through a
              pile; these are the most pressing few, and the list above is the only one with a
              length worth stating. */}
          <aside className="tdt-rail" aria-label="Up next">
            <div className="tdt-sechead">
              <LoaderCircle size={18} strokeWidth={1.8} aria-hidden className="tdt-secicon" />
              <h2>Up next</h2>
            </div>
            <p className="tdt-secsub">Suggested items from your to-do list</p>

            <TplZone label="Up next" hem={bench.length > 3}>
              {bench.map((b) => (
                <div
                  key={b.card.key}
                  className="tdt-brow"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", b.card.key)}
                >
                  <div className="tdt-bt">{b.card.title}</div>
                  {/* the why-line is per REASON, from the shared derivation — never a generic
                      "suggested", which would make three rows look like one rule */}
                  <div className="tdt-why">{b.why}</div>
                  <button
                    type="button"
                    className="tdt-ghost sm"
                    onClick={() => window.dispatchEvent(new CustomEvent(TODO_ADD_TO_TODAY, { detail: { key: b.card.key } }))}
                  >
                    <Plus size={12} aria-hidden /> Add to today
                  </button>
                </div>
              ))}
              {bench.length === 0 && (
                <div className="tdt-empty">Nothing to suggest — your to-do list is clear.</div>
              )}
            </TplZone>
            <p className="tdt-drag">Drag an item across to add it.</p>
          </aside>
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
    </div>
  );
};
