/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v151.1 (design-refs/query-centre-v151-1/) — the pure parts: the "This week" summary card, the Next
 * column's one phrase, the year mark, and the pill row's groups.
 *
 * ⚠️ NOTHING HERE IS STORED. Every value is read off the Query Centre's own rows (`buildQcRows`), and "who it's with"
 *    is `whereItStands`, the one rule the quick filters, the sections and the summary card share — so the card's
 *    count and the Your move segment's count are the same set by construction.
 */
import { QueryStatus } from "../types";
import { whereItStands, type QcRow, type WhereKey } from "./qcSummary";
import { quickOfRow } from "./queryState";
import { writerExpectedMs } from "./expectedDate";
import { MONTHS_SHORT } from "./dates";
import { daysFrom, isClosedRow } from "./qc151";

const DAY = 86_400_000;
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const sod = (ms: number): number => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };

/* ── dates ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** "2 Jul", and a lighter "’25" only when the year is not this one */
export function yearSplit(ms: number, nowMs: number): { dm: string; yr: string | null } {
  const d = new Date(ms);
  const yr = d.getFullYear() === new Date(nowMs).getFullYear() ? null : `’${String(d.getFullYear()).slice(2)}`;
  return { dm: `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`, yr };
}
/** "Thu 15 Oct" (with "’27" in another year) */
const wdDate = (ms: number, nowMs: number): string => {
  const d = new Date(ms);
  const y = yearSplit(ms, nowMs).yr;
  return `${WD[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}${y ? ` ${y}` : ""}`;
};
const days = (n: number): string => `${n} ${n === 1 ? "day" : "days"}`;

/* ── the Next column: one phrase ───────────────────────────────────────────────────────────────────────────────── */

export type NextTone = "late" | "ink" | "faint" | "none";
export interface NextText { text: string; tone: NextTone }

/**
 * The Next column (v151.1 §7). It combines v151's Next move and Due into one phrase:
 *   the writer's turn (a send owed, an offer to answer) → "8 days late" · "Due today" · "Due tomorrow" (late), else
 *     "Due Thu 15 Oct" (ink);
 *   with the agent, its reply date gone → "Reply 37 days overdue" (late) — a nudge-window row in Your move and a Gone
 *     quiet row alike; gone quiet with no date at all → "No reply in 120 days" (late);
 *   with the agent, the date still to come → "Reply due Sat 10 Oct" where the writer set that date themselves (a set
 *     deadline), "Reply by 22 Oct" where it is the agency's stated window (faint);
 *   closed → "—".
 */
export function nextText(r: QcRow, nowMs: number): NextText {
  if (isClosedRow(r) || r.court === "closed") return { text: "—", tone: "none" };
  const due = r.expectedMs;
  if (r.court === "agent") {
    if (due == null) {
      const inStage = r.stageStartMs != null ? Math.max(0, Math.round((sod(nowMs) - sod(r.stageStartMs)) / DAY)) : null;
      return quickOfRow(r, () => whereItStands(r, nowMs)) === "quiet" && inStage != null
        ? { text: `No reply in ${days(inStage)}`, tone: "late" }
        : { text: "No reply date", tone: "faint" };
    }
    const d = daysFrom(due, nowMs);
    if (d < 0) return { text: `Reply ${days(-d)} overdue`, tone: "late" };
    if (d === 0) return { text: "Reply due today", tone: "faint" };
    const set = writerExpectedMs(r.query) != null;
    return set ? { text: `Reply due ${wdDate(due, nowMs)}`, tone: "faint" } : { text: `Reply by ${yearDm(due, nowMs)}`, tone: "faint" };
  }
  if (due == null) return { text: "No date yet", tone: "faint" };
  const d = daysFrom(due, nowMs);
  if (d < 0) return { text: `${days(-d)} late`, tone: "late" };
  if (d === 0) return { text: "Due today", tone: "late" };
  if (d === 1) return { text: "Due tomorrow", tone: "late" };
  return { text: `Due ${wdDate(due, nowMs)}`, tone: "ink" };
}
const yearDm = (ms: number, nowMs: number): string => { const y = yearSplit(ms, nowMs); return y.yr ? `${y.dm} ${y.yr}` : y.dm; };

