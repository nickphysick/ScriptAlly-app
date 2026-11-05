/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v152 §2 (design-refs/query-centre-v152/) — THE QUERY CARD AS A CHAT THREAD. Pure derivations only:
 * the thread's messages and the waits between them (§2.3), the tips on a wait (§2.4), the reply box (§2.5), the
 * Agent tab's figures and profile (§2.6) and the Materials tab (§2.7). The card (QcQueryCard149's desktop layout)
 * draws them; nothing here reads the store or writes.
 *
 * ⚠️ WHOSE SIDE IS THE STEP'S, NOT THE COURT'S: the agent's are the requests, the offer, a pass and a holding reply;
 *    the writer's are every send, a nudge and every close the writer made (no response, withdrawn, signed).
 * ⚠️ A STEP'S MATERIALS ARE WHAT WAS RECORDED ON IT (Nick, v152 recon A). An older step carries none, so it shows none —
 *    except Query sent, which shows the query's own record. No chip is derived from a neighbouring step.
 * ⚠️ "THEIR USUAL" IS SAID ONLY WHEN THE AGENT STATES A REPLY TIME (Nick's ruling): their weeks for the query stage,
 *    the house 12 for a partial or a full. Without one, the tip states the days and nothing else.
 */
import { QueryStatus } from "../types";
import { MONTHS_SHORT } from "./dates";
import { STAGE_RESPONSE_WINDOWS } from "./queryAmbient";
import { STATUS_FILL, statusKind } from "./qc1512";
import { classifyMaterial } from "./agentMaterials";
import type { QueryState } from "./queryState";

const DAY = 86_400_000;
/** whole CALENDAR days from b to a (local midnights): a wait between two dated steps is the days between the dates, never
 *  the hours rounded — two steps 25 calendar days apart at different times of day must not read 26 */
const midnight = (ms: number) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
const days = (a: number, b: number) => Math.round((midnight(a) - midnight(b)) / DAY);
/** "16 May", with the year when it is not the year of `nowMs` */
export function dayLabel(ms: number, nowMs: number): string {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}${d.getFullYear() === new Date(nowMs).getFullYear() ? "" : ` ${d.getFullYear()}`}`;
}
const fullDay = (ms: number) => { const d = new Date(ms); return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`; };
const pl = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export type Side = "them" | "me";
export interface ThreadChip { label: string; detail: string }
export interface ThreadStepIn {
  key: string;
  activityId?: string;
  status: QueryStatus | null;
  kind: "nudge" | "holding" | null;
  ms: number | null;
  chips: ThreadChip[];
  /** Query sent's "by email" */
  via?: string | null;
}

const THEM = new Set<string>([QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.REVISE_RESUBMIT, QueryStatus.OFFER, QueryStatus.REJECTED]);
export function sideOf(s: Pick<ThreadStepIn, "status" | "kind">): Side {
  if (s.kind === "holding") return "them";
  if (s.kind === "nudge") return "me";
  return s.status && THEM.has(s.status) ? "them" : "me";
}
const TITLE: Record<string, string> = {
  [QueryStatus.QUERIED]: "Query sent", [QueryStatus.PARTIAL_REQUESTED]: "Asked for a partial", [QueryStatus.PARTIAL_SENT]: "Sent the partial",
  [QueryStatus.FULL_REQUESTED]: "Asked for the full", [QueryStatus.FULL_SENT]: "Sent the full", [QueryStatus.REVISE_RESUBMIT]: "Asked for a revision",
  [QueryStatus.RESUBMITTED]: "Sent the revision", [QueryStatus.OFFER]: "Made an offer", [QueryStatus.REJECTED]: "Passed",
  [QueryStatus.NO_RESPONSE]: "Closed: no response", [QueryStatus.WITHDRAWN]: "Withdrew the query", [QueryStatus.SIGNED]: "Signed",
};
export function stepTitle(s: Pick<ThreadStepIn, "status" | "kind">, first: string): string {
  if (s.kind === "nudge") return `You nudged ${first}`;
  if (s.kind === "holding") return "Sent a holding reply";
  return (s.status && TITLE[s.status]) || "A step";
}
/** the 34px disc's fill: the status's cap colour; Query sent and a nudge (and a holding reply) have none */
export function discFill(s: Pick<ThreadStepIn, "status" | "kind">): string {
  if (s.kind || !s.status || s.status === QueryStatus.QUERIED) return "transparent";
  return STATUS_FILL[statusKind(s.status)];
}

export type ThreadItem =
  | { t: "wait"; key: string; label: string; long: boolean; tip: string | null; edge: "start" | "now" | null }
  | { t: "msg"; key: string; activityId?: string; side: Side; disc: string; status: QueryStatus | null; kind: "nudge" | "holding" | null; title: string; date: string; chips: ThreadChip[]; via: string | null }
  | { t: "end"; key: string; kind: "agent" | "nudge" | "quiet"; title: string; sub: string; ring: number | null };

