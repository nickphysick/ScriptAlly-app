/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * packageAnalytics — the derivations behind the Package Workshop's Analytics tab that need more than
 * the package engine alone: they compose `packageMetrics` with the AGENT record (reply windows) and
 * with `taskPrecedence`, the app's one definition of what a waiting query owes the writer.
 *
 * Everything here is computed at read time. Nothing is stored, and no recommendation is persisted.
 *
 * ⚠️ THRESHOLD PROVENANCE. The brief described the overdue rule as ">3× the agent's responseTimeWeeks,
 * floored at 12 weeks". No such rule exists in this codebase and inventing a second definition is
 * exactly what the brief said not to do. The real one is `taskPrecedence.replyTask()`: past the reply
 * deadline (stored, or dateSent + responseTimeWeeks) plus NUDGE_GRACE_DAYS, a query owes a nudge; once
 * a nudge has been ignored for another full window, or `closeAfterDays` = max(2 × window, 90 days)
 * has passed since the send, it owes a close instead. That is what this module reuses, so the
 * Analytics tab, the To-do board and the dashboard can never disagree about who is overdue.
 */
import { Query, Agent, SubmissionPackage, ManuscriptVersion } from "../types";
import { replyTask } from "./taskPrecedence";
import { isResponse, isRequest, materialUsage, MaterialUsage, meetsSampleThreshold } from "./packageMetrics";

/** A send that is past its reply threshold and still unanswered — the app's canonical definition. */
export interface OverdueSend {
  query: Query;
  agentName: string;
  /** Whole weeks since the send — what the UI quotes ("WAITING · 13 WKS"). */
  weeksOut: number;
}

const WEEK = 604800000;

/** Whole weeks since a query was sent (0 when undated). */
export function weeksSinceSent(q: Query, now: number): number {
  const sent = q.dateSent ? Date.parse(q.dateSent) : NaN;
  return Number.isFinite(sent) ? Math.max(0, Math.floor((now - sent) / WEEK)) : 0;
}

/**
 * Sends that are past the agent's usual reply time and still silent. Reuses replyTask, so a query
 * with no recorded reply window never appears (there is nothing to be late against — the
 * data-quality task covers that case elsewhere).
 */
export function overdueSends(queries: Query[], agents: Agent[], now: number): OverdueSend[] {
  const out: OverdueSend[] = [];
  for (const q of queries) {
    if (isResponse(q)) continue;
    const agent = agents.find((a) => a.id === q.agentId);
    const task = replyTask({
      status: q.status,
      dateSent: q.dateSent,
      responseDeadline: q.responseDeadline,
      responseTimeWeeks: agent?.responseTimeWeeks,
      noResponseMeansNo: !!agent?.noResponseMeansNo,
      lastNudgeSentDate: q.lastNudgeSentDate,
      now,
    });
    if (task === "none") continue;
    out.push({ query: q, agentName: agent?.name?.trim() || agent?.agency?.trim() || "Unnamed agent", weeksOut: weeksSinceSent(q, now) });
  }
  return out.sort((a, b) => b.weeksOut - a.weeksOut);
}

/** Per-agent state of one package's sends — the in-focus "Sent to" list. */
export type SentToState = "replied" | "request" | "waiting";
export interface SentToRow {
  queryId: string;
  agentName: string;
  state: SentToState;
  /** Weeks out — only meaningful while waiting. */
  weeksOut: number;
  /** Waiting AND past the agent's usual reply time (the warning treatment). */
  overdue: boolean;
}

/** Who a package went to and where each send stands. Ordered requests → replies → waiting. */
export function sentToRows(packageId: string, queries: Query[], agents: Agent[], now: number): SentToRow[] {
  const overdueIds = new Set(overdueSends(queries, agents, now).map((o) => o.query.id));
  const rank: Record<SentToState, number> = { request: 0, replied: 1, waiting: 2 };
  return queries
    .filter((q) => q.packageId === packageId)
    .map((q) => {
      const agent = agents.find((a) => a.id === q.agentId);
      const state: SentToState = isRequest(q) ? "request" : isResponse(q) ? "replied" : "waiting";
      return {
        queryId: q.id,
        agentName: agent?.name?.trim() || agent?.agency?.trim() || "Unnamed agent",
        state,
        weeksOut: weeksSinceSent(q, now),
        overdue: state === "waiting" && overdueIds.has(q.id),
      };
    })
    .sort((a, b) => rank[a.state] - rank[b.state] || b.weeksOut - a.weeksOut);
}

/** A material with its cross-package usage — the "Materials winning replies" rows. */
export interface RankedMaterial {
  version: ManuscriptVersion;
  usage: MaterialUsage;
  /** Enough sends behind it to carry a ranking claim. */
  ranked: boolean;
}

/**
 * Materials that have actually travelled, ordered by reply rate. A material is credited for the
 * replies its PACKAGES drew — it shares that credit with everything else in the package, which is why
 * the copy says a material is "in requesting packages" and never that it caused anything.
 */
export function rankMaterialsByReplies(
  versions: ManuscriptVersion[],
  packages: SubmissionPackage[],
  queries: Query[],
): RankedMaterial[] {
  return versions
    .map((version) => {
      const usage = materialUsage(version.id, packages, queries);
      return { version, usage, ranked: meetsSampleThreshold(usage.sends) };
    })
    .filter((m) => m.usage.sends > 0)
    .sort((a, b) => (b.usage.replyRate ?? 0) - (a.usage.replyRate ?? 0) || b.usage.sends - a.usage.sends);
}
