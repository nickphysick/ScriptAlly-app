/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v149.1 Part A (design-refs/query-centre-v149-1/) — what the query card in the panel says, derived and
 * pure: each Tracking step's part of the story, the faint next step, the action strip's two sentences, the book
 * block's chips and the Agent tab's facts.
 *
 * ⚠️ EVERY VALUE COMES FROM THE RECORD. The mock is filled with sample words for Sophie Dunn; nothing here copies them.
 *    Where the record has no value a part is left out, or (the four fact cells) says "—" and "not known".
 *
 * ⚠️ WHAT THE RECORD HOLDS, AND THEREFORE WHAT A CHIP CAN SAY (Step 0, 25 Oct). Steps carry a status, a date and a
 *    system note ("Partial manuscript requested") — no materials of their own, and nothing linking a send to the
 *    request it answers. So:
 *      · "Query sent" shows what the query records as sent (its package or pieces), plain oat.
 *      · a request shows what was asked, rust: the latest stated portion ("First 50 pages", `materialsRequested*`,
 *        which a full request does not overwrite) or "Partial", plus "Synopsis" when one was asked for; "Full
 *        manuscript" for a full; nothing for an R&R (its words are the note).
 *      · a send ANSWERS a request when the same kind was asked for earlier in the story (a partial sent after a
 *        partial requested; a full or a revision sent after a full requested or an R&R): its chips repeat what was
 *        asked, green with a ✓. A send with no earlier request (an imported story) shows the same chip, plain.
 *    The system's own step text is never shown as a note. A note is the agent's or the writer's words: the R&R's
 *    `rrNotes`, a personal pass's `rejectionFeedbackText`.
 *
 * ⚠️ NO GENDERED PRONOUN FOR AN AGENT: the sentences name the agent ("Nudge Sophie"), never "her" or "him".
 */
import { QueryStatus, type Agent, type Manuscript, type Query } from "../types";
import { MONTHS_SHORT } from "./dates";
import { STAGE_NAME, type QcRow, type WhereKey } from "./qcSummary";
import { nextDoor, type Door } from "./queryActions/entry";
import { methodAnswer, panelDoor } from "./agentPanel";

export type ChipTone = "ask" | "ok" | "plain";
export type ChipIcon = "letter" | "synopsis" | "pages" | "full" | "bell" | "notes";
export interface StoryChip { label: string; tone: ChipTone; icon: ChipIcon }
export interface StoryStep {
  key: string;
  activityId?: string;
  status: QueryStatus | null;
  kind: "nudge" | "holding" | null;
  title: string;
  /** the italic qualifier after the title: "by email", "the revision" */
  qualifier: string | null;
  ms: number | null;
  /** the agent's or the writer's own words, quoted by the card */
  note: string | null;
  chips: StoryChip[];
}
/** a timeline row as buildTimelineRows makes it — only what the story reads */
export interface StoryRow { key: string; activityId?: string; status: QueryStatus; kind?: "nudge" | "holding"; reconstructed?: boolean; timeMs?: number | null; title: string }

const STEP_TITLE: Record<string, string> = {
  [QueryStatus.QUERIED]: "Query sent", [QueryStatus.PARTIAL_REQUESTED]: "Partial requested", [QueryStatus.PARTIAL_SENT]: "Partial sent",
  [QueryStatus.FULL_REQUESTED]: "Full requested", [QueryStatus.FULL_SENT]: "Full sent", [QueryStatus.REVISE_RESUBMIT]: "Revise & resubmit",
  [QueryStatus.RESUBMITTED]: "Revision sent", [QueryStatus.OFFER]: "Offer of representation", [QueryStatus.REJECTED]: "Passed",
  [QueryStatus.NO_RESPONSE]: "Closed, no reply", [QueryStatus.WITHDRAWN]: "Withdrawn", [QueryStatus.SIGNED]: "Signed",
};