export interface ThreadCtx {
  first: string;
  nowMs: number;
  state: QueryState;
  /** the stamped reply date (a nudge's window after a nudge) */
  replyMs: number | null;
  /** the agent's stated reply time, weeks; null when not stated */
  agentWeeks: number | null;
}

/** what the step before is called in a tip */
function prevPhrase(p: ThreadStepIn, first: string, forThem: boolean): string {
  if (p.kind === "nudge") return "your nudge";
  switch (p.status) {
    case QueryStatus.QUERIED: return forThem ? "your query" : "the query";
    case QueryStatus.PARTIAL_SENT: return "your partial";
    case QueryStatus.FULL_SENT: return "the full";
    case QueryStatus.RESUBMITTED: return "the revision";
    default: return sideOf(p) === "them" ? `${first} asked` : "your last step";
  }
}
/** the agent's usual for a reply to `prev`, in weeks, or null (said only when they state a reply time) */
export function usualWeeks(prev: ThreadStepIn, agentWeeks: number | null): number | null {
  if (agentWeeks == null) return null;
  if (prev.status === QueryStatus.PARTIAL_SENT) return STAGE_RESPONSE_WINDOWS.partial;
  if (prev.status === QueryStatus.FULL_SENT || prev.status === QueryStatus.RESUBMITTED) return STAGE_RESPONSE_WINDOWS.full;
  if (prev.status === QueryStatus.QUERIED || prev.kind === "nudge") return agentWeeks;
  return null;
}
/** §2.4 — a wait's tip, in facts */
export function waitTip(prev: ThreadStepIn, next: ThreadStepIn, n: number, c: Pick<ThreadCtx, "first" | "agentWeeks">): string {
  const d = pl(n, "day");
  if (sideOf(next) === "them") {
    const u = usualWeeks(prev, c.agentWeeks);
    const head = `${c.first} replied ${d} after ${prevPhrase(prev, c.first, true)}.`;
    if (u == null) return head;
    const cmp = n < u * 7 - 4 ? "quicker than usual" : n > u * 7 + 4 ? "longer than usual" : "about the same as usual";
    return `${head} Their usual is about ${pl(u, "week")}, so this was ${cmp}.`;
  }
  const what = next.kind === "nudge" ? `nudged ${c.first}`
    : next.status === QueryStatus.PARTIAL_SENT ? "sent the partial"
    : next.status === QueryStatus.FULL_SENT ? "sent the full"
    : next.status === QueryStatus.RESUBMITTED ? "sent the revision"
    : next.status === QueryStatus.NO_RESPONSE ? "closed it"
    : next.status === QueryStatus.WITHDRAWN ? "withdrew it"
    : next.status === QueryStatus.SIGNED ? "signed"
    : "took the next step";
  return `You ${what} ${d} after ${prevPhrase(prev, c.first, false)}.`;
}

/** the thread: Day 1, each step, the wait to the next, today, and how it ends (§2.3) */
export function buildThread(steps: readonly ThreadStepIn[], c: ThreadCtx): ThreadItem[] {
  const S = [...steps].sort((a, b) => (a.ms ?? Infinity) - (b.ms ?? Infinity));
  const out: ThreadItem[] = [];
  if (!S.length) return out;
  const s0 = S[0];
  out.push({ t: "wait", key: "w-start", label: "Day 1", long: false, edge: "start",
    tip: s0.ms != null ? `The day you sent the query: ${fullDay(s0.ms)}.` : null });
  S.forEach((s, i) => {
    if (i) {
      const p = S[i - 1];
      if (p.ms != null && s.ms != null) {
        const n = Math.max(0, days(s.ms, p.ms));
        out.push({ t: "wait", key: `w-${s.key}`, label: n === 0 ? "Same day" : pl(n, "day"), long: n > 70, edge: null, tip: waitTip(p, s, n, c) });
      } else out.push({ t: "wait", key: `w-${s.key}`, label: "Not dated", long: false, edge: null, tip: null });
    }
    out.push({ t: "msg", key: s.key, activityId: s.activityId, side: sideOf(s), disc: discFill(s), status: s.status, kind: s.kind,
      title: stepTitle(s, c.first), date: s.ms != null ? dayLabel(s.ms, c.nowMs) : "No date", chips: s.chips, via: s.via ?? null });
  });
  if (c.state === "closed") return out;
  const lastMs = [...S].reverse().find((x) => x.ms != null)?.ms ?? null;
  const since = lastMs != null ? Math.max(0, days(c.nowMs, lastMs)) : null;
  out.push({ t: "wait", key: "w-now", label: since ? `${pl(since, "day")} · today` : "Today", long: false, edge: "now", tip: null });
  const anchor = [...S].reverse().find((x) => x.ms != null && x.kind !== "nudge")?.ms ?? null;
  if (c.state === "agent") {
    const dn = anchor != null ? Math.max(1, days(c.nowMs, anchor)) : null;
    if (c.replyMs != null && anchor != null) {
      const tot = Math.max(1, days(c.replyMs, anchor));
      out.push({ t: "end", key: "end", kind: "agent", title: `Waiting on ${c.first}`, sub: `Day ${dn} of about ${tot} · reply expected ${dayLabel(c.replyMs, c.nowMs)}`, ring: Math.min(1, dn! / tot) });
    } else out.push({ t: "end", key: "end", kind: "agent", title: `Waiting on ${c.first}`, sub: dn != null ? `Day ${dn} · no reply date` : "No reply date", ring: null });
  } else if (c.state === "nudge" && c.replyMs != null) {
    const ago = Math.max(0, days(c.nowMs, c.replyMs));
    out.push({ t: "end", key: "end", kind: "nudge", title: "No reply yet", sub: `Reply was due ${dayLabel(c.replyMs, c.nowMs)} · ${pl(ago, "day")} ago`, ring: null });
  } else if (c.state === "quiet") {
    out.push({ t: "end", key: "end", kind: "quiet", title: "No reply", sub: c.replyMs != null ? `Quiet since ${dayLabel(c.replyMs, c.nowMs)}` : "No reply yet", ring: null });
  }
  return out;
}

