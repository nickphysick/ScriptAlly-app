/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query letters v1 (6 Nov) — the derivations behind the Query letters page. A letter is a `ManuscriptVersion`
 * with componentType "Query Letter"; nothing here writes.
 *
 * ⚠️ ONE READER FOR "IN USE" — `inUseLetter`. The page's header card, its flags and table pill, and the log journey's
 * individual-send default all read it, so they cannot name different letters. The order is the Versions page's
 * (`versionsV2.inUseId`): the stored `inUseLetterId` while it names a live letter, else the active package's letter,
 * else the newest live letter.
 *
 * ⚠️ EARLIER QUERIES ARE CREDITED BY DERIVATION, NEVER REWRITTEN (Part D, Versions' Original rule). A query that
 * records no letter at all — no `sentVersions`, and no package that names one — and was sent on or before the FIRST
 * letter's save day counts towards that first letter. It is credited in the figures only: it does not lock the letter
 * (`direct` is what locks), because the text it went with was never recorded here.
 */
import { ComponentType, QueryStatus } from "../types";
import type { Manuscript, ManuscriptVersion, Query, SubmissionPackage } from "../types";
import type { AnalyticsRow } from "./analytics";
import { traceLetter } from "./compUsage";
import { dayOfStored, isMore, isReply } from "./versionsV2";

/** Letters need about 15 queries before a rate means much (Nick, 6 Nov). Versions keeps its own 5. */
export const LETTER_MIN_SENT = 15;

const isLetter = (v: Pick<ManuscriptVersion, "componentType">) => v.componentType === ComponentType.QUERY_LETTER;
export const isLiveLetter = (v: Pick<ManuscriptVersion, "status">) => (v.status ?? "Active") !== "Retired";
const isLivePkg = (p: { status?: string; retiredAt?: unknown }) => (p.status ?? "Active") !== "Retired" && !(p as { retiredAt?: unknown }).retiredAt;
const newestFirst = (a: ManuscriptVersion, b: ManuscriptVersion) => String(b.createdDate ?? "").localeCompare(String(a.createdDate ?? ""));

/** The manuscript's letters, newest first; retired ones included (a retired letter still went out). */
export function lettersFor(msId: string, versions: readonly ManuscriptVersion[]): ManuscriptVersion[] {
  return versions.filter((v) => v.manuscriptId === msId && isLetter(v)).sort(newestFirst);
}

/** The active package, while it is live and belongs to the manuscript. */
export function activePackageOf(ms: Pick<Manuscript, "id" | "activePackageId"> | null, packages: readonly SubmissionPackage[]): SubmissionPackage | null {
  if (!ms?.activePackageId) return null;
  const p = packages.find((x) => x.id === ms.activePackageId);
  return p && p.manuscriptId === ms.id && isLivePkg(p) ? p : null;
}

/** THE in-use letter (see the header note). Null only when the manuscript has no live letter. */
export function inUseLetter(
  ms: Pick<Manuscript, "id" | "activePackageId" | "inUseLetterId"> | null,
  versions: readonly ManuscriptVersion[],
  packages: readonly SubmissionPackage[],
): ManuscriptVersion | null {
  if (!ms) return null;
  const live = lettersFor(ms.id, versions).filter(isLiveLetter);
  if (!live.length) return null;
  const stored = ms.inUseLetterId ? live.find((v) => v.id === ms.inUseLetterId) : undefined;
  if (stored) return stored;
  const pkgLetter = activePackageOf(ms, packages)?.queryLetterVersionId;
  const fromPkg = pkgLetter ? live.find((v) => v.id === pkgLetter) : undefined;
  return fromPkg ?? live[0];
}

/**
 * Part 1 of Nick's 6 Nov amendment: when the active package holds a DIFFERENT live letter from the in-use one, package
 * sends go out with the package's. The page says so; neither value is changed.
 */
export function packageLetterDiffers(
  ms: Pick<Manuscript, "id" | "activePackageId" | "inUseLetterId"> | null,
  versions: readonly ManuscriptVersion[],
  packages: readonly SubmissionPackage[],
): { pkg: SubmissionPackage; letter: ManuscriptVersion } | null {
  const pkg = activePackageOf(ms, packages);
  const use = inUseLetter(ms, versions, packages);
  if (!pkg || !use || !pkg.queryLetterVersionId || pkg.queryLetterVersionId === use.id) return null;
  const letter = versions.find((v) => v.id === pkg.queryLetterVersionId && isLetter(v));
  return letter ? { pkg, letter } : null;
}

/** A query that records nothing about a letter: no `sentVersions`, and no package naming one. */
const unrecorded = (q: Query, versions: readonly ManuscriptVersion[], packages: readonly SubmissionPackage[]): boolean =>
  !(Array.isArray(q.sentVersions) && q.sentVersions.length > 0) && traceLetter(q, versions, packages).kind === "none";

/** The first letter's save day, the Original-rule cut-off. */
export function firstLetter(msId: string, versions: readonly ManuscriptVersion[]): ManuscriptVersion | null {
  const all = lettersFor(msId, versions);
  return all.length ? all[all.length - 1] : null;
}

/** Each of the manuscript's queries → { letter, credited }. `credited` is the Original-rule credit (see the header). */
export function resolveLetters(
  msId: string,
  queries: readonly Query[],
  versions: readonly ManuscriptVersion[],
  packages: readonly SubmissionPackage[],
): Map<string, { letterId: string; credited: boolean } | null> {
  const first = firstLetter(msId, versions);
  const firstDay = first ? dayOfStored(first.createdDate) : null;
  const out = new Map<string, { letterId: string; credited: boolean } | null>();
  for (const q of queries) {
    if (q.manuscriptId !== msId) continue;
    const t = traceLetter(q, versions, packages);
    if (t.kind === "letter") { out.set(q.id, { letterId: t.letterId, credited: false }); continue; }
    const day = dayOfStored(q.dateSent);
    if (first && firstDay && unrecorded(q, versions, packages) && (!day || day <= firstDay)) {
      out.set(q.id, { letterId: first.id, credited: true });
      continue;
    }
    out.set(q.id, null);
  }
  return out;
}

/** How many queries the FIRST letter's save would credit (Part D's note). Withdrawn queries are not counted. */
export function earlierUnrecorded(msId: string, queries: readonly Query[], versions: readonly ManuscriptVersion[], packages: readonly SubmissionPackage[]): number {
  return queries.filter((q) => q.manuscriptId === msId && q.status !== QueryStatus.WITHDRAWN && unrecorded(q, versions, packages)).length;
}

export interface LetterFacts {
  letter: ManuscriptVersion;
  /** counted queries, newest first */
  qs: Query[];
  sent: number;
  replies: number;
  more: number;
  /** went out with at least one query that RECORDS this letter (locks the text) */
  direct: boolean;
  repliesPct: number;
  morePct: number;
  early: boolean;
}

const sentMs = (q: Query) => { const d = dayOfStored(q.dateSent); return d ? Date.parse(`${d}T12:00:00Z`) : 0; };

export function letterFacts(
  letter: ManuscriptVersion,
  queries: readonly Query[],
  resolved: Map<string, { letterId: string; credited: boolean } | null>,
  rows: Map<string, AnalyticsRow>,
): LetterFacts {
  const mine = queries.filter((q) => resolved.get(q.id)?.letterId === letter.id);
  const qs = mine.filter((q) => q.status !== QueryStatus.WITHDRAWN).sort((a, b) => sentMs(b) - sentMs(a));
  const replies = qs.filter((q) => isReply(q, rows)).length;
  const more = qs.filter((q) => isMore(q, rows)).length;
  const sent = qs.length;
  const pct = (a: number) => (sent ? Math.round((100 * a) / sent) : 0);
  return {
    letter, qs, sent, replies, more,
    direct: mine.some((q) => resolved.get(q.id)?.credited === false),
    repliesPct: pct(replies), morePct: pct(more),
    early: sent < LETTER_MIN_SENT,
  };
}

/** The table's "How sure" words. */
export const howSure = (sent: number): string => (sent < LETTER_MIN_SENT ? `Early days: only ${sent} sent` : "Enough to go on");

/** The card's and the drawer's what-changed line: the stored changes, else the writer's note, else "The first letter"
 *  for the manuscript's oldest letter, else nothing. */
export function changedLine(v: Pick<ManuscriptVersion, "changes" | "notes">, isFirst = false): string {
  if (v.changes?.length) return v.changes.join("; ");
  if (v.notes?.trim()) return v.notes.trim();
  return isFirst ? "The first letter" : "";
}

/** Page order: in use first, then newest. Retired letters are left to the "Show retired" fold. */
export function pageOrder(letters: readonly ManuscriptVersion[], inUseId: string | null): ManuscriptVersion[] {
  return [...letters].sort((a, b) => (a.id === inUseId ? -1 : b.id === inUseId ? 1 : newestFirst(a, b)));
}

/** "{n} query letters" / "1 query letter". */
export const lettersTitle = (n: number): string => `${n} query letter${n === 1 ? "" : "s"}`;

/** Words in a letter body, counted the app's way (whitespace runs). */
export const countWords = (t: string): number => (t.trim() ? t.trim().split(/\s+/).length : 0);

/** The letter's paragraphs, for the card's paper (first four). */
export const openingParas = (t: string | undefined, n = 4): string[] =>
  String(t ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).slice(0, n);

/** Part D's note, said when the first letter is saved with queries already out. */
export const firstLetterNote = (n: number): string =>
  `You already have ${n} ${n === 1 ? "query" : "queries"} out. We'll count ${n === 1 ? "it" : "them"} towards this letter. If that's not right, it's easy to change on each query.`;

/* ── Query letters v2 (12 Nov): pure helpers for the letter desk. Nothing above this line changed. ───────────────── */

/** A square-bracketed gap: up to 80 characters on one line (design-refs/query-letters-v2's `GAP`). */
export const BRACKET_GAP = /\[[^\]\n]{1,80}\]/g;

/** Every distinct `[...]` in the text, in reading order. It reports what is there; it never says what to write. */
export function bracketGaps(text: string): string[] {
  const out: string[] = [];
  for (const m of String(text ?? "").match(BRACKET_GAP) ?? []) if (!out.includes(m)) out.push(m);
  return out;
}

/** The note under "Your letters" while letters under `LETTER_MIN_SENT` are being compared: only when more than one
 *  letter has gone out and at least one of them is early. The ref's wording; "their bars" when more than one. */
export function earlyNote(rows: readonly { name: string; sent: number }[]): string {
  const sent = rows.filter((r) => r.sent > 0);
  const early = sent.filter((r) => r.sent < LETTER_MIN_SENT);
  if (sent.length < 2 || !early.length) return "";
  const names = early.map((r) => r.name).join(" and ");
  return early.length > 1
    ? `${names} have only gone to a few agents so far, so their bars will move a lot with each reply.`
    : `${names} has only gone to a few agents so far, so its bar will move a lot with each reply.`;
}
