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
import { Play, Plus, Undo2 } from "lucide-react";
import { TodoSideContainer } from "./TodoSideContainer";
import { useTagWrites } from "./useTagWrites";
import { TasksPageLayout, TplGrow } from "./TasksPageLayout";
import { TODO_OPEN_TASK_SETTINGS } from "../../lib/todoRoutes";
import { TodoFacetId, facetCounts, applyFacet } from "../../lib/todoBoardSort";
import { useScriptAllyDb } from "../../lib/db";
import { todaySplit, BoardCard } from "../../lib/todoBoard";
import { assembleBoardColumns, liveBoardCards } from "../../lib/todoColumns";
import { tagUsageCounts, toggleTagSel, matchesTags } from "../../lib/todoTags";
import { localYMD } from "../../lib/shellSidebar";
import {
  todaySubtitle, clearedAtLabel, suggestedBench, todayQuickAddFields, benchHeading,
} from "../../lib/todoToday";
import { useTodoToast } from "./useTodoToast";
import "./todoSide.css";
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
  const subtitle = todaySubtitle(done.length, committed.length, now);

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

  /** ⚠️ Creates a TASK DUE TODAY — never a note (audit item 7). A note made here would leave the
   *  page the instant it was made, which is the clearest possible sign the verb was wrong. */
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
        subtitle={subtitle}
        tools={
          <>
            {/* ⚠️ INK, NOT PINK, AND DISABLED AT ZERO (corrections fix 6). Pink belongs to
                creation — the ＋ Add in the right slot keeps it. An enabled "Work the list" with
                nothing committed offers to walk an empty list: it earns its ink when the first
                item lands. The disabled grammar is the house one, never opacity. */}
            <button
              type="button"
              className="tdb-btnp tdt-work"
              disabled={committed.length === 0}
              onClick={() => window.dispatchEvent(new CustomEvent(TODO_WORK_THE_LIST))}
            >
              <Play size={12} aria-hidden /> Work the list
            </button>
            <TplGrow />
            <button
              type="button"
              className="tdb-addb"
              onClick={() => document.getElementById("tdt-add")?.focus()}
            >
              <Plus size={13} aria-hidden /> Add to today
            </button>
          </>
        }
        sidebar={
          /* The SAME container the board page mounts — one filter surface, two pages. Today's own
             list is already a single committed set, so the facet narrows what it shows without the
             board's four columns behind it. */
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

        {/* ── YOUR LIST FOR TODAY ──────────────────────────────────────────── */}
        <section className="tdt-card">
          <div className="tdt-head">
            <h2>Your list for today</h2>
            <span className="tdt-cn">{committed.length}</span>
            <span className="tdt-rule" aria-hidden />
          </div>

          <div className="tdt-rows">
            {committed.map((c) => (
              <div key={c.key} className="tdt-row">
                <span className="tdt-tick" aria-hidden />
                <span className="tdt-t">{c.title}</span>
                {/* ⚠️ THE DUE-TODAY CHIP is the seam between "a list you built" and the surfacing
                    rule. An item that arrived on its own date, rather than by your hand, says so —
                    otherwise the list quietly stops being yours. */}
                {c.surfaced && c.committedDate !== today && <span className="tdt-chip">Due today</span>}
                {c.record && <span className="tdt-meta">{c.record}</span>}
              </div>
            ))}

            {committed.length === 0 && (
              <div className="tdt-empty">
                Nothing committed yet — add something below, or lift one from the bench.
              </div>
            )}

            {/* THE QUICK-ADD — one verb, one kind of thing. */}
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

          {/* CLEARED — settling IN PLACE, struck through, with the time and a way back. They stay
              for the rest of the day: a list that erased what you finished would hide the only
              evidence the day went anywhere. */}
          {done.length > 0 && (
            <div className="tdt-done">
              <div className="tdt-donehead">{done.length} cleared today</div>
              {done.map((c) => (
                <div key={c.key} className="tdt-row done">
                  <span className="tdt-tick on" aria-hidden>✓</span>
                  <span className="tdt-t">{c.title}</span>
                  <span className="tdt-time">{clearedAtLabel(c.whenMs)}</span>
                  {c.userTaskId && (
                    <button type="button" className="tdt-undo" onClick={() => void undoDone(c)}>
                      <Undo2 size={13} aria-hidden /> Undo
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── THE SUGGESTED BENCH ──────────────────────────────────────────
            Dashed, because it is a proposal rather than a commitment. Capped at BENCH_MAX: a
            longer bench is a second to-do list beside the real one above it. */}
        {bench.length > 0 && (
          <section className="tdt-bench" aria-label="Suggested">
            {/* ⚠️ THE HEADING STATES THE BENCH, NOT ITS GUARANTEE (corrections fix 7). It used to
                read "never anything you have snoozed or dismissed" — the implementation promise,
                shouted at someone who never doubted it. The exclusion rule is still enforced in
                the derivation and still tested there; it simply does not headline. */}
            <div className="tdt-benchhead">
              {/* ⚠️ CARDS, from the SAME derivation as every other figure (tasks-audit P2).
                  This summed the raw LANES (member units — every sweep agent loose): 24 against
                  a 16-card world. The pool behind the bench is the To do column itself — the
                  card-unit remaining after today's list — so the header states THAT number. */}
              <b>Suggested for today</b> · {benchHeading(benchPool, filtersActive)}
            </div>
            {bench.map((b) => (
              <div key={b.card.key} className="tdt-brow">
                <span className="tdt-bt">{b.card.title}</span>
                <span className="tdt-why">{b.why}</span>
                <button
                  type="button"
                  className="tdt-badd"
                  onClick={() => window.dispatchEvent(new CustomEvent(TODO_ADD_TO_TODAY, { detail: { key: b.card.key } }))}
                >
                  ＋ Add
                </button>
              </div>
            ))}
          </section>
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
    </div>
  );
};
