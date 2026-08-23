/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ CARD + DATA → THE FACTS THREE SURFACES READ (tasks-workflow, Pack A) ═════════════════════
 *
 * ⚠️ THIS IS A PURE LIFT AND NOTHING MORE. Every function here was a closure inside `ToDoPage`,
 * moved verbatim with its captured scope turned into parameters. No behaviour is changed, no shape
 * is changed, and `ToDoPage` calls each one exactly where it called the closure — through a local
 * wrapper of the same name, keeping the same memoisation.
 *
 * ⚠️ WHY THEY HAD TO LEAVE THE PAGE, stated so the next reader does not undo it. The task pane's
 * session is being extracted into a hook (Pack B), and the pane's journey is built from these three
 * — while the LIST also reads them: `listRowInputs` is handed to `TaskList` as `rowInputs` and
 * drives the view's sort key, and `figureFor` reads the board columns the subtitle, FILTERS and the
 * badge read. A hook that owned them would be a SECOND reading of facts the list already has, which
 * is the fault this codebase has been caught by more than any other. Lifting them means the pane
 * and the list call one function, which is the property that made the hook possible at all.
 *
 * ⚠️ THE DATA ARRIVES AS ONE BUNDLE, NOT FIVE ARGUMENTS. `TaskData` is what the db provider already
 * hands the page; passing it whole keeps every call site to two arguments and means adding a field
 * later does not re-open every signature.
 */
import type { Activity, Agent, Manuscript, Query, QueryStatus, TaskFlag, UserTask } from "../types";
import type { BoardCard } from "./todoBoard";
import { rowFigure, daysSince, waitAnchorMs, RowFigure, cardBucket } from "./todoBuckets";
import { snoozedCards, boardEligible } from "./todoColumns";
import { queriesMissingMaterials } from "./queryMaterialsGap";
import { recordSweepRow, type RecordSweepRow } from "./materialsSweep";
import { sendSpecFor } from "./todoDock";
import { formatQueryMaterials } from "./materials";
import { daysBetween } from "./elapsed";
import { agentPrimary } from "./agentDisplay";
import { getPrimaryAction } from "./queryPrimaryAction";

/** What the db provider already holds — passed whole rather than five arguments deep. */
export interface TaskData {
  queries: Query[];
  agents: Agent[];
  manuscripts: Manuscript[];
  userTasks: UserTask[];
  activities: Activity[];
}

/**
 * ⚠️ `responseReceivedAt` and `lastStatusChange` are `Timestamp | string` — the derived pair carry
 * whichever the write left. One coercion, at the only place that reads them.
 *
 * (Moved from `ToDoPage` with its comment: it was declared beside `figureFor`, which is one of two
 * callers, and duplicating it in the other would have been a second coercion of one fact.)
 */
export const isoOf = (v: unknown): string | undefined => {
  if (typeof v === "string") return v;
  const d = (v as { toDate?: () => Date } | undefined)?.toDate?.();
  return d ? d.toISOString() : undefined;
};

/**
 * The row's figure — the number a card states about itself.
 *
 * ⚠️ `snoozedKeys` AND `now` ARE PARAMETERS BECAUSE THEY WERE CAPTURED. The closure read
 * `boardCols.snoozed` (the page's own board derivation, shared with the subtitle, FILTERS and the
 * badge) and the render's `now`. Passing them keeps this pure and keeps the caller's board the ONE
 * board — deriving the columns here would be the duplication this module exists to prevent.
 */
