/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The agent card's quick view, as derivations (Agent card v1 §3; ref
 * design-refs/agent-card-housekeeping-v7.html). Every fact the card states comes from here, and
 * every fact here comes from the engine the Contact list's rows already read — `buildQcRows` for
 * the queries, `agentFacts`/`contactStanding` for where things stand, `rowDateLine` for the next
 * date — so the card and the row behind it cannot disagree about one agent.
 *
 * ⚠️ ONLY THE QUERY SECTION CHANGES COLOUR (decision 2). The band is slate on every agent; the
 * tone below is the query's, never the agent's, and a status is still drawn only by StatusDot.
 */
import { Agent, QueryStatus, SubmissionMethod } from "../types";
import type { AgentFacts } from "./contactList";
import { agentRows, rowDateLine, rowYourMove, standingQuery, type RowDateLine } from "./contactList";
import { STAGE_NAME, type QcRow } from "./qcSummary";
import { hrefFor } from "./quickAdd";
import { formatAmount, materialRowsFromAgent } from "./agentMaterials";
import { countryName, flagFor } from "./territory";
import { formatDate } from "./dates";

/* ── the query the card speaks about ─────────────────────────────────────────────────────── */

/**
 * The card's query, for the manuscript in scope. Where things stand is `contactStanding`'s answer
 * (the row's); WHICH query the section presents is this. When the writer's move is on one live
 * query and another is further along with the agent, the row's "furthest along" rule would show
 * the agent's one under a "Your move" chip, and the primary button would act on the wrong query —
 * so the card presents the query whose move it is.
 */
export function cardQuery(rows: readonly QcRow[]): QcRow | null {
  const mine = rows.filter((r) => r.court !== "closed" && rowYourMove(r));
  return mine.length ? standingQuery(mine) : standingQuery(rows);
}

/** The rows the card reads for an agent: the manuscript in scope, or every query when none is. */
export const cardRows = (rows: readonly QcRow[], agentId: string, msId: string | null): QcRow[] =>
  agentRows(rows, agentId, msId);

/* ── the tone (decision 2) ───────────────────────────────────────────────────────────────── */

export type QueryTone = "you" | "agent" | "offer" | "closed" | "none";
export interface CardTone {
  tone: QueryTone;
  /** the chip's words — "YOUR MOVE" is the one in ink */
  label: string;
}

const CLOSED_LABEL: Partial<Record<QueryStatus, string>> = {
  [QueryStatus.REJECTED]: "Closed · passed",
  [QueryStatus.NO_RESPONSE]: "Closed · no reply",
  [QueryStatus.WITHDRAWN]: "Closed · withdrawn",
  [QueryStatus.SIGNED]: "Signed",
};

/**
 * The query section's tone. The offer is read off the QUERY (the Contact list folds an offer into
 * "Your move"; the card has a tone of its own for it). A never-queried agent behind a shut door is
 * stone, as the mock draws it; a live query outranks the shut door, as it does on the row.
 */
export function queryTone(x: Pick<AgentFacts, "stand" | "door">, q: QcRow | null): CardTone {
  if (q && q.court === "offer") return { tone: "offer", label: "Offer on the table" };
  if (x.stand === "you") return { tone: "you", label: "Your move" };
  if (x.stand === "agent") return { tone: "agent", label: "With the agent" };
  if (x.stand === "closed") return { tone: "closed", label: (q && CLOSED_LABEL[q.status]) || "Closed" };
  if (x.door === "closed") return { tone: "closed", label: "Closed to submissions" };
  return { tone: "none", label: "Not yet queried" };
}

/* ── the primary button by stage (§3's table) ────────────────────────────────────────────── */

/** What a button does: a drawer mode, or one of the two things that open no drawer. */
export type CardAct = "offer" | "sent" | "nudge" | "resp" | "log" | "remind" | "qc";
export interface CardButton {
  label: string;
  act: CardAct;
}
export interface CardPrimary extends CardButton {
  /** drawn outlined — the closed query's "Open in Query Centre" is a way out, not a next step */
  ghost?: boolean;
  /** the past-expected query's second button */
  secondary?: CardButton;
}

