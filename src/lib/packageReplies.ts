/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * WHAT'S GETTING REPLIES (Submission packages v3 Part E; v4 Part E's table) — pure, unit-locked.
 *
 * Built on `packageResults`' own classification (`firstAnswer`, which reads Analytics' rows) and on
 * `sentRecordOf`, never a status list of this file's own, so this page, the package drawer and Analytics
 * cannot disagree about what a query's first answer was.
 *
 * ⚠️ EDITION-TRUE. A query counts for the material its CREDITED edition actually held, never for what the
 *    package holds now: a package whose letter changed in its 2nd edition credits its 1st-edition queries to
 *    the old letter. An edition missing from `editionsOf(pkg)` (a record the store never wrote) falls back to
 *    the package's current contents, and `missingEditions` reports how often that happened.
 * ⚠️ WITHDRAWN BEFORE ANY ANSWER is in no segment and no rate (`withdrawnEarly`), and STILL WAITING never
 *    enters a rate: `answered` = requests + passes + no reply.
 * ⚠️ WHICH EDITIONS: the page's per-package figures (the card's foot, the drawer's cells and second tab) use
 *    `packageSplit` with the CURRENT edition; the replies table and the drawer's "Beside your other packages"
 *    use ALL editions. The two answer different questions and are both stated where they are read.
 * ⚠️ THIS REVERSES packages-v2's D6 ("no row is marked, sorted by outcome or called best"), at Nick's request
 *    on 12 Oct 2026. The labels stay factual — "Highest reply rate", "Most requests" — and nothing is called
 *    best or marked a winner. Below MIN_SENDS_FOR_CLAIM (4) answered, a row is listed but never compared.
 */
import type { Query, SubmissionPackage } from "../types";
import type { AnalyticsRow } from "./analytics";
import { firstAnswer, type EditionResults } from "./packageResults";
import { sentRecordOf } from "./queryActions/sentRecord";
import { editionsOf } from "./packageEditions";
import { MIN_SENDS_FOR_CLAIM } from "./packageMetrics";

export { MIN_SENDS_FOR_CLAIM };

export interface Split {
  sent: number;
  requests: number;
  /** passes */
  otherReplies: number;
  out: number;
  noReply: number;
  withdrawnEarly: number;
  /** requests + passes */
  replies: number;
  /** requests + passes + no reply */
  answered: number;
  /** replies / answered, or null when nothing is answered */
  rate: number | null;
}

type Counts = Pick<EditionResults, "sent" | "requests" | "passes" | "out" | "noReply" | "withdrawnEarly">;

/** The split of one set of results (packageResults' shape). */
export function split(r: Counts): Split {
  const replies = r.requests + r.passes;
  const answered = replies + r.noReply;
  return {
    sent: r.sent, requests: r.requests, otherReplies: r.passes, out: r.out, noReply: r.noReply,
    withdrawnEarly: r.withdrawnEarly, replies, answered, rate: answered ? replies / answered : null,
  };
}

export const EMPTY_SPLIT: Split = split({ sent: 0, requests: 0, passes: 0, out: 0, noReply: 0, withdrawnEarly: 0 });

/** Tally any set of queries by their FIRST answer — the same classification packageResults uses. */
export function tally(qs: Query[], rows: Map<string, AnalyticsRow>): Split {
  const c = { sent: qs.length, requests: 0, passes: 0, out: 0, noReply: 0, withdrawnEarly: 0 };
  for (const q of qs) {
    const a = firstAnswer(q, rows.get(q.id));
    if (a === "request") c.requests++;
    else if (a === "pass") c.passes++;
    else if (a === "noreply") c.noReply++;
    else if (a === "withdrawn") c.withdrawnEarly++;
    else c.out++;
  }
  return split(c);
}

/** Queries credited to a package: one edition when given, every edition otherwise. */
export function creditedTo(pkgId: string, queries: Query[], edition?: number | null): Query[] {
  return queries.filter((q) => {
    const r = sentRecordOf(q);
    return r.how === "package" && r.packageId === pkgId && (edition == null || r.edition === edition);
  });
}

/** `split` of a package: all editions when `edition` is absent, one edition when given. */
export function packageSplit(pkg: Pick<SubmissionPackage, "id">, queries: Query[], rows: Map<string, AnalyticsRow>, edition?: number | null): Split {
  return tally(creditedTo(pkg.id, queries, edition), rows);
}

export type MaterialKind = "letter" | "synopsis" | "version";

/** The slot a credited query's edition held for `kind`, or null for none (a missing version = Not recorded). */
export function creditedSlot(q: Query, kind: MaterialKind, packages: SubmissionPackage[]): { id: string | null; missingEdition: boolean } | null {
  const r = sentRecordOf(q);
  if (r.how !== "package" || !r.packageId) return null;
  const pkg = packages.find((p) => p.id === r.packageId);
  if (!pkg) return null;
  const ed = editionsOf(pkg).find((e) => e.n === r.edition);
  const src = ed ?? pkg;
  const raw = kind === "letter" ? src.queryLetterVersionId : kind === "synopsis" ? src.synopsisVersionId : src.bookVersionId;
  return { id: raw && raw.trim() ? raw : null, missingEdition: !ed };
}

