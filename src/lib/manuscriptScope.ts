/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * manuscriptScope — THE ONE PLACE THE DASHBOARD DECIDES WHAT BELONGS TO A BOOK (B2).
 *
 * ⚠️ SCOPING IS A CLASSIFICATION, NOT A FILTER — which is why it lives here rather than as a
 * `.filter()` at each call site. Three records answer "which manuscript?" three different ways,
 * and one of them cannot answer at all:
 *
 *   Query      · `manuscriptId`, required and rules-enforced         → scope directly
 *   Activity   · `manuscriptId`, required — but agent events are
 *                written with `""` DELIBERATELY (they are not
 *                query-scoped)                                       → scope query events only
 *   Task       · NO manuscript id at all; only `manuscriptTitle`,
 *                a display string                                    → resolve via its query
 *   Agent      · no manuscript field, and correctly so               → never scoped
 *
 * ⚠️ IDENTITY IS BY ID. `Task.manuscriptTitle` exists and is tempting; matching on it is the
 * string-matching this codebase forbids, and two books may share a title.
 *
 * ⚠️ AN ACCOUNT-SCOPED THING IS NOT A GAP TO BE FILLED. An agent-keyed housekeeping task ("no
 * reply window on file") is a fact about a PERSON, true whichever book is selected; an agent event
 * is the same. Hiding them when the scope changes would lose real work, and a feed that empties
 * when you switch books is worse than one carrying a little unfiltered context.
 */
import { Activity, Query, Task } from "../types";

/** Query events carry a real `manuscriptId`; agent/manuscript-level events carry `""`. */
export const activityIsScoped = (a: Pick<Activity, "manuscriptId">): boolean =>
  typeof a.manuscriptId === "string" && a.manuscriptId.length > 0;

/**
 * The activities to show for a scope: everything belonging to this manuscript, PLUS everything
 * that belongs to no manuscript at all.
 */
export const scopeActivities = (activities: Activity[], manuscriptId: string | null): Activity[] =>
  manuscriptId === null
    ? activities
    : activities.filter((a) => !activityIsScoped(a) || a.manuscriptId === manuscriptId);

export const scopeQueries = (queries: Query[], manuscriptId: string | null): Query[] =>
  manuscriptId === null ? queries : queries.filter((q) => q.manuscriptId === manuscriptId);

/**
 * A task's manuscript, or `null` when it has none.
 *
 * ⚠️ RESOLVED THROUGH THE QUERY, because `Task` carries no id of its own. A task whose query has
 * been deleted resolves to null and is therefore ALWAYS VISIBLE — the alternative is a task about
 * work you still have to do quietly vanishing because its record went.
 */
export const taskManuscriptId = (
  task: Pick<Task, "relatedRecordId">,
  queries: Query[],
  manuscriptIds: ReadonlySet<string>,
): string | null => {
  const q = queries.find((x) => x.id === task.relatedRecordId);
  if (q) return q.manuscriptId || null;
  // A manuscript-keyed task points at the manuscript directly (querying_unstarted).
  return manuscriptIds.has(task.relatedRecordId) ? task.relatedRecordId : null;
};

/** Tasks for a scope: this manuscript's, plus every task that belongs to no manuscript. */
export const scopeTasks = (
  tasks: Task[],
  queries: Query[],
  manuscriptIds: ReadonlySet<string>,
  manuscriptId: string | null,
): Task[] => {
  if (manuscriptId === null) return tasks;
  return tasks.filter((t) => {
    const owner = taskManuscriptId(t, queries, manuscriptIds);
    return owner === null || owner === manuscriptId;
  });
};