/* ── §2.5 the reply box ─────────────────────────────────────────────────────────────────────────────────────── */

export type ReplyAct = "offer" | "sent" | "nudge" | "resp" | "close" | "reopen";
export interface ReplyBox { lead: string; sub: string; late: boolean; button: string; tone: "navy" | "outline"; act: ReplyAct }
export interface ReplyCtx {
  state: QueryState;
  status: QueryStatus | string;
  first: string;
  nowMs: number;
  /** the offer's deadline, or the send-by date (writer's turn) */
  dueMs: number | null;
  /** the stamped reply date */
  replyMs: number | null;
  /** the day it closed */
  closedMs: number | null;
}
function leftWords(dueMs: number | null, nowMs: number): { sub: string; late: boolean } {
  if (dueMs == null) return { sub: "No date set", late: false };
  const n = days(dueMs, nowMs);
  if (n < 0) return { sub: `${pl(-n, "day")} late`, late: true };
  if (n === 0) return { sub: `Due today · ${dayLabel(dueMs, nowMs)}`, late: false };
  return { sub: `${pl(n, "day")} left · by ${dayLabel(dueMs, nowMs)}`, late: false };
}
export function replyBox(c: ReplyCtx): ReplyBox {
  const f = c.first;
  switch (c.state) {
    case "offer": {
      const w = leftWords(c.dueMs, c.nowMs);
      return { lead: "Answer the offer", sub: w.sub.replace(/ · by .*$/, ""), late: w.late, button: "Answer the offer", tone: "navy", act: "offer" };
    }
    case "materials": {
      const k = c.status === QueryStatus.FULL_REQUESTED ? "full" : c.status === QueryStatus.REVISE_RESUBMIT ? "revision" : "partial";
      const w = leftWords(c.dueMs, c.nowMs);
      return { lead: `Send the ${k}`, sub: w.sub, late: w.late, button: `Mark ${k} sent`, tone: "navy", act: "sent" };
    }
    case "nudge":
      return { lead: `Nudge ${f}?`, sub: c.replyMs != null ? `Reply was due ${dayLabel(c.replyMs, c.nowMs)}` : "Reply is overdue", late: false, button: "Nudge", tone: "outline", act: "nudge" };
    case "agent":
      return { lead: "Heard back?", sub: `Record it when ${f} replies`, late: false, button: "Record a response", tone: "outline", act: "resp" };
    case "quiet":
      return { lead: "Still nothing?", sub: "Close it, or keep waiting", late: false, button: "Close it", tone: "outline", act: "close" };
    default:
      return { lead: "Closed", sub: c.closedMs != null ? `Closed on ${dayLabel(c.closedMs, c.nowMs)}` : "Closed", late: false, button: "Reopen", tone: "outline", act: "reopen" };
  }
}

/* ── §2.6 the Agent tab ─────────────────────────────────────────────────────────────────────────────────────── */