export function primaryFor(x: Pick<AgentFacts, "standing" | "door">, q: QcRow | null): CardPrimary {
  if (!q || x.standing.kind === "none") {
    return x.door === "closed"
      ? { label: "Remind me when they reopen", act: "remind" }
      : { label: "Log a query", act: "log" };
  }
  if (q.court === "closed") return { label: "Open in Query Centre", act: "qc", ghost: true };
  if (q.court === "offer") return { label: "Answer the offer", act: "offer" };
  if (q.court === "you") {
    if (q.status === QueryStatus.PARTIAL_REQUESTED) return { label: "Send the partial", act: "sent" };
    if (q.status === QueryStatus.FULL_REQUESTED) return { label: "Send the full", act: "sent" };
    if (q.status === QueryStatus.REVISE_RESUBMIT) return { label: "Send the new version", act: "sent" };
    return { label: "Open in Query Centre", act: "qc", ghost: true };
  }
  /* ⚠️ PAST THE EXPECTED DATE ON THE AGENT'S SIDE, AT ANY STAGE — not only "Queried". The table
     names Queried because the mock's one past-date query is one; a full gone quiet is the same
     moment (the row calls it "Your move", and the Query Centre's own doors offer a nudge on every
     query with the agent). */
  if (q.pastExpected) {
    return { label: "Send a nudge", act: "nudge", secondary: { label: "Record a response", act: "resp" } };
  }
  return { label: "Record a response", act: "resp" };
}

/* ── the section's lines ─────────────────────────────────────────────────────────────────── */

const dmy = (ms: number) => formatDate(new Date(ms), { day: "numeric", month: "short" });

/** The "now" line: the stage the query stands at, and the day it got there. */
export interface NowLine {
  status: QueryStatus;
  label: string;
  /** "2 Sep", or "not dated" when nothing dates the stage */
  when: string;
}
export function nowLine(q: QcRow): NowLine {
  const status = q.status as QueryStatus;
  const label = STAGE_NAME[status] ?? String(status);
  const cur = q.history.dated ? q.history.spans[q.history.spans.length - 1] : null;
  return { status, label, when: cur ? dmy(cur.startMs) : "not dated" };
}

/** The line under it: the next date, in the row's own words — or, on a closed query, that nothing
 *  is left to do. `over` is a date gone by, which the card draws in rust. */
export function nextLine(q: QcRow, nowMs: number): RowDateLine | null {
  if (q.court === "closed") return { text: "Nothing more to do here.", over: false };
  return rowDateLine(q, nowMs);
}

/** The steps, oldest first, for the History disclosure. */
export interface TrailStep {
  status: QueryStatus;
  label: string;
  when: string;
  current: boolean;
}
export function trailOf(q: QcRow): TrailStep[] {
  /* ⚠️ AN UNDATED CURRENT STAGE ALREADY HAS ITS SPAN (v65.1): `stageHistory` runs it from the
     previous stage's end so the timeline can draw it, and flags the history `dated: false`. That
     span's start is a stand-in, not a date — so it reads "not dated" here, and it is ONE step. A
     second step appended for it would list the stage twice. */
  const steps: TrailStep[] = q.history.spans.map((s) => ({
    status: s.status,
    label: STAGE_NAME[s.status] ?? String(s.status),
    when: !q.history.dated && s.current ? "not dated" : dmy(s.startMs),
    current: s.current,
  }));
  if (!steps.some((s) => s.current)) {
    if (!q.history.dated) {
      const status = q.status as QueryStatus;
      steps.push({ status, label: STAGE_NAME[status] ?? String(status), when: "not dated", current: true });
    } else if (steps.length) steps[steps.length - 1].current = true;
  }
  return steps;
}

/** "Also queried for <i>The Glass Orchard</i> · Passed, Mar 2025" — this agent's queries for the
 *  OTHER manuscripts, one line per book, the latest first. Nothing when no manuscript is in scope:
 *  then every query is already the card's. */
