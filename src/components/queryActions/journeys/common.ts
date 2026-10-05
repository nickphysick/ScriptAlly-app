/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Small facts every journey reads the same way: an agent's first name and card line, how they take
 * queries, whether a query is live, and where its reply window closes.
 */
import { SubmissionMethod, QueryStatus, type Agent, type Query } from "../../../types";
import { addDays, dayOf, toDay, up, ymd } from "../../../lib/queryActions/dates";
import { expectedFor } from "../../../lib/qcSummary";

/** The three methods the drawer offers, in the mock's words, and the stored value each writes. */
export const VIA: [SubmissionMethod, string][] = [
  [SubmissionMethod.EMAIL, "Email"],
  [SubmissionMethod.QUERY_MANAGER, "QueryManager"],
  [SubmissionMethod.ONLINE_FORM, "Online form"],
];
export const viaLabel = (m: SubmissionMethod | string | undefined): string =>
  VIA.find(([k]) => k === m)?.[1] ?? (m === SubmissionMethod.POST ? "Post" : String(m ?? "Email"));
/** The chips for an agent — the three, plus Post when that is how this agent takes queries. */
export const viaOptions = (agent: Agent | null | undefined): [SubmissionMethod, string][] =>
  agent?.submissionMethod === SubmissionMethod.POST ? [...VIA, [SubmissionMethod.POST, "Post"]] : VIA;

export const firstName = (a: Agent | null | undefined): string => (a?.name || "The agent").trim().split(/\s+/)[0] || "The agent";
export const agentName = (a: Agent | null | undefined): string => (a?.name || a?.agency || "The agent").trim();
export const agencyOf = (a: Agent | null | undefined): string => (a?.agency || "").trim();
export const sameAgency = (a: Agent | null | undefined, b: Agent | null | undefined): boolean => {
  const x = agencyOf(a).toLowerCase();
  return !!x && x === agencyOf(b).toLowerCase();
};

/** Terminal — the query is finished, successfully or not. */
export const TERMINAL: ReadonlySet<string> = new Set([
  QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE, QueryStatus.SIGNED,
]);
export const isLive = (q: Pick<Query, "status">): boolean => !TERMINAL.has(q.status);
/** The writer owes the agent something. */
export const OWES: ReadonlySet<string> = new Set([QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.REVISE_RESUBMIT]);
export const owes = (q: Pick<Query, "status">): boolean => OWES.has(q.status);

/** Status as the drawer's card line writes it: sentence case. */
export const statusWords = (s: QueryStatus | string): string => {
  const m: Record<string, string> = {
    [QueryStatus.QUERIED]: "Queried", [QueryStatus.PARTIAL_REQUESTED]: "Partial requested", [QueryStatus.PARTIAL_SENT]: "Partial sent",
    [QueryStatus.FULL_REQUESTED]: "Full requested", [QueryStatus.FULL_SENT]: "Full sent", [QueryStatus.REVISE_RESUBMIT]: "Revise & resubmit",
    [QueryStatus.RESUBMITTED]: "Resubmitted", [QueryStatus.OFFER]: "Offer", [QueryStatus.SIGNED]: "Signed",
    [QueryStatus.REJECTED]: "Passed", [QueryStatus.WITHDRAWN]: "Withdrawn", [QueryStatus.NO_RESPONSE]: "Closed",
  };
  return m[s] ?? String(s);
};

/** `THE LANTERN AGENCY · QUERIED · SENT 14 AUG` */
export function whoLine(a: Agent | null | undefined, q: Query | null | undefined): string {
  const agency = agencyOf(a).toUpperCase();
  if (q) {
    const sent = toDay(q.dateSent);
    return [agency, statusWords(q.status).toUpperCase(), sent ? `SENT ${up(sent)}` : null].filter(Boolean).join(" · ");
  }
  const wks = a?.responseTimeWeeks && a.responseTimeWeeks > 0 ? `REPLIES IN ~${a.responseTimeWeeks} WKS` : "NO REPLY TIME ON FILE";
  return [agency, wks, viaLabel(a?.submissionMethod).toUpperCase()].filter(Boolean).join(" · ");
}

/** Does no reply mean no — this query's own answer first, else the agent's guidelines. */
export const nrmnOf = (q: Query | null | undefined, a: Agent | null | undefined): boolean =>
  typeof q?.nrmnOverride === "boolean" ? q.nrmnOverride : !!a?.noResponseMeansNo;

/** The day the reply window closes — the Query Centre's own clock, so the two cannot disagree. */
export function windowDay(q: Query, a: Agent | null | undefined): Date | null {
  const e = expectedFor(q, a ?? undefined);
  return e.ms != null ? dayOf(e.ms) : null;
}

/** The day the latest send went out: the full's if one has gone, else the partial's, else the query's. */
export function lastSendDay(q: Query): Date | null {
  return toDay(q.fullSentDate) ?? toDay(q.partialSentDate) ?? toDay(q.dateSent);
}

export const inDays = (d: Date, n: number) => addDays(d, n);

/* ── parking (Agent card v1 §6.4): a journey's answers as plain data, and back ─────────────── */

/** A day as a parked snapshot stores it — `YYYY-MM-DD`, never a Date in storage. */
export const dayOut = (d: Date | null | undefined): string | null => (d ? ymd(d) : null);
/** …and back to the local day it was, or null for anything else. */
export const dayIn = (v: unknown): Date | null =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00`) : null;
/** The answers a resumed journey starts from — its own snapshot, or nothing at all. */
export const seedOf = <T extends object>(req: { seed?: unknown }): Partial<T> =>
  req.seed && typeof req.seed === "object" ? (req.seed as Partial<T>) : {};
