/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * offerNotify — the pure layer of the offer journey's "Let your other agents know" step
 * (popup-notify-scrim P2; ref §2). Selection grouping, cautions, the duplicate guard, and the
 * reminder payloads. THIS STEP WRITES NO ACTIVITIES — its outputs are user-task fields only,
 * consumed by the existing `addUserTask` path (no schema change: text/agentId/queryId/dueDate all
 * pre-exist on UserTask).
 */
import { Agent, Query, QueryStatus, UserTask } from "../types";
import { agentPrimary } from "./agentDisplay";

/** Statuses where the agent is HOLDING PAGES (full/partial sent, R&R in progress). */
const PAGES_STATUSES: ReadonlySet<QueryStatus> = new Set([
  QueryStatus.PARTIAL_SENT,
  QueryStatus.FULL_SENT,
  QueryStatus.REVISE_RESUBMIT,
]);
const TERMINAL: ReadonlySet<QueryStatus> = new Set([
  QueryStatus.REJECTED,
  QueryStatus.WITHDRAWN,
  QueryStatus.NO_RESPONSE,
]);

export interface NotifyRow {
  queryId: string;
  agentId?: string;
  name: string;
  agency?: string;
  /** Mono status line — "FULL SENT" / "R&R IN PROGRESS" / "QUERIED 28 JUN". */
  statusLine: string;
  /** The quiet italic caution — ONLY where the agent's policy is actually held; never invented. */
  caution?: string;
  /** A live reminder already exists for this agent + this offer (the duplicate guard). */
  covered: boolean;
}

const shortDay = (iso?: string): string | null => {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short" }).toUpperCase();
};

function statusLine(q: Query): string {
  if (q.status === QueryStatus.REVISE_RESUBMIT) return "R&R IN PROGRESS";
  if (PAGES_STATUSES.has(q.status as QueryStatus)) return String(q.status).toUpperCase();
  const day = shortDay(q.dateSent);
  return day ? `QUERIED ${day}` : "QUERIED";
}

/** The duplicate guard: a LIVE (not done) reminder for the same agent + the same offer. */
export function alreadyCovered(userTasks: UserTask[], agentId: string | undefined, offerQueryId: string): boolean {
  if (!agentId) return false;
  return userTasks.some((t) => !t.done && t.agentId === agentId && t.queryId === offerQueryId);
}

/**
 * Every other open query on the offered manuscript, grouped HAVE YOUR PAGES then QUERY ONLY.
 * All pre-selected except covered rows (they render badged-and-locked, never minting duplicates).
 */
export function notifyGroups(
  offerQ: Query,
  queries: Query[],
  agents: Agent[],
  userTasks: UserTask[],
): { pages: NotifyRow[]; queryOnly: NotifyRow[] } {
  const row = (q: Query): NotifyRow => {
    const ag = agents.find((a) => a.id === q.agentId);
    return {
      queryId: q.id,
      agentId: q.agentId,
      name: ag ? agentPrimary(ag) : "Unknown agent",
      ...(ag?.agency ? { agency: ag.agency } : {}),
      statusLine: statusLine(q),
      ...(ag?.noResponseMeansNo ? { caution: "“no reply means no” agency" } : {}),
      covered: alreadyCovered(userTasks, q.agentId, offerQ.id),
    };
  };
  const others = queries.filter(
    (q) => q.manuscriptId === offerQ.manuscriptId && q.id !== offerQ.id && !TERMINAL.has(q.status as QueryStatus),
  );
  return {
    pages: others.filter((q) => PAGES_STATUSES.has(q.status as QueryStatus)).map(row),
    queryOnly: others.filter((q) => !PAGES_STATUSES.has(q.status as QueryStatus)).map(row),
  };
}

/**
 * One user task per selected agent: "Tell {agent} about the offer", linked to the agent AND the
 * OFFER query (the guard's key), due on the reply-by day. Reply-by unset → dueDate omitted (no
 * invented deadline — the task lands as a linked note rather than an urgent-lane reminder).
 */
export function reminderFields(
  selected: NotifyRow[],
  offerQueryId: string,
  replyBy?: string,
): { text: string; agentId?: string; queryId: string; dueDate?: string }[] {
  const due = replyBy ? replyBy.slice(0, 10) : undefined;
  return selected.map((r) => ({
    text: `Tell ${r.name} about the offer`,
    ...(r.agentId ? { agentId: r.agentId } : {}),
    queryId: offerQueryId,
    ...(due ? { dueDate: due } : {}),
  }));
}