export interface AlsoQueried {
  title: string;
  status: string;
  when: string;
}
export function alsoQueried(
  rows: readonly QcRow[],
  agentId: string,
  msId: string | null,
  titleOf: (msId: string) => string | null,
): AlsoQueried[] {
  if (msId == null) return [];
  const byMs = new Map<string, QcRow[]>();
  for (const r of rows) {
    if (r.query.agentId !== agentId || r.manuscriptId === msId) continue;
    const list = byMs.get(r.manuscriptId) ?? [];
    list.push(r);
    byMs.set(r.manuscriptId, list);
  }
  const out: (AlsoQueried & { at: number })[] = [];
  for (const [ms, list] of byMs) {
    const q = standingQuery(list);
    const title = titleOf(ms);
    if (!q || !title) continue;
    out.push({
      title,
      status: STAGE_NAME[q.status as QueryStatus] ?? String(q.status),
      when: formatDate(new Date(q.lastMs), { month: "short", year: "numeric" }),
      at: q.lastMs,
    });
  }
  return out.sort((a, b) => b.at - a.at).map(({ at: _at, ...rest }) => rest);
}

/* ── the head ────────────────────────────────────────────────────────────────────────────── */

/** Where they are and how quickly they answer: the flag class, the place, the reply time. */
export interface WhereLine {
  flag: string | null;
  place: string | null;
  reply: string;
}
export function whereLine(a: Pick<Agent, "city" | "country" | "responseTimeWeeks">): WhereLine {
  const place = (a.city ?? "").trim() || countryName(a.country) || null;
  const w = a.responseTimeWeeks;
  /* ⚠️ A STORED 0 IS THE QUICK-ADD STUB, NOT "REPLIES IMMEDIATELY" (v11 ruling c) — it reads as unknown */
  const reply = typeof w === "number" && w > 0
    ? `Replies in about ${w} week${w === 1 ? "" : "s"}`
    : "Reply time unknown";
  return { flag: flagFor(a.country) ?? null, place, reply };
}

/**
 * How they take queries, in the card's words. The stored value is read leniently — older records
 * carry "QueryManager" and "Agency form", which mean Query Manager and the online form (ruling 2);
 * "Other", or anything unrecognised, says nothing rather than guessing.
 */
export function methodPhrase(m: string | undefined | null): string | null {
  const v = (m ?? "").trim().toLowerCase().replace(/\s+/g, "");
  if (v === SubmissionMethod.EMAIL.toLowerCase()) return "By email";
  if (v === "querymanager") return "Via QueryManager";
  if (v === "onlineform" || v === "agencyform") return "Via their form";
  if (v === SubmissionMethod.POST.toLowerCase()) return "By post";
  return null;
}
export function howLine(a: Pick<Agent, "submissionMethod" | "noResponseMeansNo">): string | null {
  const bits = [methodPhrase(a.submissionMethod), a.noResponseMeansNo === true ? "Silence means no" : null].filter(Boolean);
  return bits.length ? bits.join(" · ") : null;
}

/**
 * The MSWL link. `Agent` has no field for it, so it lives as a `socials` entry
 * `{ platform: "MSWL", handle: url }` (§5) — read here, and only here. The href goes through the
 * shared builder like every stored address.
 */
export function mswlLinkOf(a: Pick<Agent, "socials">): string | null {
  const s = (a.socials ?? []).find((x) => (x?.platform ?? "").trim().toLowerCase() === "mswl");
  return s ? hrefFor(s.handle) : null;
}

/* ── what they want ──────────────────────────────────────────────────────────────────────── */

export type MatKind = "ql" | "syn" | "smp" | "oth";
export interface MatChip {
  kind: MatKind;
  label: string;
}
/** The materials as the quick view's chips, decoded by the one parser. */
export function materialChips(materialsWanted: readonly string[] | undefined): MatChip[] {
  const out: MatChip[] = [];
  for (const r of materialRowsFromAgent(materialsWanted)) {
    if (!r.on) continue;
    if (r.key === "queryLetter") out.push({ kind: "ql", label: r.name });
    else if (r.key === "synopsis") out.push({ kind: "syn", label: r.pages ? `Synopsis ${r.pages}pp` : "Synopsis" });
    else if (r.key === "sample") {
      const n = parseInt(r.amount, 10);
      const unit = r.unit.toLowerCase();
      out.push({
        kind: "smp",
        label: Number.isFinite(n) && n > 0 ? `First ${formatAmount(n)} ${n === 1 ? unit.replace(/s$/, "") : unit}` : r.name,
      });
    } else if (r.key === "other" && r.text.trim()) out.push({ kind: "oth", label: r.text.trim() });
  }
  return out;
}