type Mat = { kind: "letter" | "synopsis" | "sample" | "full" | "other"; unit?: "chapters" | "pages" | "words"; n?: number; text?: string };
/** a material label, read for comparing what was asked with what went */
export function readMat(label: string): Mat {
  const v = label.trim();
  const l = v.toLowerCase();
  if (/full manuscript|revised manuscript/.test(l)) return { kind: "full" };
  if (/letter/.test(l)) return { kind: "letter" };
  if (/synopsis/.test(l)) return { kind: "synopsis" };
  const c = classifyMaterial(v);
  if (c.unit) return { kind: "sample", unit: c.unit.toLowerCase() as Mat["unit"], n: c.count ? Number(c.count) : undefined };
  let m: RegExpMatchArray | null;
  if ((m = l.match(/(?:first\s+)?([\d,]+)\s+(pages?|chapters?|words?)/))) {
    const u = m[2].startsWith("page") ? "pages" : m[2].startsWith("chapter") ? "chapters" : "words";
    return { kind: "sample", unit: u, n: Number(m[1].replace(/,/g, "")) };
  }
  if (/opening sample|sample/.test(l)) return { kind: "sample" };
  return { kind: "other", text: l };
}
/** does what went cover what was asked? 10 pages covers a request for 5; a different unit cannot be compared, so it covers */
export function covers(sent: string, ask: string): boolean {
  const s = readMat(sent), a = readMat(ask);
  if (s.kind !== a.kind) return false;
  if (a.kind === "other") return s.text === a.text;
  if (a.kind !== "sample") return true;
  if (a.n == null || s.n == null || a.unit !== s.unit) return true;
  return s.n >= a.n;
}
export interface AskChip { label: string; sent: boolean }
export function askChips(asks: readonly string[], sent: readonly string[]): { chips: AskChip[]; missing: string[] } {
  const chips = asks.map((a) => ({ label: a, sent: sent.some((s) => covers(s, a)) }));
  return { chips, missing: chips.filter((c) => !c.sent).map((c) => c.label) };
}

/* ── §2.7 the Materials tab ─────────────────────────────────────────────────────────────────────────────────── */

export interface MatBlock { key: string; activityId?: string; status: QueryStatus; title: string; date: string; chips: ThreadChip[]; request: boolean; note: string | null; pkg: boolean }
const SEND_OF: Partial<Record<string, QueryStatus>> = {
  [QueryStatus.PARTIAL_REQUESTED]: QueryStatus.PARTIAL_SENT, [QueryStatus.FULL_REQUESTED]: QueryStatus.FULL_SENT, [QueryStatus.REVISE_RESUBMIT]: QueryStatus.RESUBMITTED,
};
const SENDS = new Set<string>([QueryStatus.QUERIED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT, QueryStatus.RESUBMITTED]);
const REQ_NAME: Record<string, string> = { [QueryStatus.PARTIAL_REQUESTED]: "Partial", [QueryStatus.FULL_REQUESTED]: "Full", [QueryStatus.REVISE_RESUBMIT]: "Revision" };
export function materialsTab(steps: readonly ThreadStepIn[], c: { first: string; nowMs: number; dueMs: number | null; writerTurn: boolean }): { blocks: MatBlock[]; summary: { sent: number; requests: number } } {
  const S = [...steps].sort((a, b) => (a.ms ?? Infinity) - (b.ms ?? Infinity));
  const blocks: MatBlock[] = [];
  let sent = 0, requests = 0;
  S.forEach((s, i) => {
    if (!s.status || s.kind) return;
    if (SENDS.has(s.status)) {
      sent += s.chips.length;
      blocks.push({ key: s.key, activityId: s.activityId, status: s.status, title: stepTitle(s, c.first), date: s.ms != null ? dayLabel(s.ms, c.nowMs) : "No date", chips: s.chips, request: false, note: null, pkg: s.status === QueryStatus.QUERIED });
      return;
    }
    const send = SEND_OF[s.status];
    if (!send) return;
    if (S.slice(i + 1).some((x) => x.status === send)) return;
    requests++;
    const due = c.writerTurn ? c.dueMs : null;
    const date = due != null ? (days(due, c.nowMs) < 0 ? `${pl(-days(due, c.nowMs), "day")} late` : `by ${dayLabel(due, c.nowMs)}`)
      : s.ms != null ? `asked ${dayLabel(s.ms, c.nowMs)}` : "";
    blocks.push({
      key: s.key, activityId: s.activityId, status: s.status, title: `${REQ_NAME[s.status]} to send`,
      date,
      chips: s.chips, request: true, pkg: false,
      note: `${c.first} asked${s.ms != null ? ` on ${dayLabel(s.ms, c.nowMs)}` : ""}. It moves here once you mark it sent.`,
    });
  });
  return { blocks, summary: { sent, requests } };
}
export function materialsSummary(s: { sent: number; requests: number }, first: string): string {
  const a = s.sent ? `${pl(s.sent, "thing")} sent to ${first}` : "Nothing sent yet";
  return s.requests ? `${a} · ${pl(s.requests, "request")} to send` : a;
}
/** a request block's date words: "8 days late" / "by 15 Oct" */
export const requestLate = (dueMs: number | null, nowMs: number) => leftWords(dueMs, nowMs);
