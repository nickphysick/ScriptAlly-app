/**
 * ⚠️ UNMOUNTED, AND KEPT ON PURPOSE (F-AM). Its only consumer was `AnalyticsTab`, deleted with the
 * `#/pkg-lab` cascade — so nothing renders these derivations today. They survive because they are
 * PURE, TESTED, and answer a question the live page does not: the reply-rate framing, the material
 * ranking, the composition read and the recommendations. `TrackingBand` derives from
 * `packageTracking.ts` and reproduces none of it, so deleting this would lose the work rather than
 * tidy a duplicate.
 *
 * ⚠️ IF A LATER SESSION FINDS THIS WITH NO CALLER, THAT IS EXPECTED — do not "restore" a surface for
 * it and do not delete it as dead. It is a shelf, not an orphan, and this note is the difference.
 */
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

// ─────────────────────────────────────────────────────────────────────────────
// "What to do next" — recommendations DERIVED AT READ TIME. Nothing here is stored: there is no
// recommendations collection, no dismissal state, no scoring cached anywhere. Re-deriving on every
// render is the point — a suggestion that outlived the data that justified it is worse than none.
// ─────────────────────────────────────────────────────────────────────────────

/** What a recommendation asks the writer to do. Only `queries` and `open-package` are real actions;
 *  `swap` has no built flow yet and renders as a disabled, clearly-labelled affordance. */
export type RecommendationAction = "queries" | "open-package" | "swap" | "none";

export interface Recommendation {
  id: string;
  /** The mono kicker. */
  kicker: string;
  /** The body, already assembled — `bold` names the phrases the view emphasises. */
  body: string;
  bold: string[];
  action: RecommendationAction;
  actionLabel?: string;
  /** For "open-package": which package to open. */
  packageId?: string;
}

export interface RecommendationInput {
  versions: ManuscriptVersion[];
  packages: SubmissionPackage[];
  queries: Query[];
  agents: Agent[];
  now: number;
}

/**
 * Up to three suggestions, strongest signal first. Each one is only emitted when the data actually
 * supports it — a material needs MIN_SENDS_FOR_CLAIM behind it before it can be called strong or
 * weak, and the waiting card only appears when a send is genuinely past the agent's own reply window
 * (via `overdueSends`, i.e. taskPrecedence). No signal, no card: this returns [] rather than padding.
 */
