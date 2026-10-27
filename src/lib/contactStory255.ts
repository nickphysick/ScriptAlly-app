/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v25.5 (design-refs/contact-list-v25-5/) — the agent card's Profile and History, pure.
 *
 *   the reply scale   twelve blocks, the first {reply weeks} filled (all twelve over 12), and "Replies in about
 *                     {n} weeks · {policy}" — nothing about your query
 *   the waiting bar   while the latest stage is Queried, Partial sent or Full sent: one block per week up to
 *                     max(reply weeks, weeks waited), capped at twice the reply weeks; waited blocks within the usual
 *                     time navy, past it rust; "{w} weeks since you sent it · usually {n}" / "· past {first}'s usual {n}"
 *   the story         each stored step (bookSteps), the agent's nudges and pass comment in date order, then the
 *                     writer's next step when there is one
 */
import { QueryStatus } from "../types";
import type { Agent } from "../types";
import type { QcRow } from "./qcSummary";
import { bookSteps } from "./contactBook";
import { nextDoor } from "./queryActions/entry";
import { MONTHS_SHORT } from "./dates";

const WEEK = 7 * 86_400_000;
export const SCALE_BLOCKS = 12;

/** the agent's stated reply time in weeks, or null */
export const replyWeeksOf = (a: Pick<Agent, "responseTimeWeeks">): number | null =>
  typeof a.responseTimeWeeks === "number" && a.responseTimeWeeks > 0 ? a.responseTimeWeeks : null;

/** "no reply means no" · "always replies" · null (not stated) */
export const policyWords = (a: Pick<Agent, "noResponseMeansNo">): string | null =>
  a.noResponseMeansNo === true ? "no reply means no" : a.noResponseMeansNo === false ? "always replies" : null;

/** A1 — the reply scale: how many of the twelve blocks are filled, and the bold words */
export function replyScale(a: Pick<Agent, "responseTimeWeeks" | "noResponseMeansNo">): { filled: number; bold: string; policy: string | null } | null {
  const n = replyWeeksOf(a);
  if (n == null) return null;
  return { filled: Math.min(SCALE_BLOCKS, Math.round(n)), bold: `Replies in about ${n} ${n === 1 ? "week" : "weeks"}`, policy: policyWords(a) };
}

/** the stages in which the writer is waiting on the agent's answer to something they sent */
export const WAITING: ReadonlySet<string> = new Set<string>([QueryStatus.QUERIED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT]);
export const isWaiting = (row: Pick<QcRow, "status">): boolean => WAITING.has(row.status);

export type Block = "navy" | "rust" | "empty";
export interface WaitBar {
  /** whole weeks since the latest send */
  weeks: number;
  /** the reply time, or null (then the caption stands alone, with no blocks) */
  reply: number | null;
  blocks: Block[];
  /** waited weeks past the reply time, as drawn (the rust blocks) */
  past: number;
  late: boolean;
}

/** B — the waiting bar for a query in a waiting stage; null otherwise */
export function waitBar(row: Pick<QcRow, "status" | "stageStartMs" | "sentMs">, reply: number | null, nowMs: number): WaitBar | null {
  if (!isWaiting(row)) return null;
  const from = row.stageStartMs ?? row.sentMs;
  if (from == null) return null;
  const weeks = Math.max(0, Math.floor((nowMs - from) / WEEK));
  if (reply == null) return { weeks, reply: null, blocks: [], past: 0, late: false };
  const n = Math.max(1, Math.round(reply));
  const total = Math.min(Math.max(n, weeks), 2 * n);
  const blocks: Block[] = Array.from({ length: total }, (_, i) => (i < weeks ? (i < n ? "navy" : "rust") : "empty"));
  const past = blocks.filter((b) => b === "rust").length;
  return { weeks, reply: n, blocks, past, late: weeks > n };
}
/** the bar's caption, in parts: the bold weeks, then the rest ("usually 6" / "past Rufus's usual 6") */
export function waitWords(w: WaitBar, first: string): { bold: string; rest: string | null; late: boolean } {
  const bold = w.weeks === 0 ? "Under a week" : `${w.weeks} ${w.weeks === 1 ? "week" : "weeks"}`;
  if (w.reply == null) return { bold, rest: null, late: false };
  return { bold, rest: w.late ? `past ${first}’s usual ${w.reply}` : `usually ${w.reply}`, late: w.late };
}

