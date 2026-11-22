/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v60 — FIRST USE (ref design-refs/dashboard-v60/dashboard-v60.html).
 *
 * Two pure derivations, so the page computes nothing of its own:
 *
 *   - `isPreQuery` — the ONE predicate. Before the writer's first query on the active manuscript the
 *     desktop shows the set-up card, the Mentor's tip and Getting started (first visit v1), and the phone
 *     its own first run. ⚠️ IT IS DATA, NEVER A FLAG: the set-up answer is stored, the state is not.
 *   - `agentCoverage` — the "Agents on file" snapshot. Its figures are the Contact list's OWN: the
 *     standing per agent is `agentQueryStates` (via `deskModel`, which also gives "added this week" from
 *     the London Monday–Sunday weeks of `qcDeskWeeks`), and ready is `nextStep(...).ready`, the one ready
 *     rule. Nothing here re-derives either.
 */
import type { Agent, Manuscript, Query } from "../types";
import { deskModel } from "./contactDesk";
import { nextStep } from "./contactNextStep";
import { bookGenres } from "./genreMatch";

/* ── the one predicate ─────────────────────────────────────────────────────────────────────── */

/** No query on the active manuscript that the chart would draw or count. */
export const isPreQuery = (scopedQueries: readonly Query[]): boolean => scopedQueries.length === 0;

/* ── Agents on file ────────────────────────────────────────────────────────────────────────── */

export interface AgentCoverage {
  total: number;
  /** an active query on this manuscript (its latest is not closed) */
  querying: number;
  /** its latest query on this manuscript is closed */
  closed: number;
  /** no query on this manuscript */
  none: number;
  /** querying + closed */
  queried: number;
  /** `nextStep(...).ready` — open, not queried, takes the book or genres unknown */
  ready: number;
  /** `dateAdded` in this London Monday–Sunday week */
  addedThisWeek: number;
  /** queried as a whole percentage of total (0 with no agents) */
  pct: number;
}

export function agentCoverage(input: {
  agents: readonly Agent[];
  queries: readonly Query[];
  manuscript: Manuscript | null;
  now: Date;
  todayIso: string;
}): AgentCoverage {
  const { agents, queries, manuscript, now, todayIso } = input;
  const msId = manuscript?.id ?? null;
  /* hk is Housekeeping's input to the desk's third card, which this snapshot does not read */
  const desk = deskModel({ agents, queries, msId, now, hk: { complete: 0, total: 0, gaps: 0, gapAgents: 0 } });
  const step = nextStep({ agents, queries, msId, book: bookGenres(manuscript), todayIso });
  const total = agents.length;
  const querying = desk.queried.active;
  const closed = desk.queried.closed;
  const queried = desk.queried.queried;
  return {
    total, querying, closed, none: total - queried, queried,
    ready: step.ready.length,
    addedThisWeek: desk.week.bars[desk.week.bars.length - 1] ?? 0,
    pct: total ? Math.round((queried / total) * 100) : 0,
  };
}

/* ── "Ready for lift off?" ─────────────────────────────────────────────────────────────────── */

/* ⚠️ "Ready for lift off?" (`firstUseTiles`, `tilesDone`) and "Where do I start?" (`startAnswers`, `spotOf`,
   `START_TARGETS`) are RETIRED with their components (Dashboard first visit v1, Part E). Recoverable at d6726195. */
