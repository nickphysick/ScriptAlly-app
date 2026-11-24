/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ Controls: entry v1 — THE REPLY THAT SITS BETWEEN STEPS ═════════════════════════════════════════════════════════
 *
 * A reply from the agent that does not move the status: a chaser ("any news on the full?"), a holding reply ("still on
 * my pile"), or a note ("I'm away until the 7th"). One type, whichever way the query is facing. It replaces the
 * holding-reply pack's `"Holding reply"` type, whose rows are read here as kind `holding` (their stored weeks become
 * the new date, counted from the entry's own date). Design ref: design-refs/controls-entry-v1/controls-v2.html.
 *
 *   DOES                                                    DOES NOT
 *   sit in the thread as a small note between steps         change the status, ever (no `resultingStatus`)
 *   set Last heard                                          count as a response, a reply time or a tally entry
 *   with a date: move Send by (with you) or Reply expected  open a chapter
 *   end Gone quiet
 *
 * ⚠️ NON-STATUS BY CONSTRUCTION. The nested `type` is not a `QueryStatus` member (recomputeFields reads `type` as a
 * status when `resultingStatus` is absent), so `recomputeQuery` cannot see it and is not changed. Everything it moves
 * is worked out ON READ from the entry (Nick's ruling, 24 Nov): editing or deleting the entry corrects every surface,
 * with nothing stored to restore.
 *
 * ⚠️ THIS IS THE ONE CHECK. Every reader that used to ask "is this a holding reply?" asks `isAgentReplyNested` /
 * `isAgentReplyFeed` here; nothing else names the type strings.
 */
import type { Activity, Query } from "../types";
import { QueryStatus } from "../types";
import { getActivityTime, normalizeResultingStatus } from "./queryDerivation";
import { isSendStatus } from "./timelineChapters";
import { MONTHS_SHORT } from "./dates";

/** The per-query log's `type`. Sentence case, and deliberately not a QueryStatus member. */
export const AGENT_REPLY_NESTED_TYPE = "Agent reply" as const;
/** The global feed's `activityType`. Title Case and rules-validated (`firestore.rules` isValidActivity). */
export const AGENT_REPLY_TYPE = "Agent Reply" as const;
/** The holding-reply pack's spellings (Part A, 2 Sep). Still READ, never written. */
export const LEGACY_HOLDING_NESTED_TYPE = "Holding reply" as const;
export const LEGACY_HOLDING_TYPE = "Holding Reply" as const;

export const REPLY_KINDS = ["chaser", "holding", "note"] as const;
export type ReplyKind = (typeof REPLY_KINDS)[number];
/** the two keys the entry adds to both stores (firestore.rules lists both) */
export const REPLY_KIND_FIELD = "replyKind" as const;
export const REPLY_DATE_FIELD = "replyDate" as const;

const DAY = 86_400_000;
const isKind = (v: unknown): v is ReplyKind => typeof v === "string" && (REPLY_KINDS as readonly string[]).includes(v);

/** One reply entry, read from either store. */
export interface AgentReply {
  /** the document id (both stores share it) */
  id: string | null;
  kind: ReplyKind;
  /** the date on their email: the entry's own date */
  ms: number;
  /** the new date they gave, at local noon of its day; null when none */
  dateMs: number | null;
  /** their words, when kept */
  words: string | null;
}

/** "YYYY-MM-DD" (or a full ISO) → local noon of that day */
export function replyDayMs(v: unknown): number | null {
  if (typeof v !== "string" || !v.trim()) return null;
  const t = new Date(/^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T12:00:00` : v).getTime();
  return Number.isNaN(t) ? null : t;
}
/** local "YYYY-MM-DD" of an instant */
export function replyDayIso(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* The holding-reply pack wrote its words and weeks into one prose field: `They expect to reply within N weeks · "…"`. */
const LEGACY_WEEKS = /^They expect to reply within (\d+) weeks?(?: · )?/;
function legacyWords(prose: unknown): string | null {
  if (typeof prose !== "string") return null;
  let s = prose.replace(LEGACY_WEEKS, "").trim();
  if (s.startsWith("\"") && s.endsWith("\"") && s.length >= 2) s = s.slice(1, -1).trim();
  return s || null;
}
function legacyWeeks(prose: unknown): number | null {
  if (typeof prose !== "string") return null;
  const m = LEGACY_WEEKS.exec(prose);
  return m ? Number(m[1]) : null;
}
const legacyDate = (ms: number, weeks: number | null): number | null =>
  weeks != null && weeks > 0 ? new Date(new Date(ms + weeks * 7 * DAY).setHours(12, 0, 0, 0)).getTime() : null;
const text = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

/* ── the one check ──────────────────────────────────────────────────────────────────────────────────────────── */

export function isAgentReplyNested(e: { type?: unknown } | null | undefined): boolean {
  return !!e && (e.type === AGENT_REPLY_NESTED_TYPE || e.type === LEGACY_HOLDING_NESTED_TYPE);
}
export function isAgentReplyFeed(a: { activityType?: unknown } | null | undefined): boolean {
  return !!a && (a.activityType === AGENT_REPLY_TYPE || a.activityType === LEGACY_HOLDING_TYPE);
}

/** A per-query log row as a reply entry, or null. */
export function readNestedReply(e: Record<string, unknown> | null | undefined): AgentReply | null {
  if (!e || !isAgentReplyNested(e)) return null;
  const ms = getActivityTime(e.createdAt as never);
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const id = typeof e.id === "string" ? e.id : null;
  if (e.type === LEGACY_HOLDING_NESTED_TYPE) {
    /* a corrected legacy row carries the entry's own keys (editActivity writes them), and they win */
    const weeks = typeof e.replyWeeks === "number" ? e.replyWeeks : legacyWeeks(e.note);
    const kind = isKind(e[REPLY_KIND_FIELD]) ? (e[REPLY_KIND_FIELD] as ReplyKind) : "holding";
    const dateMs = REPLY_DATE_FIELD in e ? replyDayMs(e[REPLY_DATE_FIELD]) : legacyDate(ms, weeks);
    return { id, kind, ms, dateMs, words: "replyNote" in e ? text(e.replyNote) : legacyWords(e.note) };
  }
  return { id, kind: isKind(e[REPLY_KIND_FIELD]) ? (e[REPLY_KIND_FIELD] as ReplyKind) : "note", ms, dateMs: replyDayMs(e[REPLY_DATE_FIELD]), words: text(e.replyNote) };
}

/** A global-feed row as a reply entry, or null. */
export function readFeedReply(a: Partial<Activity> | Record<string, unknown> | null | undefined): AgentReply | null {
  const r = a as Record<string, unknown> | null | undefined;
  if (!r || !isAgentReplyFeed(r)) return null;
  const ms = getActivityTime(r.date as never);
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const id = typeof r.id === "string" ? r.id : null;
  if (r.activityType === LEGACY_HOLDING_TYPE) {
    const kind = isKind(r[REPLY_KIND_FIELD]) ? (r[REPLY_KIND_FIELD] as ReplyKind) : "holding";
    const corrected = REPLY_KIND_FIELD in r;
    return { id, kind, ms, dateMs: corrected ? replyDayMs(r[REPLY_DATE_FIELD]) : legacyDate(ms, legacyWeeks(r.details)), words: corrected ? text(r.details) : legacyWords(r.details) };
  }
  return { id, kind: isKind(r[REPLY_KIND_FIELD]) ? (r[REPLY_KIND_FIELD] as ReplyKind) : "note", ms, dateMs: replyDayMs(r[REPLY_DATE_FIELD]), words: text(r.details) };
}

/** The latest of a set of entries; a tie keeps the later in the list (the log's own order). */
export function latestReply(list: readonly (AgentReply | null)[]): AgentReply | null {
  let best: AgentReply | null = null;
  for (const r of list) if (r && (!best || r.ms >= best.ms)) best = r;
  return best;
}
export const latestNestedReply = (events: readonly Record<string, unknown>[] | null | undefined): AgentReply | null =>
  latestReply((events ?? []).map(readNestedReply));
/** The latest reply entry on one query, from the global feed. */
export function latestFeedReply(queryId: string, activities: readonly Partial<Activity>[] | null | undefined): AgentReply | null {
  return latestReply((activities ?? []).filter((a) => a.queryId === queryId).map(readFeedReply));
}
/** Every query's latest reply entry, from the global feed, in one pass. */
export function latestFeedReplies(activities: readonly Partial<Activity>[] | null | undefined): Map<string, AgentReply> {
  const out = new Map<string, AgentReply>();
  for (const a of activities ?? []) {
    if (!a.queryId) continue;
    const r = readFeedReply(a);
    if (!r) continue;
    const prev = out.get(a.queryId);
    if (!prev || r.ms >= prev.ms) out.set(a.queryId, r);
  }
  return out;
}

/* ── what it moves, on read ────────────────────────────────────────────────────────────────────────────────── */

/**
 * The reply's new date as a statement `resolveExpectedDate` can weigh — or null. Only an entry dated after the latest
 * send counts (it is about the wait now running), and only one that gave a date. Its recency is the email's date, so a
 * writer's date set after it still wins (the resolver's D4 rule).
 */
export function replyStatement(reply: AgentReply | null | undefined, lastSendMs: number | null): { ms: number; statedAt: number } | null {
  if (!reply || reply.dateMs == null) return null;
  if (lastSendMs != null && reply.ms < lastSendMs) return null;
  return { ms: reply.dateMs, statedAt: reply.ms };
}

/** With you: the entry's date replaces Send by when the entry came after the request that set it. */
export function replySendByMs(reply: AgentReply | null | undefined, requestMs: number | null, storedMs: number | null): number | null {
  if (!reply || reply.dateMs == null) return storedMs;
  if (requestMs != null && reply.ms < requestMs) return storedMs;
  return reply.dateMs;
}

/**
 * The writer's nudge reminder, read through the entry (Nick's ruling 2): a reminder that falls before the agent's new
 * reply date reads as due ON that date. ⚠️ `nudgeDate` has no set-at stamp, so "set before the entry" is read as "falls
 * before the new date"; a reminder the writer deliberately set earlier, after the entry, is moved too. Controls:
 * journeys v1 asks the writer and can stamp it.
 */
export function replyReminderMs(reminderMs: number | null, reply: AgentReply | null | undefined, lastSendMs: number | null): number | null {
  if (reminderMs == null) return null;
  const st = replyStatement(reply, lastSendMs);
  return st && reminderMs < st.ms ? st.ms : reminderMs;
}

/** The instant the agent was last heard from by an entry this stage (it ends Gone quiet), or null. */
export function replyHeardMs(reply: AgentReply | null | undefined, sinceMs: number | null): number | null {
  if (!reply) return null;
  return sinceMs != null && reply.ms < sinceMs ? null : reply.ms;
}

/* ── how it reads ──────────────────────────────────────────────────────────────────────────────────────────── */

export type ChaseOf = "partial" | "full" | "revision" | null;
/** what a chaser chases: the request standing when it came */
export function chaseOf(status: QueryStatus | string | null | undefined): ChaseOf {
  if (status === QueryStatus.PARTIAL_REQUESTED) return "partial";
  if (status === QueryStatus.FULL_REQUESTED) return "full";
  if (status === QueryStatus.REVISE_RESUBMIT) return "revision";
  return null;
}
/** The note's title (baked): "{First} chased the full", "{First} sent a holding reply", "{First} sent a note". */
export function replyTitle(kind: ReplyKind, first: string, chase: ChaseOf): string {
  const F = first.charAt(0).toUpperCase() + first.slice(1);
  if (kind === "holding") return `${F} sent a holding reply`;
  if (kind === "chaser") return chase ? `${F} chased the ${chase}` : `${F} sent a chaser`;
  return `${F} sent a note`;
}
/** The Notes tab's phrase (baked): "when chasing the full", "in a holding reply", "in a note". */
export function replyPhrase(kind: ReplyKind, chase: ChaseOf): string {
  if (kind === "holding") return "in a holding reply";
  if (kind === "chaser") return chase ? `when chasing the ${chase}` : "when chasing";
  return "in a note";
}
/** Last heard's line: "chased the full", "a holding reply", "a note" (the ref's `heard`). */
export function replyHeardWords(kind: ReplyKind, chase: ChaseOf): string {
  if (kind === "holding") return "a holding reply";
  if (kind === "chaser") return chase ? `chased the ${chase}` : "a chaser";
  return "a note";
}

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MON = MONTHS_SHORT;
/** The date line (baked): "Send by Fri 4 Dec" with you, "Reply expected by 15 Jan" with the agent. */
export function replyDateLine(dateMs: number | null, withYou: boolean): string | null {
  if (dateMs == null) return null;
  const d = new Date(dateMs);
  return withYou ? `Send by ${WD[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}` : `Reply expected by ${d.getDate()} ${MON[d.getMonth()]}`;
}

/* ── the write ─────────────────────────────────────────────────────────────────────────────────────────────── */

export interface AgentReplyInput {
  kind: ReplyKind;
  /** the date on their email (ISO) */
  on: string;
  /** their words */
  words?: string | null;
  /** the new date they gave, "YYYY-MM-DD" */
  date?: string | null;
}
export interface AgentReplyWrites {
  /** AUTHORITATIVE row for `users/{uid}/queries/{qid}/activity` */
  nested: Record<string, unknown>;
  /** the global-feed twin, written under the SAME id */
  activity: Omit<Activity, "id" | "userId">;
}
const NOTE_MAX = 500;
export function buildAgentReplyWrites(
  query: Pick<Query, "id" | "manuscriptId" | "status">,
  agent: { name?: string } | null | undefined,
  input: AgentReplyInput,
): AgentReplyWrites {
  const agentName = agent?.name || "the agent";
  const first = (agent?.name || "").trim().split(/\s+/)[0] || "the agent";
  const at = new Date(input.on).toISOString();
  const words = input.words?.trim() ? input.words.trim().slice(0, NOTE_MAX) : null;
  const date = input.date && replyDayMs(input.date) != null ? input.date : null;
  const description = replyTitle(input.kind, first, chaseOf(query.status)).slice(0, 512);
  return {
    nested: {
      type: AGENT_REPLY_NESTED_TYPE, createdAt: at, note: "", queryId: query.id, agentName,
      [REPLY_KIND_FIELD]: input.kind,
      ...(date ? { [REPLY_DATE_FIELD]: date } : {}),
      ...(words ? { replyNote: words } : {}),
    },
    activity: {
      queryId: query.id, manuscriptId: query.manuscriptId,
      activityType: AGENT_REPLY_TYPE as unknown as Activity["activityType"],
      description, date: at, details: words ?? "",
      ...({ [REPLY_KIND_FIELD]: input.kind, ...(date ? { [REPLY_DATE_FIELD]: date } : {}) } as Record<string, string>),
      // deliberately NO resultingStatus
    } as Omit<Activity, "id" | "userId">,
  };
}

/* ── the wait clock (moved from lib/holdingReply.ts, now over every kind) ─────────────────────────────────────── */

export interface StoredHoldingReply { type?: unknown; createdAt?: unknown; replyWeeks?: unknown; replyKind?: unknown; replyDate?: unknown; note?: unknown; replyNote?: unknown; id?: unknown }

/** Every reply entry on this query, oldest first, as instants. */
export function agentReplyTimes(events: readonly StoredHoldingReply[] | null | undefined): number[] {
  return (events || []).map((e) => readNestedReply(e as Record<string, unknown>)?.ms ?? NaN).filter((t) => !Number.isNaN(t)).sort((a, b) => a - b);
}
/** The latest entry that gave a date, as a dated statement — or null (a later undated one does not clear it). */
export function replyStatedWindow(events: readonly StoredHoldingReply[] | null | undefined): { ms: number; statedAt: number } | null {
  const dated = (events || []).map((e) => readNestedReply(e as Record<string, unknown>)).filter((r): r is AgentReply => !!r && r.dateMs != null).sort((a, b) => a.ms - b.ms);
  const latest = dated[dated.length - 1];
  return latest ? { ms: latest.dateMs as number, statedAt: latest.ms } : null;
}
export interface WaitAnchor { ms: number; kind: "send" | "reply" }
/** When the wait now running began: the later of the last send and the last reply entry (a tie keeps the reply). */
export function waitAnchor(events: readonly StoredHoldingReply[] | null | undefined, fallbackSendMs: number | null): WaitAnchor | null {
  const sends = (events || [])
    .map((e) => ({ s: normalizeResultingStatus((e as { type?: unknown }).type), t: getActivityTime((e as { createdAt?: unknown }).createdAt as never) }))
    .filter((e) => e.s !== null && isSendStatus(e.s) && Number.isFinite(e.t) && e.t > 0)
    .map((e) => e.t);
  const lastSend = sends.length ? Math.max(...sends) : fallbackSendMs;
  const replies = agentReplyTimes(events);
  const lastReply = replies.length ? replies[replies.length - 1] : null;
  if (lastSend == null) return lastReply == null ? null : { ms: lastReply, kind: "reply" };
  if (lastReply == null) return { ms: lastSend, kind: "send" };
  return lastReply >= lastSend ? { ms: lastReply, kind: "reply" } : { ms: lastSend, kind: "send" };
}
export function waitAnchorMs(lastSendMs: number | null, events: readonly StoredHoldingReply[] | null | undefined): number | null {
  return waitAnchor(events, lastSendMs)?.ms ?? null;
}
export function hasAgentReply(events: readonly StoredHoldingReply[] | null | undefined): boolean {
  return agentReplyTimes(events).length > 0;
}

/** The reading pane's row title (its own grammar, "They …"): what happened, never what did not. */
export function replyRowLabel(kind: ReplyKind): string {
  if (kind === "chaser") return "They chased";
  if (kind === "note") return "They sent a note";
  return "They replied — no decision yet";
}