/** The tinted end's "Day N": days since the query was sent; none for a closed query or one with no send date */
export const dayLine = (r: Pick<QcRow, "status" | "court" | "sentMs">, nowMs: number): string | null =>
  isClosedRow(r) || r.court === "closed" || r.sentMs == null ? null : `Day ${Math.max(0, Math.round((sod(nowMs) - sod(r.sentMs)) / DAY))}`;

/* ── §2 the "This week" summary card ───────────────────────────────────────────────────────────────────────────── */

type Kind = "offer" | "partial" | "full" | "revision" | "nudge";
const KIND_OF: Partial<Record<QueryStatus, Kind>> = {
  [QueryStatus.OFFER]: "offer", [QueryStatus.PARTIAL_REQUESTED]: "partial", [QueryStatus.FULL_REQUESTED]: "full",
  [QueryStatus.REVISE_RESUBMIT]: "revision",
};
const KIND_GLYPH: Record<Kind, QueryStatus> = {
  offer: QueryStatus.OFFER, partial: QueryStatus.PARTIAL_REQUESTED, full: QueryStatus.FULL_REQUESTED,
  revision: QueryStatus.REVISE_RESUBMIT, nudge: QueryStatus.QUERIED,
};
const KIND_ORDER: readonly Kind[] = ["offer", "partial", "full", "revision", "nudge"];
const NOUN: Record<Kind, [string, string]> = {
  offer: ["offer", "offers"], partial: ["partial", "partials"], full: ["full", "fulls"], revision: ["revision", "revisions"], nudge: ["nudge", "nudges"],
};
const ONTIME: Record<Kind, string> = { offer: "to answer", partial: "to send", full: "to send", revision: "to send", nudge: "to send" };
const SPELL = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
const spell = (n: number): string => SPELL[n] ?? String(n);

export interface SummaryPill { key: string; status: QueryStatus; text: string; late: boolean }
/** v152.2 §1.3 — a to-do row under the sentence: the glyph, the job in bold, the time ("1 day left", "8 days late") */
export interface TodoRow1522 { id: string; status: QueryStatus; job: string; when: string; late: boolean }
export interface WeekSummary { n: number; heading: string; detail: string | null; pills: SummaryPill[]; todo: TodoRow1522[] }

