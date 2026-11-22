/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v62 (design-refs/submission-packages-v62) — the page's rules and words, pure and unit-locked.
 * "Send a few, see what comes back, change one thing, send again."
 *
 * ⚠️ THE THREE COUNTS (brief §6.2) are this file's own, over the queries logged with ONE package, every edition:
 *    - sent     every one of them (withdrawn included: it went out)
 *    - replied  the agent has answered: any request, any offer, any rejection. Waiting, closed as no response and
 *               withdrawn (with nothing before) do not count.
 *    - asked    ever reached a partial or full request (Revise & Resubmit and Resubmitted included — Analytics puts
 *               them at the full stage), including ones later rejected and ones that became an offer.
 *    History comes from Analytics' rows (`reachedRequest`, `reachedOffer`, `stageMs`), which read the activity log, so a
 *    partial request later rejected still counts as asked. A query with no row falls back to its current status.
 * ⚠️ THE VERDICT'S THRESHOLDS are VERDICT_MIN_REPLIES and WORKING_SHARE, here and nowhere else.
 * ⚠️ NO PERCENTAGES on this page: every figure is a count.
 */
import { QueryStatus, type Query, type SubmissionPackage } from "../types";
import type { AnalyticsRow } from "./analytics";

/* ══ the thresholds — the one place to change them ══ */
/** Under this many replies, it is too early to say anything. */
export const VERDICT_MIN_REPLIES = 4;
/** "Asked to read more" at least this share of "replied" reads as working. */
export const WORKING_SHARE = 0.5;

/* ══ one query ══ */
type Row = Pick<AnalyticsRow, "reachedRequest" | "reachedOffer" | "stageMs"> | undefined;
type Q = Pick<Query, "status">;

const ASKED_NOW = new Set<string>([
  QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_REQUESTED, QueryStatus.FULL_SENT,
  QueryStatus.REVISE_RESUBMIT, QueryStatus.RESUBMITTED, QueryStatus.OFFER, QueryStatus.SIGNED,
]);
/** A request the agent has not yet answered: the pages are with them, or the writer owes them. */
const REQUEST_OPEN = new Set<string>([
  QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_REQUESTED, QueryStatus.FULL_SENT,
  QueryStatus.REVISE_RESUBMIT, QueryStatus.RESUBMITTED,
]);

/** Ever asked for a partial or the full manuscript (or made an offer). */
export const askedOf = (q: Q, row: Row): boolean => !!row?.reachedRequest || !!row?.reachedOffer || ASKED_NOW.has(q.status);
/** Ever rejected: its status now, or a Rejected rung in its history. */
export const rejectedOf = (q: Q, row: Row): boolean => q.status === QueryStatus.REJECTED || row?.stageMs?.[QueryStatus.REJECTED] != null;
/** The agent has answered. */
export const repliedOf = (q: Q, row: Row): boolean => askedOf(q, row) || rejectedOf(q, row);
/** Still to reply: not answered, and not closed by the writer (no response, withdrawn). */
export const waitingOf = (q: Q, row: Row): boolean =>
  !repliedOf(q, row) && q.status !== QueryStatus.NO_RESPONSE && q.status !== QueryStatus.WITHDRAWN;

/* ══ one package ══ */
export interface Counts {
  sent: number;
  replied: number;
  asked: number;
  /** asked, then rejected */
  askedThenPassed: number;
  /** a request still open (rule 3) */
  openRequests: number;
  /** still to reply */
  waiting: number;
}
export const NO_COUNTS: Counts = { sent: 0, replied: 0, asked: 0, askedThenPassed: 0, openRequests: 0, waiting: 0 };

export function countsOf(qs: readonly Q[], rowOf: (q: Q) => Row): Counts {
  const c = { ...NO_COUNTS };
  for (const q of qs) {
    const row = rowOf(q);
    const asked = askedOf(q, row);
    c.sent++;
    if (repliedOf(q, row)) c.replied++;
    if (asked) c.asked++;
    if (asked && q.status === QueryStatus.REJECTED) c.askedThenPassed++;
    if (REQUEST_OPEN.has(q.status)) c.openRequests++;
    if (waitingOf(q, row)) c.waiting++;
  }
  return c;
}

/* ══ the verdict (brief §6.3) — first rule that fits ══ */
export type VerdictKind = "wait" | "fix" | "good" | "some";
export interface Verdict { kind: VerdictKind; rule: 1 | 2 | 3 | 4 | 5; heading: string; sentence: string }

export const isWorking = (c: Pick<Counts, "asked" | "replied">): boolean => c.replied > 0 && c.asked >= c.replied * WORKING_SHARE;

