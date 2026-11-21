/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NEXT UP v1 (ref design-refs/next-up-v1.html) — THE LEAD CARD'S WORDS AND NUMBERS, by kind of task.
 *
 * Every lead card has the same five rows: the agent row (seal, name, agency, a number and its caption), the sentence,
 * the fixed four-stop track, one label line, the buttons. This file says what goes in each, from what the app already
 * derives: the plan's items (`lib/dashList`), the Query Centre's rows (`buildQcRows` → `stageStartMs`, `expectedMs`,
 * `lastMs`, `history`), and the query's own recorded dates (`offerDate`, `lastNudgeSentDate`). Nothing is stored here
 * and nothing here writes.
 *
 * ⚠️ THE TRACK IS ALWAYS FOUR STOPS (queried, partial, full, offer). Events that are not a stage never add one: a
 *    revision request is the arrows mark on the stop it relates to (StatusDot draws it), and a nudge is said only in the
 *    label line.
 * ⚠️ THE SENTENCE NAMES NO AGENT AND IS 18 CHARACTERS AT MOST (v1.1, Nick's ruling): the agent row above it already says
 *    who, and in Dashboard v3's narrow column a longer sentence ended in an ellipsis. `LEAD_SENTENCE_MAX` is the limit
 *    and NU11-a holds every kind to it, bar "Send your revision." (19), which Nick ruled unchanged with the other two
 *    send sentences. The ellipsis in nextUp.css stays only as a safety net.
 * ⚠️ NO "HE" OR "SHE" anywhere: the agent is their first name, or "the agent".
 * ⚠️ NO VERDICT WORDS (overdue, late) and no green: a number and what it counts, nothing more.
 */
import { QueryStatus, type Agent, type Query } from "../types";
import type { ListAction, ListItem } from "./dashList";
import type { DrawerMode, DrawerPreset } from "./queryActions/drawerStore";
import type { TaskCtx } from "./dashTaskCard";
import type { QcRow } from "./qcSummary";
import { anyToMs } from "./qcStages";
import { stageOf, type Stage } from "./stageColours";
import { dayMonth } from "./dates";
import { agentInitials, agentPrimary } from "./agentDisplay";

const DAY = 86_400_000;
/** The longest a lead card's sentence may be, in characters (v1.1): it fits Dashboard v3's column without the ellipsis. */
export const LEAD_SENTENCE_MAX = 18;
const MONTH_DAYS = 30.4375;

/** The eight cards of the reference, plus "other" for a task not about a query's next step. */
export type NextKind = "partial" | "full" | "revision" | "nudge" | "quiet" | "offer" | "tell" | "other";

/**
 * Which card a task is drawn as. The group decides a nudge and a close (the board's own categories); the task type
 * decides the rest. ⚠️ An offer's "send the full" is a request for the full, so it is the full's card.
 */
export function nextKind(item: Pick<ListItem, "group" | "taskType">): NextKind {
  if (item.group === "nudge") return "nudge";
  if (item.group === "quiet") return "quiet";
  switch (item.taskType) {
    case "partial_requested": return "partial";
    case "full_requested":
    case "offer_send_full": return "full";
    case "revise_resubmit": return "revision";
    case "offer_received": return "offer";
    case "offer_tell":
    case "offer_tell_all": return "tell";
    default: return "other";
  }
}

/* ── the numbers ──────────────────────────────────────────────────────────────────────────────── */

const startOfDay = (ms: number): number => { const d = new Date(ms); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
/** whole calendar days from `fromMs` to `nowMs`, never below zero */
export const daysSince = (fromMs: number, nowMs: number): number => Math.max(0, Math.round((startOfDay(nowMs) - startOfDay(fromMs)) / DAY));
const wholeMonths = (days: number): number => Math.max(1, Math.floor(days / MONTH_DAYS));

export interface Figure {
  /** the number, or "today" */
  value: string;
  /** two words at most; null for "today" */
  caption: string | null;
  /** the wait as a row says it ("23 days", "5 months", "today") */
  wait: string;
}

/**
 * A day count: days up to 60, then whole months; 0 reads "today" with no caption. `tail` is the caption's second word
 * ("waiting", "ago"; "past date" is two words of its own, so its caption is "days past date" — still the unit and what
 * it counts).
 */
export function dayFigure(days: number, tail: string): Figure {
  if (days <= 0) return { value: "today", caption: null, wait: "today" };
  if (days <= 60) {
    const unit = days === 1 ? "day" : "days";
    return { value: String(days), caption: `${unit} ${tail}`, wait: `${days} ${unit}` };
  }
  const m = wholeMonths(days);
  const unit = m === 1 ? "month" : "months";
  return { value: String(m), caption: `${unit} ${tail}`, wait: `${m} ${unit}` };
}

/** Gone quiet: whole months, or weeks under two months ("5 months quiet", "6 weeks quiet") */
export function quietFigure(days: number): Figure {
  if (days <= 0) return { value: "today", caption: null, wait: "today" };
  if (days < 2 * MONTH_DAYS) {
    const w = Math.max(1, Math.round(days / 7));
    const unit = w === 1 ? "week" : "weeks";
    return { value: String(w), caption: `${unit} quiet`, wait: `${w} ${unit}` };
  }
  const m = wholeMonths(days);
  const unit = m === 1 ? "month" : "months";
  return { value: String(m), caption: `${unit} quiet`, wait: `${m} ${unit}` };
}

/* ── the track ────────────────────────────────────────────────────────────────────────────────── */

export interface TrackStop {
  /** the status the stop's StatusDot draws */
  status: QueryStatus;
  /** false: faint (and, for the Offer stop, the outline seal) */
  reached: boolean;
}
export interface Track {
  stops: [TrackStop, TrackStop, TrackStop, TrackStop];
  /** 0 queried, 1 partial, 2 full, 3 offer — the ringed stop; the line fills to it */
  cur: number;
  /** gone quiet: a dotted line */
  quiet: boolean;
}

const LEVEL: Record<Stage, number> = { queried: 0, partial: 1, full: 2, offer: 3, closed: 0 };
const LEVEL_STAGE: Stage[] = ["queried", "partial", "full", "offer"];
const RESTING: QueryStatus[] = [QueryStatus.QUERIED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT, QueryStatus.OFFER];

/**
 * The fixed four stops for a query standing at `status`. The current stop draws the status itself (so a revision
 * request is the arrows mark on the Full stop). A stop before it draws the last status the history recorded in that
 * stage; a stop the query never passed through (a full asked for straight from the query) stays faint.
 */
export function trackOf(status: QueryStatus, spans: readonly { status: QueryStatus }[], quiet = false): Track {
  const cur = LEVEL[stageOf(status)];
  const lastIn = (st: Stage): QueryStatus | null => {
    for (let i = spans.length - 1; i >= 0; i--) if (stageOf(spans[i].status) === st && st !== "closed") return spans[i].status;
    return null;
  };
  const stop = (i: number): TrackStop => {
    if (i === cur) return { status, reached: true };
    if (i === 0) return { status: QueryStatus.QUERIED, reached: true };
    if (i < cur) { const s = lastIn(LEVEL_STAGE[i]); return s ? { status: s, reached: true } : { status: RESTING[i], reached: false }; }
    return { status: RESTING[i], reached: false };
  };
  return { stops: [stop(0), stop(1), stop(2), stop(3)], cur, quiet };
}

/* ── the lead card ────────────────────────────────────────────────────────────────────────────── */

export interface LeadAgent { initials: string; name: string; agency: string }

export interface NextLead {
  kind: NextKind;
  queryId: string | null;
  /** one agent's seal, name and agency (null for a task with none) */
  agent: LeadAgent | null;
  /** a task about several queries: up to four seals and "+N", in place of the track and label */
  seals: { initials: string[]; more: number } | null;
  figure: Figure | null;
  /** the stage the head and tint take; null for a task not about a query */
  stage: Stage | null;
  sentence: string;
  track: Track | null;
  /** the line under the track: the bold part, then the rest */
  label: { lead: string; rest: string } | null;
  /** the line under the sentence where there is no track */
  sub: string | null;
}

const possessive = (name: string): string => `${name}’s`;
const full = (s: string): string => (/[.?!]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);

const queryIdOf = (item: ListItem): string | null =>
  item.action.kind === "drawer" && item.action.request.mode !== "log" ? item.action.request.queryId ?? null : null;

const agentRow = (agent: Agent | undefined, fallbackName: string, fallbackInitials: string): LeadAgent => {
  const name = agent ? agentPrimary(agent) : fallbackName;
  const agency = (agent?.agency ?? "").trim();
  return { initials: agent ? agentInitials(agent) : fallbackInitials, name, agency: agency && agency !== name ? agency : "" };
};

const SENT_WORD: Partial<Record<QueryStatus, string>> = {
  [QueryStatus.QUERIED]: "Queried",
  [QueryStatus.PARTIAL_SENT]: "Partial sent",
  [QueryStatus.FULL_SENT]: "Full sent",
  [QueryStatus.RESUBMITTED]: "Resubmitted",
};
const ASKED_WORD: Record<"partial" | "full" | "revision", string> = { partial: "Partial asked for", full: "Full asked for", revision: "Revision asked for" };
const dated = (word: string, ms: number | null): { lead: string; rest: string } => ({ lead: word, rest: ms != null ? ` · ${dayMonth(ms)}` : "" });

/** The queries still open beside an offer: this book's live queries other than the offering one. */
export function stillOpen(offerId: string, rows: readonly QcRow[]): QcRow[] {
  const at = rows.find((r) => r.id === offerId);
  return rows.filter((r) => r.id !== offerId && r.court !== "closed" && (!at || r.manuscriptId === at.manuscriptId));
}

export function nextLead(item: ListItem, ctx: TaskCtx): NextLead {
  const kind = nextKind(item);
  const queryId = queryIdOf(item);
  const q: Query | undefined = queryId ? ctx.queries.find((x) => x.id === queryId) : undefined;
  const qc: QcRow | undefined = queryId ? ctx.qcRows.find((r) => r.id === queryId) : undefined;
  const agentId = q?.agentId ?? (item.action.kind === "agent" ? item.action.agentId : item.action.kind === "drawer" ? item.action.request.agentId : undefined);
  const agent = agentId ? ctx.agents.find((a) => a.id === agentId) : undefined;
  const status = (qc?.status ?? q?.status ?? item.status ?? null) as QueryStatus | null;
  const stage = status ? stageOf(status) : null;
  const spans = qc?.history.spans ?? [];
  const now = ctx.nowMs;
  /* a housekeeping gap across several agents names them as a count ("4 agents"), under the gap's own two letters */
  const many = item.action.kind === "agent" && item.action.sequence.length > 1;
  const one = many ? { initials: item.initials, name: item.who, agency: "" } : agentRow(agent, item.who, item.initials);
  const base = { kind, queryId, agent: one, seals: null, stage, sub: null } as const;
  const track = (quiet = false): Track | null => (status ? trackOf(status, spans, quiet) : null);

  switch (kind) {
    case "partial":
    case "full":
    case "revision": {
      const asked = qc?.stageStartMs ?? null;
      return {
        ...base,
        figure: asked != null ? dayFigure(daysSince(asked, now), "waiting") : null,
        sentence: `Send your ${kind}.`,
        track: track(),
        label: dated(ASKED_WORD[kind], asked),
      };
    }
    case "nudge": {
      const sent = qc?.stageStartMs ?? qc?.sentMs ?? null;
      const exp = qc?.expectedMs ?? null;
      const word = (status && SENT_WORD[status]) || "Queried";
      return {
        ...base,
        figure: exp != null ? dayFigure(daysSince(exp, now), "past date") : null,
        sentence: "Send a nudge.",
        track: track(),
        label: { lead: word, rest: `${sent != null ? ` ${dayMonth(sent)}` : ""}${exp != null ? ` · reply expected by ${dayMonth(exp)}` : ""}` },
      };
    }
    case "quiet": {
      const last = qc?.lastMs ?? null;
      const queried = qc?.sentMs ?? anyToMs(q?.dateSent);
      const nudged = anyToMs(q?.lastNudgeSentDate);
      return {
        ...base,
        figure: last != null && last > 0 ? quietFigure(daysSince(last, now)) : null,
        sentence: "Close it or nudge?",
        track: track(true),
        label: { lead: "Gone quiet", rest: `${queried != null ? ` · queried ${dayMonth(queried)}` : ""}${nudged != null ? ` · nudged ${dayMonth(nudged)}` : ""}` },
      };
    }
    case "offer": {
      const on = anyToMs(q?.offerDate) ?? qc?.stageStartMs ?? null;
      return {
        ...base,
        figure: on != null ? dayFigure(daysSince(on, now), "ago") : null,
        sentence: "Answer the offer.",
        track: track(),
        label: dated("Offer made", on),
      };
    }
    case "tell": {
      const on = anyToMs(q?.offerDate) ?? qc?.stageStartMs ?? null;
      const others = queryId ? stillOpen(queryId, ctx.qcRows) : [];
      return {
        ...base,
        agent: null,
        seals: { initials: others.slice(0, 4).map((r) => r.initials), more: Math.max(0, others.length - 4) },
        figure: { value: String(others.length), caption: "still reading", wait: "" },
        sentence: "Tell the others.",
        track: null,
        label: null,
        sub: `${one.name} made an offer${on != null ? ` on ${dayMonth(on)}` : ""}.`,
      };
    }
    case "other": {
      const title = full(`${item.pre}${item.who}${item.post}`);
      /* "Coming up" is the one item here about a query (its next date): it keeps the track, and says the date */
      if (qc && status) {
        const at = qc.expectedMs;
        const word = qc.expectedKind === "sendBy" ? "Send by" : qc.expectedKind === "offer" ? "Answer by" : "Reply expected by";
        return { ...base, figure: null, sentence: title, track: track(), label: { lead: word, rest: at != null ? ` ${dayMonth(at)}` : "" } };
      }
      return { ...base, figure: null, sentence: title, track: null, label: null, sub: item.note };
    }
    default: {
      const unhandled: never = kind;
      return unhandled;
    }
  }
}

/* ── the rows beneath (Phase 2) ───────────────────────────────────────────────────────────────── */

export interface NextRow {
  initials: string;
  /** the task in one line, the agent's whole name in it */
  text: string;
  /** its wait ("23 days", "5 months", "today"), where its kind has one; never "ago" */
  wait: string | null;
}

/** A task below the lead: a small seal, the task in one line, and its wait. */
export function nextRow(item: ListItem, ctx: TaskCtx): NextRow {
  const l = nextLead(item, ctx);
  const name = l.agent?.name ?? item.who;
  const initials = l.agent?.initials ?? item.initials;
  const text = l.kind === "partial" || l.kind === "full" || l.kind === "revision" ? `Send your ${l.kind} to ${name}`
    : l.kind === "nudge" ? `Send ${name} a nudge`
      : l.kind === "quiet" ? `Close your query to ${name}, or nudge again`
        : l.kind === "offer" ? `Answer ${possessive(name)} offer`
          : l.kind === "tell" ? `Tell the others about ${possessive(item.who)} offer`
            : `${item.pre}${item.who}${item.post}`.trim();
  /* a count of queries is not a wait: the tell row shows none */
  const wait = l.kind !== "tell" && l.figure?.wait ? l.figure.wait : null;
  return { initials, text, wait };
}

/* ── the buttons (Phase 3) ────────────────────────────────────────────────────────────────────── */

export interface NextButton {
  label: string;
  /** what it opens: a query's step (the slide-out at that step, filled in and waiting), or what the task opens today */
  action: ListAction;
  /** one filled button on the card; gone quiet's second is the outline */
  filled: boolean;
}

/** The offer journey's steps, in its own order (OfferJourney.tsx: The offer, The others, The call, Your decision). */
export const OFFER_STEP = { others: 1, decision: 3 } as const;

/**
 * The sentence is what the writer does in the real world; the button is what they then do in QueryHawk. Each opens a
 * step of the task's own journey and nothing else: the request is the task's own door (`drawerDoorForTask`, carried as
 * `item.action`), with at most the step to open at named. Nothing is saved from the Dashboard.
 */
export function nextButtons(item: ListItem, kind: NextKind): NextButton[] {
  const a = item.action;
  const door = a.kind === "drawer" ? a.request : null;
  const qid = door?.queryId ?? null;
  const at = (mode: DrawerMode, preset?: DrawerPreset): ListAction =>
    ({ kind: "drawer", request: { mode, ...(qid ? { queryId: qid } : {}), ...(preset ? { preset } : {}) } });
  switch (kind) {
    case "partial":
    case "full":
    case "revision": return [{ label: "Log it as sent", action: a, filled: true }];
    case "nudge": return [{ label: "Log the nudge", action: a, filled: true }];
    case "quiet": return qid
      ? [{ label: "Close it", action: at("close", { closeWhy: "noreply" }), filled: true }, { label: "Log a nudge", action: at("nudge", { nudgeTab: "sent" }), filled: false }]
      : [{ label: "Open", action: a, filled: true }];
    case "offer": return [{ label: "Record your answer", action: qid ? at("offer", { step: OFFER_STEP.decision }) : a, filled: true }];
    /* the task's own door: the offering query's journey at "The others" — who is still reading, to tick off as told */
    case "tell": return [{ label: "See who to tell", action: a, filled: true }];
    case "other": return [{ label: item.actLabel || "Open", action: a, filled: true }];
    default: {
      const unhandled: never = kind;
      return unhandled;
    }
  }
}
