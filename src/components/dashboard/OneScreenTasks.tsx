/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenTasks — the dashboard's window onto the To-do page (dashboard redesign, Phase 5).
 *
 * ⚠️ THIS IS A MIGRATION, NOT A RESTYLE, AND THE OLD CARD WAS COUNTING A DIFFERENT THING.
 * It built its own three-way split — `buildOverToYouRows` + `buildHousekeepingRows` +
 * `yourTasksToday` — on the MEMBER unit, while the rail badge beside it had already moved to
 * `boardFigures(assembleBoardColumns(...).cols).cards`, the CARD unit. Two numbers, one word, and
 * nothing on either surface saying which one "To-do" meant: the exact fault the counting-law
 * migration closed everywhere else in the app and left standing here. Every figure on this panel
 * now comes from `assembleBoardColumns` and every category from `lib/todoCategory`.
 *
 * ⚠️ THE PANEL DERIVES NO CATEGORY OF ITS OWN. `taskCategory` is exhaustive over `TaskType` and
 * closes with the house `never` idiom, so a thirteenth task type fails to compile until it says
 * where it belongs. A local branch here would be a second opinion that cannot fail that way.
 *
 * ⚠️ URGENT IS A LENS, NOT A BAND. `isUrgentCard` is deliberately absent from the five: a task
 * whose clock starts would otherwise change category as time passed, and the rule would redraw
 * itself overnight.
 */
import React, { Suspense, useMemo, useState } from "react";

/**
 * ⚠️ LAZY, AND IT IS NOT AN OPTIMISATION. The drawer reaches `useTaskCommit` → `lib/db` →
 * `lib/firebase`, which initialises the Firebase SDK AT MODULE LOAD; this repo's test environment is
 * `node` with no emulator, so a static import here put `auth/invalid-api-key` into the import graph
 * of ELEVEN dashboard suites and they stopped COLLECTING — the failure that reads as "no tests
 * found" rather than as a red. `OneScreenDashboard` already dodges the same trap by importing
 * `lib/firebase` dynamically inside an effect; this is that shape applied to a subtree.
 *
 * It is also a real saving: the dashboard does not pay for the To-do page's whole write layer
 * until somebody opens a ticket.
 */
const DashTaskDrawer = React.lazy(() =>
  import("./DashTaskDrawer").then((m) => ({ default: m.DashTaskDrawer })));
import { Activity, Agent, Manuscript, Query, Task, TaskFlag, User, UserTask } from "../../types";
import { OneScreenPanel } from "./OneScreenPanel";
import { OneScreenMark } from "./OneScreenMark";
import { EdgeFadeScroll } from "../EdgeFadeScroll";
import { TaskTicket } from "../todo/TaskTicket";
import { assembleBoardColumns } from "../../lib/todoColumns";
import { BoardCard } from "../../lib/todoBoard";
import { CATEGORIES, CATEGORY_FAMILY, CATEGORY_LABEL, isUrgentCard, taskCategory, type Category } from "../../lib/todoCategory";
import { listRowInputs } from "../../lib/taskCardFacts";
import { ticketFacts } from "../../lib/ticketFacts";
import { elapsedPhrase } from "../../lib/elapsed";
import { stateFor, STATE_TOKEN } from "../../lib/queryCardFacts";
import { localYMD } from "../../lib/shellSidebar";

/**
 * ⚠️ THE RULE'S ORDER IS NOT THE DECLARATION'S ORDER, AND THAT IS THE WHOLE OF PHASE 5's COLOUR
 * ANSWER. There are FIVE categories and THREE family papers — `req`+`nudge` share "now",
 * `quiet`+`house` share "house" — so five bands painted by family gives two pairs of identical
 * colours side by side. The ref's answer was five per-category tints, which are the chart's four
 * state fills plus the closed grey: the same colours would then mean STATE in the chart and
 * CATEGORY in the rule, on one page, which breaks the vocabulary rather than bending it.
 *
 * So: three papers, and the categories sharing one sit ADJACENT, separated by a card-coloured
 * hairline. The paper says which family, the separator says there are two of them in it, and the
 * legend names which is which. `CATEGORY_FAMILY` stays the only source of the fill.
 */
const RULE_ORDER: readonly Category[] = ["req", "nudge", "quiet", "house", "yours"];