/** Null when nothing has gone out. `retired` drops the advice to keep going or to wait. */
export function verdictOf(c: Counts, retired: boolean): Verdict | null {
  if (!c.sent) return null;
  if (c.replied < VERDICT_MIN_REPLIES) {
    const first = c.replied ? `${c.replied} of ${c.sent} have replied.` : "No one has replied yet.";
    const more = VERDICT_MIN_REPLIES - c.replied;
    return { kind: "wait", rule: 1, heading: "Too early to say", sentence: retired ? first : `${first} Wait for ${more} more before you change anything.` };
  }
  if (c.asked === 0) {
    return { kind: "fix", rule: 2, heading: "No one has asked to read more",
      sentence: `${c.replied} agents replied and none asked for pages. Look at your letter and your opening before you send again.` };
  }
  if (c.askedThenPassed >= 2 && c.openRequests === 0) {
    return { kind: "fix", rule: 3, heading: "Agents ask for more, then pass",
      sentence: "Your letter and opening are getting you read. The passes are coming after that, so look at the manuscript itself." };
  }
  if (isWorking(c)) {
    const s = `${c.asked} of ${c.replied} agents who replied asked to read more.`;
    return { kind: "good", rule: 4, heading: "This is working", sentence: retired ? s : `${s} Keep sending it.` };
  }
  return { kind: "some", rule: 5, heading: "Some interest", sentence: `${c.asked} of ${c.replied} agents who replied asked to read more.` };
}

/* ══ finished, sent, what it needs ══ */
type Pieces = Pick<SubmissionPackage, "queryLetterVersionId" | "bookVersionId">;
const has = (v: string | undefined | null): boolean => !!v && !!v.trim();
/** Finished: a query letter and a version. */
export const isFinished = (p: Pieces): boolean => has(p.queryLetterVersionId) && has(p.bookVersionId);
/** What an unfinished package still needs, or null when it is finished. */
export function needsOf(p: Pieces): string | null {
  const l = has(p.queryLetterVersionId), v = has(p.bookVersionId);
  if (!l && !v) return "Needs a version and a letter";
  if (!l) return "Needs a query letter";
  if (!v) return "Needs a manuscript version";
  return null;
}

/* ══ words ══ */
export const agentsWord = (n: number): string => `${n} ${n === 1 ? "agent" : "agents"}`;
export const packagesWord = (n: number): string => `${n} ${n === 1 ? "package" : "packages"}`;
export const headerTitle = (live: number): string => (live ? packagesWord(live) : "No packages yet");
export const NEW_BUTTON = "+ New package";
export const FIRST_BUTTON = "+ Make your first package";
export const FINISH_NOTE = "A package needs a version and a letter before it can go out.";

/** "Hook-first · sample from Prologue cut" — the list's and the table's contents line. */
export const contentsLine = (letter: string | null, version: string | null): string =>
  `${letter ?? "No letter yet"} · ${version ? `sample from ${version}` : "no sample yet"}`;

/** The list row's result line: `{lead}` is drawn bold. */
export function resultLine(c: Counts, sent: boolean, p: Pieces): { lead: string | null; text: string } {
  if (sent && c.replied > 0) return { lead: `${c.asked} of ${c.replied}`, text: "asked to read more" };
  if (sent) return { lead: null, text: `Sent to ${agentsWord(c.sent)}, no replies yet` };
  return { lead: null, text: needsOf(p) ?? "Ready to send" };
}

/** The header's line under the package new queries go out with. */
export const goingLine = (c: Counts, sent: boolean, version: string | null, letter: string | null): string =>
  sent ? `Sent to ${agentsWord(c.sent)}, ${c.asked} asked to read more` : `${[version, letter].filter(Boolean).join(" · ")}, not sent yet`;

/** The Change picker's line. */
export const pickLine = (c: Counts, sent: boolean): string => (sent ? `Sent to ${agentsWord(c.sent)}` : "Not sent yet");

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** "Sent in September", with the year when it is not this year. Null when there is no date. */
export function sentIn(firstMs: number | null, nowMs: number): string | null {
  if (firstMs == null || !Number.isFinite(firstMs)) return null;
  const d = new Date(firstMs), now = new Date(nowMs);
  return `Sent in ${MONTHS[d.getMonth()]}${d.getFullYear() === now.getFullYear() ? "" : ` ${d.getFullYear()}`}`;
}

/** The open package's band line: note · Sent in … · Copied from …, or the prompt for a note. */
export const bandLine = (parts: readonly (string | null | undefined)[]): string =>
  parts.map((s) => (s ?? "").trim()).filter(Boolean).join(" · ") || "No note yet. Who is this package for?";

/** "{n} agents" and, if any are waiting, ", {k} still to reply". */
export const whoGotLine = (c: Pick<Counts, "sent" | "waiting">): string =>
  `${agentsWord(c.sent)}${c.waiting ? `, ${c.waiting} still to reply` : ""}`;