export function figureFor(
  c: BoardCard,
  db: TaskData,
  /**
   * ⚠️ THE FLAGS ARE THEIR OWN ARGUMENT, NOT A SIXTH FIELD ON `TaskData` (Pack A2), and the reason
   * is memoisation rather than tidiness. `TaskData` is memoised on the page and
   * `listRowInputs`' `useCallback` depends on it — and Pack A found that callback's IDENTITY
   * decides when `TaskList` re-renders. `listRowInputs` does not read flags, so folding them into
   * the bundle would re-render the list every time any flag changed, for a value it never uses.
   * One argument, to the one function that needs it.
   */
  flags: TaskFlag[],
  now: number,
): RowFigure {
  const ag = c.agentId ? db.agents.find((a) => a.id === c.agentId) : undefined;
  const q = c.relatedRecordId ? db.queries.find((x) => x.id === c.relatedRecordId) : undefined;
  const ut = c.userTaskId ? db.userTasks.find((t) => t.id === c.userTaskId) : undefined;
  const statedWeeks = typeof ag?.responseTimeWeeks === "number" && ag.responseTimeWeeks > 0
    ? ag.responseTimeWeeks : undefined;
  const ballHolder = q ? getPrimaryAction(q.status as QueryStatus).ballHolder ?? null : null;
  /**
   * ⚠️ "IS THIS CARD ASLEEP?" IS ANSWERED HERE NOW, FROM DATA (Pack A2). It used to arrive as a
   * `snoozedKeys` set the page built from `boardCols.snoozed` — which reaches back through
   * `assembleBoardColumns` to `pendingSaveId`, page state, and that is what stopped
   * `useTaskPaneSession` building its journey from `(card, data)` alone.
   *
   * ⚠️ IT CALLS THE SAME FUNCTION `boardColumns` CALLS, deliberately, rather than re-expressing the
   * predicate. `boardColumns` builds its column as
   * `boardEligible(snoozedCards({ flags, queries, agents, manuscripts, userTasks, nowMs }))`, and
   * every one of those six is data. Writing a cheaper card→flag test here would have been a
   * SECOND expression of the rule, and equality with the column would then be a claim to prove
   * rather than a property of construction — which is the whole fault this extraction removes.
   *
   * ⚠️ AND `pendingSaveId` NEVER REACHED THIS COLUMN. `assembleBoardColumns` filters `userTasks`
   * by `hiddenUserTaskId` only for `assembleBoard` — the LANES — and hands `boardColumns` the
   * UNFILTERED `input.userTasks`. So the two readings were never capable of disagreeing about
   * sleep, mid-save or at rest; the parameter carried a dependency the value never had.
   */
  const asleep = boardEligible(snoozedCards({
    flags, queries: db.queries, agents: db.agents,
    manuscripts: db.manuscripts, userTasks: db.userTasks, nowMs: now,
  })).some((x) => x.key === c.key);
  if (asleep) {
    return rowFigure({ card: c, backOn: (c.due || "").replace(/^BACK\s+/i, "") });
  }
  /* ⚠️ AN OFFER'S FIGURE IS THE REPLY-BY, and it may be NEGATIVE — the card reads "Reply was due /
     3 days ago" rather than a figure quietly clamped to zero. */
  if (c.taskType === "offer_received" && q?.responseDeadline) {
    const left = Math.ceil((Date.parse(q.responseDeadline) - now) / 86400000);
    if (Number.isFinite(left)) return rowFigure({ card: c, replyWithinDays: left });
  }
  const anchor = waitAnchorMs(cardBucket(c), c.taskType, {
    dateSent: q?.dateSent,
    partialRequestedDate: q?.partialRequestedDate,
    fullRequestedDate: q?.fullRequestedDate,
    partialSentDate: q?.partialSentDate,
    fullSentDate: q?.fullSentDate,
    lastNudgeSentDate: q?.lastNudgeSentDate,
    lastReplyAt: isoOf(q?.responseReceivedAt),
    statusMovedAt: isoOf(q?.lastStatusChange),
    createdAt: ut?.createdAt,
  });
  return rowFigure({
    card: c,
    statedWeeks,
    ballHolder,
    elapsedDays: Number.isFinite(anchor) ? daysSince(anchor, now) : undefined,
  });
}

/**
 * What a list row needs beyond its card, and every one of these is a lookup rather than a new
 * derivation. `waitAnchorMs` is the SAME clock the rail's figure already runs on, so the row's
 * duration and the pane's cannot disagree; `sendSpecFor` is what already decides partial-versus-
 * full; `queriesMissingMaterials` is the derivation the bulk card was raised by.
 *
 * ⚠️ AND WHERE THE RECORD IS SILENT, THIS RETURNS NULL RATHER THAN A GUESS. `listMeta` falls back
 * to the agent-and-agency pair, which is the contract's own instruction.
 */
export function listRowInputs(c: BoardCard, db: TaskData) {
  const q = c.relatedRecordId ? db.queries.find((x) => x.id === c.relatedRecordId) : undefined;
  const anchorMs = waitAnchorMs(cardBucket(c), c.taskType, {
    dateSent: q?.dateSent,
    partialRequestedDate: q?.partialRequestedDate,
    fullRequestedDate: q?.fullRequestedDate,
    partialSentDate: q?.partialSentDate,
    fullSentDate: q?.fullSentDate,
    lastNudgeSentDate: q?.lastNudgeSentDate,
    lastReplyAt: isoOf(q?.responseReceivedAt),
    statusMovedAt: isoOf(q?.lastStatusChange),
    createdAt: c.userTaskId ? db.userTasks.find((t) => t.id === c.userTaskId)?.createdAt : undefined,
  });
  const spec = sendSpecFor(c);
  const offer = isoOf(q?.offerDate);
  const ag = c.agentId ? db.agents.find((a) => a.id === c.agentId) : undefined;
  return {
    agency: ag?.agency ?? null,
    days: Number.isFinite(anchorMs) ? daysBetween(anchorMs, Date.now()) : null,
    partial: spec?.material === "partial",
    /* the ask, through the ONE materials formatter — absent when the request recorded none */
    ask: formatQueryMaterials(q?.materialsWanted),
    offeredOn: offer ? new Date(offer).toLocaleDateString("en-GB", { day: "numeric", month: "long" }) : null,
    bulkCount: c.taskType === "materials_unrecorded_bulk"
      ? queriesMissingMaterials({
          queries: db.queries, activities: db.activities, agents: db.agents,
          manuscripts: db.manuscripts, displayName: agentPrimary,
        }).length
      : null,
  };
}

/** The cohort's rows — the SAME derivation the bulk card was raised by, never a second one. */
export function recordSweepFor(card: BoardCard, db: TaskData): RecordSweepRow[] | undefined {
  if (card.taskType !== "materials_unrecorded_bulk") return undefined;
  const gaps = queriesMissingMaterials({
    queries: db.queries, activities: db.activities, agents: db.agents,
    manuscripts: db.manuscripts, displayName: agentPrimary,
  });
  if (!gaps.length) return undefined;
  return gaps.map((g) => {
    const ag = db.agents.find((a) => a.id === g.agentId);
    return recordSweepRow(g, {
      ...(ag?.agency ? { agency: ag.agency } : {}),
      sentOn: new Date(g.dateSent).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
      ...(ag?.materialsWanted ? { agentMaterials: ag.materialsWanted } : {}),
    });
  });
}