export function recommendations(inp: RecommendationInput): Recommendation[] {
  const { versions, packages, queries, agents, now } = inp;
  const out: Recommendation[] = [];
  const ranked = rankMaterialsByReplies(versions, packages, queries).filter((m) => m.ranked);

  // 1 — the strongest material, and where it could go next.
  const best = ranked[0];
  if (best && (best.usage.replyRate ?? 0) > 0) {
    // A package that does NOT yet include it, preferring one that has never been sent.
    const without = packages.filter((p) =>
      ![p.queryLetterVersionId, p.synopsisVersionId, p.samplePagesVersionId].includes(best.version.id));
    const unsent = without.find((p) => !queries.some((q) => q.packageId === p.id)) ?? without[0];
    out.push({
      id: "strength",
      kicker: "★ Lean into your strength",
      body: unsent
        ? `Your ${best.version.versionName} has the best reply rate of anything you've sent — ${Math.round((best.usage.replyRate ?? 0) * 100)}% across ${best.usage.sends} sends${best.usage.requests > 0 ? `, and ${best.usage.requests === 1 ? "a request" : `${best.usage.requests} requests`} travelled with it` : ""}. ${unsent.packageName || "Untitled package"} doesn't include it yet.`
        : `Your ${best.version.versionName} has the best reply rate of anything you've sent — ${Math.round((best.usage.replyRate ?? 0) * 100)}% across ${best.usage.sends} sends. It's already in every package you've built.`,
      bold: [best.version.versionName, ...(unsent ? [unsent.packageName || "Untitled package"] : [])],
      action: unsent ? "open-package" : "none",
      actionLabel: unsent ? `Open ${unsent.packageName || "Untitled package"}` : undefined,
      packageId: unsent?.id,
    });
  }

  // 2 — the laggard, but only when there is a like-for-like replacement of the same type.
  const worst = ranked[ranked.length - 1];
  if (best && worst && worst.version.id !== best.version.id) {
    const better = ranked.find((m) => m.version.componentType === worst.version.componentType && m.version.id !== worst.version.id);
    const gap = (better?.usage.replyRate ?? 0) - (worst.usage.replyRate ?? 0);
    if (better && gap >= 0.15) {
      out.push({
        id: "laggard",
        kicker: "Underperformer",
        body: `Your ${worst.version.versionName} trails ${better.version.versionName} on replies — ${Math.round((worst.usage.replyRate ?? 0) * 100)}% against ${Math.round((better.usage.replyRate ?? 0) * 100)}%, on comparable numbers. Worth swapping before your next batch.`,
        bold: [worst.version.versionName, better.version.versionName],
        action: "swap",
        actionLabel: "Swap it in",
      });
    }
  }

  // 3 — sends that are past the agent's own reply window.
  const overdue = overdueSends(queries.filter((q) => !!q.packageId), agents, now);
  if (overdue.length > 0) {
    const longest = overdue[0];
    out.push({
      id: "waiting",
      kicker: "Waiting game",
      body: `${overdue.length === 1 ? "One query is" : `${overdue.length} queries are`} past the agent's usual reply time — the longest has been out ${longest.weeksOut} weeks. A polite nudge is fair game.`,
      bold: [overdue.length === 1 ? "One query" : `${overdue.length} queries`],
      action: "queries",
      actionLabel: "Open in Queries Hub",
    });
  }

  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSITION — the three-part split every bar on the packages surface now draws.
//
// A smooth percentage fill claims a precision three or four sends haven't got, and it silently
// counts a query that simply hasn't come back yet as a failure. The composition form fixes both: the
// track is the SENDS, and it is divided into what actually happened.
//
// ⚠️ THE BOUNDARY, AND A DELIBERATE DIVERGENCE — see reports/packages-empty-landing-bars.md.
// "No reply" starts at replyTask() === "close" ONLY. A send that merely owes a nudge stays in
// "still waiting", because the writer is still expected to chase it. That means this and
// `overdueSends()` — which fires the ⚠ marker at "nudge" OR "close" — DISAGREE BY DESIGN: they answer
// different questions ("has this gone quiet?" vs "should I chase this?"). A send can carry the ⚠
// marker while its bar still counts it as waiting. Do not "fix" them into agreement: doing so would
// either start calling live queries dead, or stop prompting nudges.
// ─────────────────────────────────────────────────────────────────────────────

export interface Composition {
  /** The denominator — every send in this set. */
  sent: number;
  /** The agent came back (a request counts, since requests ⊆ responses). */
  replied: number;
  /** Sent, silent, and not yet past the close threshold — still live. */
  waiting: number;
  /** Past `replyTask() === "close"`: gone quiet. */
  noReply: number;
  /** Requests among the replies — an event count, drawn in gold, never a rate. */
  requests: number;
}

/** The three-part split for a set of sends. Pure; `now` is injected. */
export function composition(queries: Query[], agents: Agent[], now: number): Composition {
  let replied = 0;
  let noReply = 0;
  let waiting = 0;
  for (const q of queries) {
    if (isResponse(q)) { replied += 1; continue; }
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
    // "close" — and only "close" — is gone quiet. "nudge" is still live.
    if (task === "close") noReply += 1; else waiting += 1;
  }
  return { sent: queries.length, replied, waiting, noReply, requests: queries.filter(isRequest).length };
}

/** Percentage widths for the three segments, summing to 100 (or all zero on an empty set). */
export function compositionWidths(c: Composition): { replied: number; waiting: number; noReply: number } {
  if (c.sent === 0) return { replied: 0, waiting: 0, noReply: 0 };
  const pc = (n: number) => (n / c.sent) * 100;
  return { replied: pc(c.replied), waiting: pc(c.waiting), noReply: pc(c.noReply) };
}

/** The value label — the denominator is the whole point of this form ("3/4"). */
export const compositionLabel = (c: Composition): string => `${c.replied}/${c.sent}`;
