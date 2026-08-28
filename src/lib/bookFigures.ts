/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE BOOK PAGE'S FIVE FIGURES ══════════════════════════════════════════════════════════════
 *
 * Queries sent · Responses · Still open · Agents holding · Last sent, in a strip under the tab rail.
 *
 * ⚠️ NOT IN THE MASTHEAD, AND THAT IS A CONTRACT DECISION RATHER THAN A LAYOUT ONE. A masthead
 * carrying live figures becomes a dashboard, and `PageHeader` is shared by ten pages — its `count`
 * slot was deleted once already for this reason.
 *
 * ⚠️ EVERY FIGURE IS DERIVED AT READ TIME, and every predicate is the app's existing one rather
 * than a second opinion: `isResponse` from packageMetrics for responses (the canonical rule, one response per query
 * however far it travelled) and `TERMINAL_STATUSES` for what counts as closed. A page that decided
 * "open" for itself would eventually disagree with the Contact list about the same query.
 */
import { Query, QueryStatus } from "../types";
import { isResponse } from "./packageMetrics";
import { TERMINAL_STATUSES } from "./agentList";

export interface BookFigure {
  key: string;
  /** Already resolved to its display form — a count, or a date, or `—` for a thing that has not happened. */
  value: string;
  label: string;
}

const isOpen = (q: Query): boolean => !TERMINAL_STATUSES.includes(q.status as QueryStatus);

const toMs = (d: unknown): number | null => {
  if (typeof d !== "string" || !d) return null;
  const t = Date.parse(d);
  return Number.isNaN(t) ? null : t;
};

/** `8 Aug` — a glance, not a record, so no year. Matches the plate's own format. */
const shortDate = (ms: number): string =>
  new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/**
 * ⚠️ `0` IS WRITTEN WHERE ZERO IS TRUE AND `—` WHERE NOTHING HAPPENED. A count of nought queries is
 * a true count; a last-sent date for a book never sent is not a date at all, and `0` there would
 * assert an event. The same split the plate's stat cells already make.
 *
 * ⚠️ AND `Agents holding` COUNTS DISTINCT AGENTS, NOT QUERIES. Two open queries with one agent is
 * one agent holding your work — counting queries would state a number that is true of something
 * else and label it with this.
 */
export const bookFigures = (queries: readonly Query[]): BookFigure[] => {
  const open = queries.filter(isOpen);
  const holding = new Set(open.map((q) => q.agentId).filter(Boolean));
  const sent = queries.map((q) => toMs(q.dateSent)).filter((t): t is number => t !== null);
  return [
    { key: "sent", label: "Queries sent", value: String(queries.length) },
    { key: "responses", label: "Responses", value: String(queries.filter(isResponse).length) },
    { key: "open", label: "Still open", value: String(open.length) },
    { key: "holding", label: "Agents holding", value: String(holding.size) },
    { key: "last", label: "Last sent", value: sent.length ? shortDate(Math.max(...sent)) : "—" },
  ];
};