/** Under the table, when anything has gone out. */
export function totalsLine(t: Pick<Counts, "sent" | "replied" | "asked">): string | null {
  if (!t.sent) return null;
  const a = t.sent === 1 ? "1 query has gone out with a package." : `${t.sent} queries have gone out with a package.`;
  const b = t.replied === 1 ? "1 agent has replied" : `${t.replied} agents have replied`;
  return `${a} ${b} and ${t.asked} asked to read more.`;
}

/** The parent line: "Copied from {name}, where {a of r} asked to read more." — the tail only when the parent has replies. */
export const copiedFromTail = (parent: Pick<Counts, "asked" | "replied">): string | null =>
  parent.replied > 0 ? `${parent.asked} of ${parent.replied}` : null;

/** "What it tells you" in the table. */
export const tellsYou = (v: Verdict | null, p: Pieces): string => v?.heading ?? (isFinished(p) ? "Not sent yet" : needsOf(p) ?? "Not sent yet");

/* ══ what changed since the parent (brief §6.5) ══ */
export type ChangePiece = "version" | "letter" | "synopsis";
const PIECE_WORD: Record<ChangePiece, string> = { version: "manuscript version", letter: "query letter", synopsis: "synopsis" };
const PIECE_FIELD: Record<ChangePiece, "bookVersionId" | "queryLetterVersionId" | "synopsisVersionId"> = {
  version: "bookVersionId", letter: "queryLetterVersionId", synopsis: "synopsisVersionId",
};
type Diffable = Pick<SubmissionPackage, "bookVersionId" | "queryLetterVersionId" | "synopsisVersionId" | "extraIds">;

/**
 * Each difference as a short chip, version, letter, synopsis, then extras. `nameOf` names a piece by id (null when it
 * is gone); `extraName` names an extra. An extra with no name any more is left out rather than guessed.
 */
export function changesFrom(parent: Diffable, child: Diffable, nameOf: (k: ChangePiece, id: string) => string | null, extraName: (id: string) => string | null): string[] {
  const out: string[] = [];
  for (const k of ["version", "letter", "synopsis"] as const) {
    const f = PIECE_FIELD[k];
    const a = has(parent[f]) ? parent[f]! : null, b = has(child[f]) ? child[f]! : null;
    if (a === b) continue;
    const w = PIECE_WORD[k];
    if (!a && b) { const n = nameOf(k, b); out.push(n ? `Added a ${w} (${n})` : `Added a ${w}`); continue; }
    if (a && !b) { out.push(`Took out the ${w}`); continue; }
    const na = nameOf(k, a!), nb = nameOf(k, b!);
    out.push(na && nb ? `Swapped the ${w}: ${na} to ${nb}` : `Swapped the ${w}`);
  }
  const was = new Set(parent.extraIds ?? []), is = new Set(child.extraIds ?? []);
  for (const id of is) if (!was.has(id)) { const n = extraName(id); if (n) out.push(`Added the ${n.toLowerCase()}`); }
  for (const id of was) if (!is.has(id)) { const n = extraName(id); if (n) out.push(`Took out the ${n.toLowerCase()}`); }
  return out;
}

/* ══ order ══ */
/** The table's order: sent packages by their first query, oldest first; then the unsent ones, oldest made first. */
export function tableOrder<T extends { id: string; createdDate: string }>(pkgs: readonly T[], firstSentMs: (p: T) => number | null): T[] {
  const sent = pkgs.filter((p) => firstSentMs(p) != null).sort((a, b) => firstSentMs(a)! - firstSentMs(b)! || a.createdDate.localeCompare(b.createdDate));
  const rest = pkgs.filter((p) => firstSentMs(p) == null).sort((a, b) => a.createdDate.localeCompare(b.createdDate));
  return [...sent, ...rest];
}

/** "{name} copy", or "{name} copy 2" and on when that is taken. */
export function copyNameOf(name: string, taken: readonly string[]): string {
  const set = new Set(taken.map((t) => t.trim().toLowerCase()));
  const base = `${name} copy`;
  if (!set.has(base.toLowerCase())) return base;
  let n = 2;
  while (set.has(`${base} ${n}`.toLowerCase())) n++;
  return `${base} ${n}`;
}

/* ══ the first-visit note and the Pro tag ══ */
/** The founding writer's hawk (the one the old "Founding writer perk" band drew). */
export const FOUNDING_HAWK = "/images/founding/founding-fledgling.png";
export const NOTE_LEAD = "Packages is a Pro page.";
export const NOTE_REST = "It’s free for you as a founding writer.";
export const NOTE_OK = "Got it";
export const PRO_TAG = "Pro";
export const PRO_TIP = "Free for you as a founding writer";

/* ══ How it works ══ */
export const HOW_TITLE = "How packages work";
export const HOW_LINE = "A package is how you answer the four things every agent wants to know.";