/** the send method as an italic qualifier: "by email", "by online form" */
export function methodQualifier(m: string | undefined | null): string | null {
  const v = (m ?? "").trim().toLowerCase().replace(/\s+/g, "");
  if (!v) return null;
  if (v === "email") return "by email";
  if (v === "onlineform" || v === "agencyform" || v === "form") return "by online form";
  if (v === "querymanager") return "through QueryManager";
  if (v === "post") return "by post";
  return null;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
/** what the agent asked for in a partial request, from the record's stated portion */
export function partialAsked(q: Pick<Query, "materialsRequestedType" | "materialsRequestedQuantity" | "requestFrom" | "requestFromUnit">): string {
  const unit = String(q.materialsRequestedType ?? "").toLowerCase();
  const n = Number(String(q.materialsRequestedQuantity ?? "").trim());
  if (Number.isFinite(n) && n > 0 && (unit === "pages" || unit === "chapters" || unit === "words")) {
    const u = unit === "pages" ? plural(n, "page", "pages") : unit === "chapters" ? plural(n, "chapter", "chapters") : `${n.toLocaleString("en-GB")} words`;
    const from = q.requestFrom != null && q.requestFrom > 1 ? ` from ${q.requestFromUnit ?? "page"} ${q.requestFrom}` : "";
    return from ? `${u}${from}` : `First ${u}`;
  }
  return "Partial";
}

export interface StoryInput {
  rows: readonly StoryRow[];
  query: Query;
  manuscript: Pick<Manuscript, "bookVersions"> | null;
  /** what the query records as sent with it ("Query letter", "First 5,000 words") */
  sentWithQuery: readonly string[];
}

export function storySteps({ rows, query: q, manuscript, sentWithQuery }: StoryInput): StoryStep[] {
  const version = q.bookVersionId ? (manuscript?.bookVersions ?? []).find((v) => v.id === q.bookVersionId)?.name ?? null : null;
  const revision = (q.revisionRound ?? 1) >= 2;
  const asked: { partial: StoryChip[] | null; full: StoryChip[] | null } = { partial: null, full: null };
  const iconOf = (label: string): ChipIcon => (/letter/i.test(label) ? "letter" : /synopsis/i.test(label) ? "synopsis" : /full|manuscript/i.test(label) ? "full" : "pages");
  return rows.map((r) => {
    /* an empty or unreadable createdAt is no date (an undated step), never NaN on the page */
    const base = { key: r.key, activityId: r.activityId, ms: typeof r.timeMs === "number" && Number.isFinite(r.timeMs) ? r.timeMs : null };
    if (r.kind === "nudge") return { ...base, status: null, kind: "nudge", title: "Nudge sent", qualifier: methodQualifier(q.sendMethod), note: null, chips: [] };
    if (r.kind === "holding") return { ...base, status: null, kind: "holding", title: "Holding reply", qualifier: null, note: null, chips: [] };
    const s = r.status;
    if (r.reconstructed) return { ...base, status: s, kind: null, title: r.title, qualifier: STAGE_NAME[s]?.toLowerCase() ?? null, note: null, chips: [] };
    let qualifier: string | null = null, note: string | null = null;
    let chips: StoryChip[] = [];
    if (s === QueryStatus.QUERIED) {
      qualifier = methodQualifier(q.sendMethod);
      chips = sentWithQuery.map((label) => ({ label, tone: "plain", icon: iconOf(label) }));
    } else if (s === QueryStatus.PARTIAL_REQUESTED) {
      chips = [{ label: partialAsked(q), tone: "ask", icon: "pages" }, ...(q.requestSynopsis ? [{ label: "Synopsis", tone: "ask" as const, icon: "synopsis" as const }] : [])];
      asked.partial = chips;
    } else if (s === QueryStatus.FULL_REQUESTED) {
      chips = [{ label: "Full manuscript", tone: "ask", icon: "full" }];
      asked.full = chips;
    } else if (s === QueryStatus.REVISE_RESUBMIT) {
      note = (q.rrNotes ?? "").trim() || null;
      asked.full = [{ label: "Revised manuscript", tone: "ask", icon: "full" }];
    } else if (s === QueryStatus.PARTIAL_SENT) {
      const a = asked.partial;
      chips = (a ?? [{ label: partialAsked(q), tone: "plain", icon: "pages" }]).map((c) => ({ ...c, tone: a ? "ok" : "plain" }));
    } else if (s === QueryStatus.FULL_SENT || s === QueryStatus.RESUBMITTED) {
      const a = asked.full;
      if (revision || s === QueryStatus.RESUBMITTED) qualifier = "the revision";
      const label = `${revision || s === QueryStatus.RESUBMITTED ? "Revised manuscript" : "Full manuscript"}${version ? ` · ${version}` : ""}`;
      chips = [{ label, tone: a ? "ok" : "plain", icon: "full" }];
    } else if (s === QueryStatus.REJECTED) {
      note = (q.rejectionFeedbackText ?? "").trim() || null;
    }
    return { ...base, status: s, kind: null, title: STEP_TITLE[s] ?? r.title, qualifier, note, chips };
  });
}

/* ── time words ─────────────────────────────────────────────────────────────────────────────────────────────── */

const DAY = 86_400_000;
/** "5 days", "3 weeks", "4 months", "2.8 years" */
export function span(fromMs: number, toMs: number): string {
  const d = Math.max(0, Math.round((toMs - fromMs) / DAY));
  if (d < 14) return plural(d, "day", "days");
  if (d < 63) return plural(Math.round(d / 7), "week", "weeks");
  if (d < 365) return plural(Math.max(1, Math.round(d / 30.44)), "month", "months");
  return `${(d / 365.25).toFixed(1).replace(/\.0$/, "")} years`;
}
/** "13 Nov", with the year when it is not this one */
export function dayWords(ms: number, nowMs: number): string {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}${d.getFullYear() === new Date(nowMs).getFullYear() ? "" : ` ${d.getFullYear()}`}`;
}
const monthWords = (ms: number, nowMs: number) => { const d = new Date(ms); return `${MONTHS_SHORT[d.getMonth()]}${d.getFullYear() === new Date(nowMs).getFullYear() ? "" : ` ${d.getFullYear()}`}`; };

/** what is with the agent now, said as a noun: "your query", "the partial", "the revision" */
function withThem(r: Pick<QcRow, "status" | "query">): string {
  const rev = ((r.query as Query | null)?.revisionRound ?? 1) >= 2;
  if (r.status === QueryStatus.PARTIAL_SENT) return "the partial";
  if (r.status === QueryStatus.FULL_SENT) return rev ? "the revision" : "the full";
  if (r.status === QueryStatus.RESUBMITTED) return "the revision";
  return "your query";
}
/** what they asked for, when the writer owes it */
function owed(status: QueryStatus | string): string {
  return status === QueryStatus.PARTIAL_REQUESTED ? "the partial" : status === QueryStatus.FULL_REQUESTED ? "the full manuscript" : "the revision";
}

/* ── the next step, and the action strip: THE SENTENCE TEMPLATES, IN ONE PLACE ─────────────────────────────── */

export type StripKind = "nudge" | "close" | "wait" | "send" | "offer" | "closed";
export interface NextStep { title: string; why: string }
export interface Strip { kind: StripKind; bold: string; sub: string; button: string | null }

/**
 * Every sentence the strip and the next step can say, keyed by the next move (the row's own `nextDoor`). `{first}` is
 * the agent's first name, `{thing}` what is with them, `{for}` how long, `{date}` the date the sentence is about.
 */
export const STRIP_WORDS = {
  nudge: { bold: "{first} has had {thing} {for}.", sub: "Nudge {first}, or close the query.", next: "Nudge due", why: "No reply since {since}. The reply was expected by {date}." },
  close: { bold: "No reply from {first} in {for}.", sub: "Close the query, or keep tracking.", next: "Consider closing", why: "Past the reply date and the nudge window, with nothing back." },
  wait: { bold: "{first} has had {thing} {for}.", sub: "The reply is expected by {date}.", subNoDate: "There’s no reply date on record yet.", next: "Reply due by {date}", nextNoDate: "Reply expected", why: "From {first}’s usual reply time.", whyWriter: "From the reply date you set.", whyNoDate: "Add {first}’s reply time to get a date." },
  send: { bold: "{first} asked for {owed} {for} ago.", sub: "Send it by {date}, then mark it sent.", subNoDate: "Send it, then mark it sent.", next: "Send {owed} by {date}", nextNoDate: "Send {owed}", why: "{first} asked for it on {since}." },
  offer: { bold: "{first} offered representation.", sub: "Answer by {date}.", subNoDate: "Answer when you’re ready.", next: "Answer the offer by {date}", nextNoDate: "Answer the offer", why: "{first} made the offer on {since}." },
  closed: {
    [QueryStatus.REJECTED]: { bold: "Passed on {since}.", sub: "Added to your Wall of no." },
    [QueryStatus.NO_RESPONSE]: { bold: "Closed with no reply on {since}.", sub: "Counted as a no." },
    [QueryStatus.WITHDRAWN]: { bold: "You withdrew on {since}.", sub: "Nothing more to do." },
    [QueryStatus.SIGNED]: { bold: "Signed with {first} on {since}.", sub: "Congratulations." },
  } as Record<string, { bold: string; sub: string }>,
} as const;

/** the strip's button: the row's own next move, in the strip's short words */
export const STRIP_BUTTON: Record<string, string> = {
  "Nudge": "Nudge", "Close query": "Close query", "Record a response": "Record a response",
  "Mark partial sent": "Mark sent", "Mark full sent": "Mark sent", "Mark revision sent": "Mark sent", "Record your answer": "Record your answer",
};

const fill = (t: string, v: Record<string, string>) => t.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? "");
const kindOf = (d: Door | null, row: QcRow): StripKind => {
  if (row.court === "closed" || !d) return "closed";
  if (d.label === "Nudge") return "nudge";
  if (d.label === "Close query") return "close";
  if (d.label === "Record your answer") return "offer";
  if (/^Mark .* sent$/.test(d.label)) return "send";
  return "wait";
};

export interface StoryContext { row: QcRow; first: string; nowMs: number; agentWeeks: number | null }

function vars({ row, first, nowMs }: StoryContext): Record<string, string> {
  const since = row.stageStartMs ?? row.sentMs;
  return {
    first, thing: withThem(row), owed: owed(row.status),
    for: since != null ? span(since, nowMs) : "a while",
    since: since != null ? dayWords(since, nowMs) : "",
    date: row.expectedMs != null ? dayWords(row.expectedMs, nowMs) : "",
  };
}

/** the faint last step: what comes next, from the next-move rule. Null for a closed query. */
export function nextStepOf(ctx: StoryContext): NextStep | null {
  const d = nextDoor(ctx.row, ctx.nowMs);
  const k = kindOf(d, ctx.row);
  if (k === "closed") return null;
  const v = vars(ctx);
  const hasDate = ctx.row.expectedMs != null;
  if (k === "nudge") return { title: STRIP_WORDS.nudge.next, why: fill(hasDate ? STRIP_WORDS.nudge.why : "No reply since {since}.", v) };
  if (k === "close") return { title: STRIP_WORDS.close.next, why: STRIP_WORDS.close.why };
  if (k === "wait") {
    const w = STRIP_WORDS.wait;
    /* a date the writer set is theirs (`writerExpectedDate`); otherwise it is the agency's usual reply time */
    const writer = !!(ctx.row.query as { writerExpectedDate?: string } | null)?.writerExpectedDate;
    return { title: fill(hasDate ? w.next : w.nextNoDate, v), why: fill(!hasDate ? w.whyNoDate : writer || !ctx.agentWeeks ? w.whyWriter : w.why, v) };
  }
  const w = k === "send" ? STRIP_WORDS.send : STRIP_WORDS.offer;
  return { title: fill(hasDate ? w.next : w.nextNoDate, v), why: fill(w.why, v) };
}

/** the action strip at the foot of Tracking: two sentences, and the next move's button (none when closed) */
export function stripOf(ctx: StoryContext): Strip {
  const d = nextDoor(ctx.row, ctx.nowMs);
  const k = kindOf(d, ctx.row);
  const v = vars(ctx);
  const hasDate = ctx.row.expectedMs != null;
  if (k === "closed") {
    const w = STRIP_WORDS.closed[String(ctx.row.status)] ?? { bold: `${STAGE_NAME[ctx.row.status as QueryStatus] ?? "Closed"} on {since}.`, sub: "" };
    return { kind: k, bold: fill(w.bold, v), sub: fill(w.sub, v), button: null };
  }
  const w = STRIP_WORDS[k] as { bold: string; sub: string; subNoDate?: string };
  return { kind: k, bold: fill(w.bold, v), sub: fill(!hasDate && w.subNoDate ? w.subNoDate : w.sub, v), button: d ? STRIP_BUTTON[d.label] ?? d.label : null };
}

/* ── the book block ─────────────────────────────────────────────────────────────────────────────────────────── */

/** age category · genre · "88,000 words": the present ones only, never a blank */
export function bookChips(ms: Pick<Manuscript, "ageCategory" | "genre" | "wordCount"> | null): string[] {
  if (!ms) return [];
  const out: string[] = [];
  const age = String(ms.ageCategory ?? "").trim();
  const genre = String(ms.genre ?? "").trim();
  const wc = Number(ms.wordCount);
  if (age) out.push(age);
  if (genre) out.push(genre);
  if (Number.isFinite(wc) && wc > 0) out.push(`${wc.toLocaleString("en-GB")} words`);
  return out;
}

/* ── the Agent tab ──────────────────────────────────────────────────────────────────────────────────────────── */

export interface FactCell { key: "reply" | "door" | "heard" | "touch"; label: string; value: string; sub: string; known: boolean }
export interface HistoryRow { id: string; title: string; when: string; status: QueryStatus; current: boolean }
export interface AgentView { facts: FactCell[]; history: HistoryRow[] }

const NOT_KNOWN = { value: "—", sub: "not known", known: false };
/** a query has heard back once the agent has answered it in any way */
export const heardBack = (q: Pick<Query, "status" | "hasAgentResponded">): boolean =>
  q.hasAgentResponded === true || ![QueryStatus.QUERIED, QueryStatus.NO_RESPONSE, QueryStatus.WITHDRAWN].includes(q.status as QueryStatus);
const ms0 = (v: unknown): number | null => { const t = typeof v === "string" ? Date.parse(v) : typeof v === "number" ? v : NaN; return Number.isFinite(t) ? t : null; };
/** the last time anything passed between the writer and the agent, across every query to them */
export function lastInTouch(qs: readonly Query[]): number | null {
  let best: number | null = null;
  for (const q of qs) for (const v of [q.dateSent, q.lastStatusChange, q.responseReceivedAt, q.lastNudgeSentDate, q.partialSentDate, q.fullSentDate, q.partialRequestedDate, q.fullRequestedDate]) {
    const t = ms0(v);
    if (t != null && (best == null || t > best)) best = t;
  }
  return best;
}

export function agentView(agent: Agent | null, toAgent: readonly Query[], msTitle: (id: string) => string, currentId: string, nowMs: number): AgentView {
  const weeks = typeof agent?.responseTimeWeeks === "number" && agent.responseTimeWeeks > 0 ? agent.responseTimeWeeks : null;
  const door = agent ? panelDoor(agent, nowMs) : null;
  const checked = ms0(agent?.lastCheckedDate);
  const heard = toAgent.filter(heardBack).length;
  const touch = lastInTouch(toAgent);
  const facts: FactCell[] = [
    { key: "reply", label: "Replies in", ...(weeks ? { value: `~${weeks} wk${weeks === 1 ? "" : "s"}`, sub: "usually", known: true } : NOT_KNOWN) },
    { key: "door", label: "Queries", ...(door && door.kind !== "unknown"
      ? { value: door.kind === "open" ? "Open" : "Closed", sub: door.till ? `till ${door.till}` : checked != null ? `checked ${monthWords(checked, nowMs)}` : "", known: true }
      : NOT_KNOWN) },
    { key: "heard", label: "Heard back", ...(toAgent.length ? { value: `${heard} of ${toAgent.length}`, sub: "from you", known: true } : NOT_KNOWN) },
    { key: "touch", label: "Last in touch", ...(touch != null ? { value: dayWords(touch, nowMs), sub: `${span(touch, nowMs)} ago`, known: true } : NOT_KNOWN) },
  ];
  const history = [...toAgent]
    .sort((a, b) => (ms0(b.dateSent) ?? 0) - (ms0(a.dateSent) ?? 0))
    .map((q) => { const t = ms0(q.dateSent); return { id: q.id, title: msTitle(q.manuscriptId), when: t != null ? monthYear(t) : "", status: q.status as QueryStatus, current: q.id === currentId }; });
  return { facts, history };
}
const monthYear = (ms: number) => { const d = new Date(ms); return `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`; };

/** how the agent takes submissions, as the Contact row's words, or null when not recorded */
export const submissionWords = (a: Pick<Agent, "submissionMethod"> | null): string | null => methodAnswer(a?.submissionMethod ?? null);

/** the strip's tint per set (the panel's court) */
export const STRIP_TINT: Record<WhereKey, string> = { you: "#f5e6df", agent: "#e2e6e0", quiet: "#efeae2", closed: "#e4e1db" };
