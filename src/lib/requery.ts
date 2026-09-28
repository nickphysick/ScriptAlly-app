/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * A REQUERY EXPLAINS ITSELF (clean-up pass, item 2, 28 Sep). "Requery sent" alone does not say why;
 * every surface that draws one adds the earlier query's outcome and date, as a link to that query.
 *
 * ⚠️ ONE CHECK, USED BY THE LOG AND BY EVERY READER. The earlier query is:
 *   · the same agent, for the same manuscript — never another book;
 *   · not the query itself;
 *   · CLOSED (passed, no reply, withdrawn or signed) — a live one is a duplicate, not a requery;
 *   · sent strictly EARLIER than this one — an older query cannot be explained by a newer one;
 *   · still existing — it is looked for in the live list, so an undone log or a deleted query is
 *     simply not there, and a requery whose earlier query has gone draws no link rather than a dead one.
 * Where several qualify, the LATEST earlier one: that is the one the writer is re-approaching after.
 * It is worked out when it is read, never stored, so a correction or a delete moves it by itself.
 */
import { QueryStatus, type Query } from "../types";
import { dayMonth } from "./packageResults";

const CLOSED: ReadonlySet<string> = new Set([QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE, QueryStatus.SIGNED]);
const ms = (v: unknown): number => {
  if (typeof v === "string") return Date.parse(v.length === 10 ? `${v}T00:00:00` : v);
  const o = v as { seconds?: number } | null;
  return o && typeof o.seconds === "number" ? o.seconds * 1000 : NaN;
};

type Q = Pick<Query, "id" | "agentId" | "manuscriptId" | "status" | "dateSent"> & Partial<Pick<Query, "lastStatusChange" | "rejectedDate">>;

/** The earlier, closed, still-existing query to the same agent for the same book — or null. */
export function previousQueryFor<T extends Q>(q: Q, queries: readonly T[], sentAt?: number): T | null {
  const own = sentAt ?? ms(q.dateSent);
  if (!Number.isFinite(own)) return null;
  let best: T | null = null;
  for (const o of queries) {
    if (o.id === q.id || o.agentId !== q.agentId || o.manuscriptId !== q.manuscriptId) continue;
    if (!CLOSED.has(o.status)) continue;
    const t = ms(o.dateSent);
    if (!Number.isFinite(t) || t >= own) continue;
    if (!best || t > ms(best.dateSent)) best = o;
  }
  return best;
}

/** When the earlier query closed: its last status change, else its rejection date, else when it went out. */
const closedAt = (o: Q): number => {
  for (const v of [o.lastStatusChange, o.rejectedDate, o.dateSent]) { const t = ms(v); if (Number.isFinite(t)) return t; }
  return NaN;
};

/** "previously closed 12 Aug, no reply" · "previously passed 3 Jul" · "previously withdrawn 3 Jul". */
export function previousOutcome(o: Q): string {
  const d = dayMonth(closedAt(o));
  switch (o.status) {
    case QueryStatus.REJECTED: return `previously passed ${d}`;
    case QueryStatus.NO_RESPONSE: return `previously closed ${d}, no reply`;
    case QueryStatus.WITHDRAWN: return `previously withdrawn ${d}`;
    case QueryStatus.SIGNED: return `previously signed ${d}`;
    default: return `previously queried ${d}`;
  }
}

/** The line a surface draws, or null when there is no earlier query to explain it. */
export function requeryLine<T extends Q>(q: Q, queries: readonly T[]): { text: string; queryId: string } | null {
  const prev = previousQueryFor(q, queries);
  return prev ? { text: `Requery · ${previousOutcome(prev)}`, queryId: prev.id } : null;
}