const dm = (ms: number) => { const d = new Date(ms); return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`; };

/** the writer's next step, in the timeline's words — only where the move is the writer's */
const NEXT_STEP: Record<string, string> = {
  "Mark partial sent": "Send the partial", "Mark full sent": "Send the full", "Mark revision sent": "Send the revision",
  "Record your answer": "Decide on offer", Nudge: "Nudge", "Close query": "Consider closing",
};

export type StoryRow =
  | { kind: "step"; key: string; status: QueryStatus; label: string; date: string; ms: number | null; current: boolean }
  | { kind: "nudge"; key: string; label: string; date: string; ms: number }
  | { kind: "quote"; key: string; text: string }
  | { kind: "next"; key: string; label: string; date: string };

/**
 * B — one query's story: its stored steps (never invented), the nudges in date order among them, the agent's comment
 * under the step that closed it, and the writer's next step last.
 */
export function storyRows(row: QcRow, nudges: readonly number[], comment: string | null, nowMs: number): StoryRow[] {
  const steps = bookSteps(row);
  const out: StoryRow[] = [];
  const pending = [...nudges].sort((a, b) => a - b);
  steps.forEach((s, i) => {
    /* a nudge sits after the step it followed */
    while (pending.length && s.dateMs != null && pending[0] < s.dateMs && i > 0) {
      const t = pending.shift()!;
      out.push({ kind: "nudge", key: `n${t}`, label: "Nudged", date: dm(t), ms: t });
    }
    out.push({ kind: "step", key: `${s.status}-${i}`, status: s.status, label: s.label, date: s.dateMs != null ? dm(s.dateMs) : "", ms: s.dateMs, current: s.current });
  });
  for (const t of pending) out.push({ kind: "nudge", key: `n${t}`, label: "Nudged", date: dm(t), ms: t });
  const closed = row.court === "closed";
  if (closed && comment && comment.trim()) out.push({ kind: "quote", key: "quote", text: comment.trim() });
  if (!closed) {
    const door = nextDoor(row, nowMs);
    const label = door ? NEXT_STEP[door.label] : undefined;
    if (label) {
      const when = row.expectedMs == null ? "" : row.court === "agent" || row.expectedMs < nowMs ? "Now" : dm(row.expectedMs);
      out.push({ kind: "next", key: "next", label, date: when });
    }
  }
  return out;
}

/** B — the heading's right-hand words: waiting while any live query has had no answer; else heard back */
export function heardWords(rows: readonly Pick<QcRow, "status" | "court">[]): string | null {
  if (!rows.length) return null;
  if (rows.some((r) => r.court !== "closed" && isWaiting(r))) return "waiting to hear back";
  if (rows.every((r) => r.status === QueryStatus.NO_RESPONSE)) return "closed with no reply";
  return "heard back";
}

/** one query's block on the History tab: its book line, its waiting bar (or none), its story */
export interface StoryBlock { id: string; book: string; wait: WaitBar | null; rows: StoryRow[] }
type ActLike = { queryId: string; date?: unknown; eventKey?: string; activityType?: string };
type QueryLike = { id: string; agentComments?: string };
const isNudge = (a: ActLike) => a.eventKey === "nudge_sent" || (!a.eventKey && a.activityType === "Nudge Sent");
const toMs = (v: unknown): number | null => {
  if (typeof v === "string") { const t = Date.parse(v); return Number.isFinite(t) ? t : null; }
  if (v && typeof (v as { toMillis?: () => number }).toMillis === "function") return (v as { toMillis: () => number }).toMillis();
  return null;
};
/** B — every query to the agent (any manuscript), newest first, each a block */
export function storyBlocks(rows: readonly QcRow[], queries: readonly QueryLike[], activities: readonly ActLike[], titleOf: (msId: string) => string | null,
  reply: number | null, nowMs: number): StoryBlock[] {
  const byQ = new Map(queries.map((q) => [q.id, q]));
  return [...rows].sort((a, b) => (b.sentMs ?? 0) - (a.sentMs ?? 0)).map((r) => {
    const nudges = activities.filter((a) => a.queryId === r.id && isNudge(a)).map((a) => toMs(a.date)).filter((t): t is number => t != null);
    return { id: r.id, book: titleOf(r.manuscriptId) ?? "", wait: waitBar(r, reply, nowMs), rows: storyRows(r, nudges, byQ.get(r.id)?.agentComments ?? null, nowMs) };
  });
}
