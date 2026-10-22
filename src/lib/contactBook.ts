/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v23 — THE ADDRESS BOOK's pure model (ref design-refs/navy-bar-address-book-v1/contact-list-v23.html):
 * the status pills, the sections the list draws for each sort, the avatar's four states, a "Your move" row's deadline,
 * the header's count and the card's query steps. Every fact is the list's own (`AgentFacts`, `QcRow`); nothing here is
 * stored.
 *
 * ⚠️ THE AVATAR'S STATE IS `AgentFacts.stand`, the existing status predicate (none · agent · you · closed): the same
 *    one the pills filter on, so a pill and the avatars it leaves cannot disagree.
 * ⚠️ SECTIONS ARE RUNS OVER THE SORTED LIST, never a second ordering: a section is the consecutive agents sharing a
 *    label in the order `sortFacts` already gave, so the sort and the headings cannot disagree.
 */
import type { Agent } from "../types";
import { QueryStatus } from "../types";
import { type AgentFacts, STATUS_LABEL, type SortKey, addedMs, surnameInitial } from "./contactList";
import type { QcRow } from "./qcSummary";
import { STAGE_NAME } from "./qcSummary";
import { MONTHS_SHORT } from "./dates";

/* ── the status pills ───────────────────────────────────────────────────────────────────────────────────────── */

export type BookPill = "" | "none" | "agent" | "you" | "closed";
export const BOOK_PILLS: readonly { key: BookPill; label: string }[] = [
  { key: "", label: "All" },
  { key: "none", label: "Not queried" },
  { key: "agent", label: "Querying" },
  { key: "you", label: "Your move" },
  { key: "closed", label: "Closed" },
];
export const inPill = (x: Pick<AgentFacts, "stand">, pill: BookPill): boolean => !pill || x.stand === pill;

/** the avatar's state, the pill's marker and the card's band: one word for each of the four */
export type BookState = "none" | "agent" | "you" | "closed";
export const bookState = (x: Pick<AgentFacts, "stand">): BookState => x.stand;
export const STATE_LABEL: Record<BookState, string> = { none: "Not queried", agent: "Querying", you: "Your move", closed: "Closed" };
/** the card's band: whose court it is */
export const COURT_WORD: Record<BookState, string> = { you: "With you", agent: "With the agent", none: "Not queried yet", closed: "Closed" };

/* ── the header's count ─────────────────────────────────────────────────────────────────────────────────────── */

export function bookCount(shown: number, total: number, narrowed: boolean): string {
  const noun = (n: number) => (n === 1 ? "agent" : "agents");
  return narrowed ? `${shown} of ${total} ${noun(total)}` : `${total} ${noun(total)}`;
}

/* ── the sections ───────────────────────────────────────────────────────────────────────────────────────────── */

/** "Within 4 weeks", "4 to 8 weeks", "Over 8 weeks", "Not stated" — a stated window only (the stub 0 is not stated) */
export function replyBand(a: Pick<Agent, "responseTimeWeeks">): string {
  const w = typeof a.responseTimeWeeks === "number" && a.responseTimeWeeks > 0 ? a.responseTimeWeeks : null;
  if (w == null) return "Not stated";
  return w <= 4 ? "Within 4 weeks" : w <= 8 ? "4 to 8 weeks" : "Over 8 weeks";
}
/** "Aug 2026"; "Not dated" for a record with no readable date */
export function monthLabel(a: Pick<Agent, "dateAdded">): string {
  const t = addedMs(a);
  if (t == null) return "Not dated";
  const d = new Date(t);
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}
export function sectionLabel(x: AgentFacts, key: SortKey): string {
  switch (key) {
    case "added": return monthLabel(x.agent);
    case "reply": return replyBand(x.agent);
    case "status": return STATUS_LABEL[x.status14];
    default: return surnameInitial(x.agent);
  }
}