/**
 * `split` over every credited query whose credited edition's slot held that material. `kind = "version"`
 * with id `null` is the Not recorded bucket (credited queries whose edition had no `bookVersionId`).
 */
export function materialSplit(materialId: string | null, kind: MaterialKind, packages: SubmissionPackage[], queries: Query[], rows: Map<string, AnalyticsRow>): Split {
  return tally(materialQueries(materialId, kind, packages, queries), rows);
}

export function materialQueries(materialId: string | null, kind: MaterialKind, packages: SubmissionPackage[], queries: Query[]): Query[] {
  return queries.filter((q) => {
    const s = creditedSlot(q, kind, packages);
    return !!s && s.id === materialId;
  });
}

/** How many packages (of `packages`) a material's credited queries went out in. */
export function materialPackageCount(materialId: string | null, kind: MaterialKind, packages: SubmissionPackage[], queries: Query[]): number {
  return new Set(materialQueries(materialId, kind, packages, queries).map((q) => sentRecordOf(q).packageId)).size;
}

/** How many credited queries had an edition the package does not record (reported, never hidden). */
export function missingEditions(packages: SubmissionPackage[], queries: Query[]): number {
  return queries.filter((q) => creditedSlot(q, "letter", packages)?.missingEdition).length;
}

/** `split` over every query credited to any of the manuscript's packages. */
export function overall(packages: SubmissionPackage[], queries: Query[], rows: Map<string, AnalyticsRow>): Split {
  const ids = new Set(packages.map((p) => p.id));
  return tally(queries.filter((q) => {
    const r = sentRecordOf(q);
    return r.how === "package" && !!r.packageId && ids.has(r.packageId);
  }), rows);
}

export const qualifies = (s: Split): boolean => s.answered >= MIN_SENDS_FOR_CLAIM;

export interface RankRow { name: string; s: Split }

const byRate = (a: Split, b: Split) => (b.rate ?? -1) - (a.rate ?? -1);

/**
 * The house order (v3 Part E): rows with 4 or more answered first; then requests, high to low; then reply
 * rate; then sent; then A–Z.
 */
export function ranked<T extends RankRow>(rows: T[]): T[] {
  return [...rows].sort((a, b) =>
    Number(qualifies(b.s)) - Number(qualifies(a.s))
    || b.s.requests - a.s.requests
    || byRate(a.s, b.s)
    || b.s.sent - a.s.sent
    || a.name.localeCompare(b.name, "en-GB"));
}

export type SortKey = "name" | "sent" | "replies" | "rate" | "requests";

/**
 * v4 E — the table's heading sort. "Fewer than 4 answered" ALWAYS sorts after the rest, whichever heading
 * is pressed and in either direction; within each half the chosen key orders, then the house order breaks ties.
 */
export function sortRows<T extends RankRow>(rows: T[], key: SortKey, dir: "desc" | "asc"): T[] {
  const house = ranked(rows);
  const pos = new Map(house.map((r, i) => [r, i]));
  const val = (r: T): number | string => key === "name" ? r.name : key === "sent" ? r.s.sent : key === "replies" ? r.s.replies
    : key === "requests" ? r.s.requests : (r.s.rate ?? -1);
  const sign = dir === "desc" ? -1 : 1;
  return [...rows].sort((a, b) => {
    const q = Number(qualifies(b.s)) - Number(qualifies(a.s));
    if (q) return q;
    const va = val(a), vb = val(b);
    const c = typeof va === "string" ? va.localeCompare(vb as string, "en-GB") : (va as number) - (vb as number);
    if (c) return c * sign;
    return (pos.get(a) ?? 0) - (pos.get(b) ?? 0);
  });
}

/** A lead cell's winner: qualifying rows only; ties go to more sent, then A–Z. */
export function leadOf<T extends RankRow>(rows: T[], score: (s: Split) => number): T | null {
  const el = rows.filter((r) => qualifies(r.s));
  if (!el.length) return null;
  return [...el].sort((a, b) => score(b.s) - score(a.s) || b.s.sent - a.s.sent || a.name.localeCompare(b.name, "en-GB"))[0];
}

export const pct = (rate: number | null): string => (rate == null ? "–" : `${Math.round(rate * 100)}%`);

/** The split bar's accessible name, naming all four counts. */
export const splitLabel = (s: Split): string =>
  `${s.requests} request${s.requests === 1 ? "" : "s"}, ${s.otherReplies} other repl${s.otherReplies === 1 ? "y" : "ies"}, ${s.out} still waiting, ${s.noReply} no reply`;