/**
 * The wishlist stamp (decision 11): when the writer last looked at their wishlist. It reads
 * `mswlCheckedAt` and NOTHING else — never `lastCheckedDate`, which means "last verified" — and a
 * missing stamp is "not checked yet", never stale.
 */
export function wishStamp(mswlCheckedAt: string | undefined | null, nowMs: number): string {
  const t = mswlCheckedAt ? Date.parse(mswlCheckedAt) : NaN;
  if (!Number.isFinite(t)) return "not checked yet";
  const a = new Date(t), b = new Date(nowMs);
  if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()) return "checked today";
  return `checked ${formatDate(a, { month: "short", year: "numeric" })}`;
}

/* ── moving through the list ─────────────────────────────────────────────────────────────── */

/** "8 of 41" — null when the card was opened without an order, or this agent is not in it. */
export function seqPosition(seq: readonly string[] | undefined, id: string): { index: number; total: number } | null {
  if (!seq || !seq.length) return null;
  const i = seq.indexOf(id);
  return i < 0 ? null : { index: i, total: seq.length };
}
/** The next or previous agent in the order the card was opened from; null at either end. */
export function stepTarget(seq: readonly string[] | undefined, id: string, dir: 1 | -1): string | null {
  const p = seqPosition(seq, id);
  if (!p) return null;
  const j = p.index + dir;
  return j >= 0 && j < p.total ? seq![j] : null;
}

/* ── the reopen reminder (ruling b) ──────────────────────────────────────────────────────── */

/**
 * The dated To-do a shut door's "Remind me" adds — the same task Housekeeping's REMIND ME adds, so
 * the two doors cannot word it differently. Null without a recorded date: then the card opens the
 * editor at the door instead.
 */
export function reopenReminder(a: Pick<Agent, "id" | "name" | "agency" | "reopensOn">): { agentId: string; dueDate: string; text: string } | null {
  const due = (a.reopensOn ?? "").trim();
  if (!due) return null;
  return {
    agentId: a.id,
    dueDate: due,
    text: `${(a.name ?? "").trim() || (a.agency ?? "").trim()}'s list reopens — check it and query`,
  };
}

/* ── after a save (Agent card v1 §4; the mock's "…and save" journey) ─────────────────────── */

/**
 * The quick view's foot after a save, in the mock's words: "Saved." — and, where the reply time
 * moved them, how many expected-reply dates moved. The count is the dry run's own (`moved` on the
 * reply note — one per live query whose expected date changes), never weeks-arithmetic. A save that
 * added the reopen reminder (decision 13) says so last: "Saved. Reminder added for 1 Nov."
 */
export function cardSavedLine(notes: readonly { moved?: number }[], reminderDue?: string | null): string {
  const moved = notes.reduce((n, x) => n + (x.moved ?? 0), 0);
  const head = moved ? `Saved. ${moved} expected-reply date${moved === 1 ? "" : "s"} moved.` : "Saved.";
  return reminderDue
    ? `${head} Reminder added for ${formatDate(new Date(`${reminderDue}T00:00:00`), { day: "numeric", month: "short" })}.`
    : head;
}

/**
 * DECISION 13 — the date a save's reopen reminder is for, or null: the agent is CLOSED after the
 * save and its reopening date is not the one stored before it (the door just closed with a date, or
 * the date moved). No date means no task; an unchanged date adds nothing (its reminder, if any, is
 * already on the list). The reminder itself is `reopenReminder`'s — the quick view's own.
 */
export function reminderOnSave(
  before: Pick<Agent, "submissionStatus" | "reopensOn">,
  after: Pick<Agent, "submissionStatus" | "reopensOn">,
): string | null {
  if (after.submissionStatus !== "Closed") return null;
  const due = (after.reopensOn ?? "").trim();
  if (!due) return null;
  return due === (before.reopensOn ?? "").trim() ? null : due;
}

/** The parts of the quick view a save pulses — the mock's map: Contact and Submissions changes show
 *  in the head (where and how they take queries), Wishlist changes in the genres section. */
export type SavedPulse = "head" | "genres";
export function savedPulse(tabs: readonly ("who" | "want" | "work")[]): SavedPulse[] {
  const out = new Set<SavedPulse>();
  for (const t of tabs) out.add(t === "want" ? "genres" : "head");
  return [...out];
}