/** the three family papers, as the tokens the pane and the ticket tag already read */
const FAMILY_FILL: Record<string, string> = {
  now: "var(--u-now-1)", house: "var(--u-house-1)", yours: "var(--u-yours-1)",
};

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
  onSeeAll: () => void;
  onAddManuscript?: () => void;
  onAddAgent?: () => void;
  onNavigate: (tab: string, sub?: string) => void;
  /**
   * ⚠️ THE FEED'S "Mark sent" OPENS THIS DRAWER, NOT ONE OF ITS OWN. The activity feed is a sibling
   * in another column, so the request arrives as a QUERY id and is resolved here against the live
   * board — which is the only place that knows which card a query is currently raising. A second
   * drawer over there would be a second answer to what finishing a send involves.
   */
  openForQueryId?: string | null;
  onOpenHandled?: () => void;
}

export const OneScreenTasks: React.FC<OneScreenTasksProps> = ({
  loading, tasks, queries, agents, manuscripts, userTasks, activities, taskFlags, currentUser,
  now, dayOne = false, onSeeAll, onAddManuscript, onAddAgent, onNavigate,
  openForQueryId, onOpenHandled,
}) => {
  const [filter, setFilter] = useState<Category | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);

  /* ⚠️ THE SAME CALL THE RAIL BADGE AND EVERY TASKS PAGE MAKE, on the dashboard's SCOPED arrays —
     so switching the manuscript chip moves this panel and nothing else about the derivation. */
  const cols = useMemo(() => assembleBoardColumns({
    tasks, userTasks, queries, agents, manuscripts, taskFlags, activities,
    now: now.getTime(), today: localYMD(now.getTime()), mutedTaskRules: currentUser?.mutedTaskRules,
  }).cols, [tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, now, currentUser?.mutedTaskRules]);

  /* ⚠️ THE BADGE COUNTS WHAT THE PANEL SHOWS, AND SNOOZED IS NOT SHOWN — the same two columns
     `boardFigures` reads, for the same reason its own note gives: a badge counting a set the page
     does not draw is the two-numbers fault arriving one surface along. */
  const live = useMemo<BoardCard[]>(() => [...cols.todo, ...cols.today], [cols]);

  const counts = useMemo(() => {
    const m = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
    for (const c of live) m[taskCategory(c)]++;
    return m;
  }, [live]);
  const total = live.length;

  const shown = useMemo(() => (filter ? live.filter((c) => taskCategory(c) === filter) : live), [live, filter]);
  const taskData = useMemo(() => ({ queries, agents, manuscripts, userTasks, activities }),
    [queries, agents, manuscripts, userTasks, activities]);

  /* ⚠️ THE OPEN CARD IS RESOLVED AGAINST THE LIVE BOARD, so a card that leaves the board while its
     drawer is open closes it rather than stranding a pane over a task that no longer exists. */
  /* ⚠️ TWO SELECTORS, ONE CARD. `openKey` is a ticket the writer clicked; `openForQueryId` is the
     feed asking for whichever card a query is currently raising. Resolving both here — rather than
     syncing one into the other in an effect — means there is no moment where they disagree. */
  const openCard = useMemo(
    () => live.find((c) => c.key === openKey)
      ?? (openForQueryId ? live.find((c) => c.relatedRecordId === openForQueryId) ?? null : null),
    [live, openKey, openForQueryId]);
  const closeDrawer = () => { setOpenKey(null); onOpenHandled?.(); };


  /* ── the rule ─────────────────────────────────────────────────────────────────────────────── */
  const bands = RULE_ORDER.map((c) => ({ c, n: counts[c], pct: total > 0 ? (counts[c] / total) * 100 : 0 }));

  const badge = filter
    ? { n: counts[filter], label: CATEGORY_LABEL[filter], fam: CATEGORY_FAMILY[filter] }
    : { n: total, label: "open", fam: null as string | null };

  return (
    <OneScreenPanel variant="os-tasks" probe="todo-card" loading={loading} skel={["h", "", "", ""]}>
      <div className="os-th2">
        <OneScreenMark name="tasks" />
        <h2>To-do list</h2>
        {/* ⚠️ ONE BADGE, TWO READINGS. At rest it is the open total; under a filter it is that
            category's count and name, in that category's own paper — so the badge always states
            what the tickets beneath it are, rather than a total the visible set contradicts. */}
        <span
          className="os-tbadge"
          data-probe="todo-badge"
          style={badge.fam ? { background: FAMILY_FILL[badge.fam] } : undefined}
        >
          <b>{badge.n}</b> {badge.label}
        </span>
        <button type="button" className="os-see" onClick={onSeeAll}>See all <span className="os-arr">→</span></button>
      </div>

      {!dayOne && total > 0 && (
        /* ⚠️ THE LEGEND IS AN OVERLAY, AND THAT IS THE REQUIREMENT RATHER THAN A STYLE. Revealing it
           must not move a single ticket — a legend that reflows the grid makes the thing you were
           about to click jump out from under the pointer. It is absolutely positioned over the
           tickets, so the grid's boxes are identical open or closed. */
        <div
          className={`os-rulezone${legendOpen ? " on" : ""}`}
          data-probe="todo-rule"
          onMouseEnter={() => setLegendOpen(true)}
          onMouseLeave={() => setLegendOpen(false)}
        >
          <div className="os-rule" role="group" aria-label="Filter by category">
            {bands.map(({ c, n, pct }) => (
              <button
                key={c}
                type="button"
                className={`os-rb${filter === c ? " on" : ""}`}
                style={{ width: `${pct}%`, background: FAMILY_FILL[CATEGORY_FAMILY[c]] }}
                aria-pressed={filter === c}
                aria-label={`${CATEGORY_LABEL[c]}, ${n}`}
                onClick={() => setFilter((f) => (f === c ? null : c))}
              />
            ))}
          </div>
          <div className="os-legend" hidden={!legendOpen}>
            {RULE_ORDER.map((c) => (
              <button
                key={c}
                type="button"
                className={`os-lg${filter === c ? " on" : ""}`}
                aria-pressed={filter === c}
                onClick={() => setFilter((f) => (f === c ? null : c))}
              >
                <i style={{ background: FAMILY_FILL[CATEGORY_FAMILY[c]] }} aria-hidden="true" />
                <b>{counts[c]}</b> {CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>
        </div>
      )}

      <EdgeFadeScroll fade="#fffdf9" outerClassName="os-tbodywrap" scrollClassName="os-tbody">
        {dayOne ? (
          <div className="os-tempty os-dayone-tasks">
            <span>Tasks appear here as your queries progress.</span>
            <div className="os-dayone-ctas">
              <button type="button" className="os-btn-mini ghost" onClick={onAddManuscript}>Add your manuscript</button>
              <button type="button" className="os-btn-mini ghost" onClick={onAddAgent}>Add an agent</button>
            </div>
          </div>
        ) : shown.length === 0 ? (
          <div className="os-tempty">
            <span>{filter ? `Nothing in ${CATEGORY_LABEL[filter].toLowerCase()}.` : "Nothing needs you today."}</span>
          </div>
        ) : (
          <div className="os-tkgrid">
            {shown.map((c) => {
              const inp = listRowInputs(c, taskData);
              return (
                <TaskTicket
                  key={c.key}
                  card={c}
                  snipped
                  /* the two tinted regions, from two different derivations: the edge is the QUERY's
                     state, the tag is the CARD's family. They never swap. */
                  edge={c.status ? STATE_TOKEN[stateFor(c.status)] : STATE_TOKEN.closed}
                  urgent={isUrgentCard(c, inp.days)}
                  selected={openKey === c.key}
                  facts={ticketFacts(c, {
                    days: inp.days,
                    dateLabel: inp.anchorDate,
                    elapsed: typeof inp.days === "number" ? elapsedPhrase(inp.days) : null,
                  })}
                  probeText={shown[0] === c ? "ticket-title" : undefined}
                  onOpen={() => setOpenKey(c.key)}
                />
              );
            })}
          </div>
        )}
      </EdgeFadeScroll>

      {/* ⚠️ MOUNTED ONLY ONCE A TICKET IS OPEN — with no fallback, deliberately. The drawer's own
          entrance is what announces it; a spinner in the sheet's place would be a second arrival. */}
      {openCard && (
        <Suspense fallback={null}>
          <DashTaskDrawer
            card={openCard}
            onClose={closeDrawer}
            onSeeAll={onSeeAll}
            onNavigate={onNavigate}
          />
        </Suspense>
      )}
    </OneScreenPanel>
  );
};