export interface BookSection { key: string; label: string; n: number; ids: string[] }
/** the consecutive runs of one label over the list as sorted */
export function bookSections(sorted: readonly AgentFacts[], key: SortKey): BookSection[] {
  const out: BookSection[] = [];
  for (const x of sorted) {
    const label = sectionLabel(x, key);
    const last = out[out.length - 1];
    if (last && last.label === label) { last.ids.push(x.agent.id); last.n += 1; }
    else out.push({ key: `${out.length}:${label}`, label, n: 1, ids: [x.agent.id] });
  }
  return out;
}
/** the A–Z thumb index: only when sorted by surname, each letter with whether a section starts there */
export const THUMB_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
export const thumbShown = (key: SortKey): boolean => key === "surname";

/* ── a "Your move" row's deadline ───────────────────────────────────────────────────────────────────────────── */

const dm = (ms: number) => { const d = new Date(ms); return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`; };
/** "BY 30 SEP" or "OVERDUE"; null on any other row, or with no date to keep */
export function dueTag(x: Pick<AgentFacts, "stand" | "q" | "pastExpected">, nowMs: number): { text: string; over: boolean } | null {
  if (x.stand !== "you" || !x.q) return null;
  const q = x.q;
  if (q.court === "agent") return x.pastExpected ? { text: "OVERDUE", over: true } : null;
  if (q.expectedMs == null) return null;
  return q.expectedMs < nowMs ? { text: "OVERDUE", over: true } : { text: `BY ${dm(q.expectedMs).toUpperCase()}`, over: false };
}

/* ── the card's query steps ─────────────────────────────────────────────────────────────────────────────────── */

const STEP_WORD: Partial<Record<QueryStatus, string>> = {
  [QueryStatus.QUERIED]: "Query sent",
  [QueryStatus.REJECTED]: "Passed",
  [QueryStatus.NO_RESPONSE]: "Closed, no reply",
};
export const stepWord = (s: QueryStatus): string => STEP_WORD[s] ?? STAGE_NAME[s as keyof typeof STAGE_NAME] ?? String(s);

export interface BookStep { status: QueryStatus; label: string; dateMs: number | null; current: boolean }
/**
 * Query sent, then each stage it reached (Partial requested/sent, Full requested/sent, Offer, Passed …), the current
 * one last. From the query's dated history; a stage nothing dates is still drawn, undated.
 */
export function bookSteps(q: QcRow): BookStep[] {
  const spans = q.history.spans;
  const out: BookStep[] = spans.map((s) => ({ status: s.status, label: stepWord(s.status), dateMs: s.startMs, current: false }));
  if (!out.length || out[0].status !== QueryStatus.QUERIED) out.unshift({ status: QueryStatus.QUERIED, label: stepWord(QueryStatus.QUERIED), dateMs: q.sentMs, current: false });
  if (out[out.length - 1].status !== q.status) out.push({ status: q.status, label: stepWord(q.status), dateMs: q.stageStartMs, current: false });
  out[out.length - 1].current = true;
  return out;
}
/** "8 SEP": the step's date in the card's mono caps */
export const stepDate = (ms: number | null): string => (ms == null ? "" : dm(ms).toUpperCase());

/** "LAST IN TOUCH 8 SEP": the latest change on any of the agent's queries; "NOT IN TOUCH YET" with none */
export function lastInTouch(x: Pick<AgentFacts, "lastMs">, nowMs: number): string {
  if (x.lastMs == null) return "Not in touch yet";
  const d = new Date(x.lastMs);
  const y = d.getFullYear() !== new Date(nowMs).getFullYear() ? ` ${d.getFullYear()}` : "";
  return `Last in touch ${dm(x.lastMs)}${y}`;
}

/* ── the selection ───────────────────────────────────────────────────────────────────────────────────────────── */

/** the remembered agent if it is still in view, else the first in view; null on an empty list */
export const selectionIn = (visibleIds: readonly string[], want: string | null): string | null =>
  want && visibleIds.includes(want) ? want : visibleIds[0] ?? null;
/** ‹ and ›: the neighbour in the visible order, or null at either end */
export const stepFrom = (visibleIds: readonly string[], id: string | null, by: -1 | 1): string | null => {
  const i = id ? visibleIds.indexOf(id) : -1;
  return i < 0 ? null : visibleIds[i + by] ?? null;
};