/** a Your move row's kind: its status, or a nudge (a waiting query in its nudge window) */
const kindOf = (r: QcRow): Kind => KIND_OF[r.status] ?? "nudge";
/** late: the writer's date (or the agent's reply date, for a nudge) has gone */
const isLate = (r: QcRow, nowMs: number): boolean => r.expectedMs != null && daysFrom(r.expectedMs, nowMs) < 0;
const offerOn = (r: QcRow): number | null => {
  let ms: number | null = null;
  for (const s of r.history.spans) if (s.status === QueryStatus.OFFER && (ms == null || s.startMs > ms)) ms = s.startMs;
  return ms ?? r.stageStartMs;
};
const dm = (ms: number, nowMs: number): string => yearDm(ms, nowMs);
const sentence = (parts: string[]): string => {
  const s = parts.length <= 1 ? parts.join("") : `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
  return `${s.charAt(0).toUpperCase()}${s.slice(1)}.`;
};
/** "is late" / "are late", in the kind's own noun */
const lateClause = (rows: QcRow[], nowMs: number): string => {
  if (rows.length === 1) {
    const r = rows[0];
    const k = kindOf(r);
    const by = days(-daysFrom(r.expectedMs!, nowMs));
    return k === "nudge" ? `${r.agentName}’s reply is ${by} overdue` : `${r.agentName}’s ${NOUN[k][0]} is ${by} late`;
  }
  const kinds = new Set(rows.map(kindOf));
  if (kinds.size === 1) {
    const k = [...kinds][0];
    return k === "nudge" ? `${spell(rows.length)} replies are overdue` : `${spell(rows.length)} ${NOUN[k][1]} are late`;
  }
  return `${spell(rows.length)} are late`;
};

/**
 * The card (v151.1 §2). N is the Your move set (`whereItStands === "you"`): the writer's turn, an offer included, and a
 * waiting query inside its nudge window. The detail line names the most urgent items: an offer first (who, and the
 * day it came), then what is late; with neither, the soonest date. The pills group the set by kind and lateness.
 * ⚠️ THE ZERO STATE IS THE PROMPT'S WORDING, NOT NICK'S: "Nothing needs you this week" · "Next reply due ‹date›."
 */
export function weekSummary(rows: readonly QcRow[], nowMs: number): WeekSummary {
  /* v152 — the page stamps its rows; Your move is then Offers + Materials requested + Nudge due (lib/queryState) */
  const mine = rows.filter((r) => quickOfRow(r, () => whereItStands(r, nowMs)) === "you");
  if (mine.length === 0) {
    const next = rows.filter((r) => r.court === "agent" && r.expectedMs != null && daysFrom(r.expectedMs, nowMs) >= 0)
      .map((r) => r.expectedMs!).sort((a, b) => a - b)[0];
    return { n: 0, heading: "Nothing needs you this week", detail: next != null ? `Next reply due ${dm(next, nowMs)}.` : null, pills: [], todo: [] };
  }
  const parts: string[] = [];
  const offers = mine.filter((r) => kindOf(r) === "offer");
  if (offers.length === 1) { const at = offerOn(offers[0]); parts.push(`${offers[0].agentName} made an offer${at != null ? ` on ${dm(at, nowMs)}` : ""}`); }
  else if (offers.length > 1) parts.push(`${spell(offers.length)} agents have made offers`);
  const late = mine.filter((r) => kindOf(r) !== "offer" && isLate(r, nowMs));
  if (late.length) parts.push(lateClause(late, nowMs));
  if (!parts.length) {
    const soon = [...mine].filter((r) => r.expectedMs != null).sort((a, b) => a.expectedMs! - b.expectedMs!)[0];
    if (soon) {
      const k = kindOf(soon);
      parts.push(k === "nudge" ? `${soon.agentName}’s reply was due ${dm(soon.expectedMs!, nowMs)}` : `${soon.agentName}’s ${NOUN[k][0]} is due ${wdDate(soon.expectedMs!, nowMs)}`);
    }
  }
  const pills: SummaryPill[] = [];
  for (const k of KIND_ORDER) {
    const of = mine.filter((r) => kindOf(r) === k);
    for (const lt of [true, false]) {
      const set = of.filter((r) => isLate(r, nowMs) === lt);
      if (!set.length) continue;
      const noun = NOUN[k][set.length === 1 ? 0 : 1];
      pills.push({ key: `${k}:${lt ? "late" : "ok"}`, status: KIND_GLYPH[k], late: lt, text: k === "nudge" ? `${set.length} ${noun} ${lt ? "due" : "to send"}` : `${set.length} ${noun} ${lt ? "late" : ONTIME[k]}` });
    }
  }
  return {
    n: mine.length,
    heading: `${mine.length} ${mine.length === 1 ? "query needs" : "queries need"} you this week`,
    detail: parts.length ? sentence(parts) : null,
    pills,
    todo: todoRows(mine, nowMs),
  };
}

/* ── v152.2 §1.3 — the banner's to-do rows ─────────────────────────────────────────────────────────────────────── */
const JOB: Record<Kind, (n: string) => string> = {
  offer: (n) => `Answer ${n}’s offer`,
  partial: (n) => `Send ${n}’s partial`,
  full: (n) => `Send ${n} the full`,
  revision: (n) => `Send ${n} the revision`,
  nudge: (n) => `Nudge ${n}`,
};
const dueOf = (r: QcRow): number | null => {
  if (kindOf(r) === "offer") { const t = Date.parse(String(r.query.offerResponseDeadline ?? "")); if (Number.isFinite(t)) return t; }
  return (r as { replyMs?: number | null }).replyMs ?? r.expectedMs;
};
/** up to four, most urgent first: offers, then late (latest first), then soonest due, then undated */
export function todoRows(mine: readonly QcRow[], nowMs: number, max = 4): TodoRow1522[] {
  const rank = (r: QcRow): [number, number] => {
    if (kindOf(r) === "offer") return [0, dueOf(r) ?? Number.MAX_SAFE_INTEGER];
    const due = dueOf(r);
    if (due == null) return [3, 0];
    const d = daysFrom(due, nowMs);
    return d < 0 ? [1, d] : [2, d];
  };
  return [...mine].sort((a, b) => { const x = rank(a), y = rank(b); return x[0] - y[0] || x[1] - y[1]; }).slice(0, max).map((r) => {
    const k = kindOf(r);
    const due = dueOf(r);
    const d = due != null ? daysFrom(due, nowMs) : null;
    const when = d == null ? "No date yet" : d < 0 ? `${days(-d)} late` : d === 0 ? "Due today" : `${days(d)} left`;
    return { id: r.id, status: KIND_GLYPH[k] === QueryStatus.QUERIED ? (r.status as QueryStatus) : KIND_GLYPH[k], job: JOB[k](r.agentName), when, late: d != null && d < 0 };
  });
}

/* ── §5 the pill row ───────────────────────────────────────────────────────────────────────────────────────────── */

/** a removable chip as the page builds it (Qc140Chip's shape) */
export interface ChipIn { key: string; label: string; off: () => void }
export interface PillGroup {
  key: string;
  /** "Status" / "Package" for a real field; null for a condition of its own */
  field: string | null;
  values: string[];
  off: () => void;
}
/** the panel's groups, by the chip's key: Most used (qp:), Status (st:), What you sent (sent:), More (more:) */
const GROUP_OF = (key: string): { g: string; field: string | null } | null => {
  if (key.startsWith("qp:")) return { g: "most", field: null };
  if (key.startsWith("st:")) return { g: "status", field: "Status" };
  if (key.startsWith("sent:")) return { g: "sent", field: "Package" };
  if (key.startsWith("more:")) return { g: "more", field: null };
  return null;
};
const GROUP_ORDER = ["most", "status", "sent", "more"];

/**
 * One pill per filter group, values OR-ed within it (v151.1 §5). "Where it stands" is the quick filter's own field
 * (`qcF138.where`) and is shown by the segmented control, never as a pill; the search is its own pill. Any other
 * chip the page carries (the older sentence filter, a court, ids from Submission packages) is a condition of its own.
 */
export function pillGroups(chips: readonly ChipIn[]): PillGroup[] {
  const by = new Map<string, PillGroup>();
  const extra: PillGroup[] = [];
  for (const c of chips) {
    if (c.key === "find" || c.key.startsWith("where:")) continue;
    const g = GROUP_OF(c.key);
    if (!g) { extra.push({ key: c.key, field: null, values: [c.label], off: c.off }); continue; }
    const cur = by.get(g.g);
    if (cur) { cur.values.push(c.label); const prev = cur.off; cur.off = () => { prev(); c.off(); }; }
    else by.set(g.g, { key: g.g, field: g.field, values: [c.label], off: c.off });
  }
  return [...GROUP_ORDER.flatMap((k) => (by.has(k) ? [by.get(k)!] : [])), ...extra];
}
/** the pill's words: field · matching word · value, or the condition alone */
export function pillWords(p: Pick<PillGroup, "field" | "values">): { field: string | null; op: string | null; value: string } {
  const many = p.values.length > 2;
  if (p.field) return { field: p.field, op: p.values.length > 1 ? "is any of" : "is", value: many ? `${p.values.length} selected` : p.values.join(", ") };
  return { field: null, op: null, value: many ? `${p.values.length} selected` : p.values.join(" or ") };
}

/* ── tints ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

export const TINT: Record<WhereKey, string> = { you: "#f3e3dc", agent: "#e3e8ee", quiet: "#efe9df", closed: "#ebe7e1" };
export const PILL_FILL: Record<WhereKey, string> = { you: "#f1e6e0", agent: "#e3e8ee", quiet: "#efe9df", closed: "#eeebe6" };
