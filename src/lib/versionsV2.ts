/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ VERSIONS v2 — which version went with each query, and every figure the Versions page shows ═══════════════════
 *
 * Design authority: design-refs/versions-v2/versions-v2.html (look and behaviour; its data is invented).
 *
 * ⚠️ ONE READER OF "WHICH VERSION WENT" (D4): `resolveQueryVersion`. The Versions page, the Query Centre's version
 *    lines and the analytics consumers all call it, so no two surfaces can disagree about a query's version.
 * ⚠️ UNRECORDED IS SHOWN, NEVER FOLDED INTO A KNOWN. `null` is its own bucket everywhere below.
 * ⚠️ WITHDRAWN IS EXCLUDED FROM EVERY COUNT AND RATE (D6), and still listed among a version's queries.
 * ⚠️ RATES FROM 5 SENT ONLY (R5). Below 5 a version shows counts and "Too early to tell", cannot be ranked first,
 *    cannot be "Leading", and sorts after the rated ones. This REVERSES bookVersions' "counts, never rates" for this
 *    page only, by the Versions v2 ruling.
 * ⚠️ "ASKED FOR MORE" READS THE HISTORY, NOT THE CURRENT STATUS (R4): Analytics' `reachedRequest` — partial
 *    requested or beyond, R&R and offers included, even where the query later closed. The mock's `isMore` matched
 *    only "requested|Offer" in the current status; that is deliberately not copied.
 * ⚠️ A VERSION IS NEVER A DETERMINANT OF STATUS. `recomputeQuery` reads nothing here.
 * ⚠️ THE APP REPORTS; IT NEVER SUGGESTS WHAT TO CHANGE (R14). No string in this module advises the writer.
 */
import { QueryStatus } from "../types";
import type { Manuscript, ManuscriptVersion, Query, SubmissionPackage } from "../types";
import type { AnalyticsRow } from "./analytics";
import { bookVersionOf, readVersions, type V2Version } from "./bookVersions";
import { creditedSlot } from "./packageReplies";
import { isPackageLocked } from "./packageMetrics";

export const MIN_SENT_FOR_RATE = 5;

/* ══ which version went ══════════════════════════════════════════════════════════════════════════════════════ */

/**
 * "Not sure yet", said on purpose (P10). Clearing the stored id would let the resolver fall back to the package or to
 * Original and count the query anyway — the opposite of what the writer said. So the choice is stored, as this
 * sentinel (it has an id's shape, so the rules accept it, and it names no version), and it resolves to unrecorded.
 */
export const VERSION_NOT_SURE = "not-sure";

export type ResolvedVia = "query" | "package" | "original";
export interface Resolved { id: string; via: ResolvedVia }

/** The calendar day of a stored date, "YYYY-MM-DD" (ISO strings and Firestore timestamps alike). */
export function dayOfStored(at: unknown): string | null {
  if (!at) return null;
  if (typeof at === "string") return /^\d{4}-\d{2}-\d{2}/.test(at) ? at.slice(0, 10) : null;
  const ms = typeof (at as { toMillis?: () => number }).toMillis === "function" ? (at as { toMillis: () => number }).toMillis()
    : at instanceof Date ? at.getTime() : NaN;
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString().slice(0, 10);
}

/** The version a package carries: the credited edition's, else the package's, else its sample material's. */
export function packageVersion(
  q: Pick<Query, "packageId" | "sentPackageId" | "sentHow" | "sentPackageEdition"> & Partial<Query>,
  packages: readonly SubmissionPackage[],
  materials: readonly ManuscriptVersion[],
): string | null {
  const credited = creditedSlot(q as Query, "version", packages as SubmissionPackage[]);
  if (credited?.id) return credited.id;
  const pkgId = q.sentPackageId || q.packageId;
  const pkg = pkgId ? packages.find((p) => p.id === pkgId) : undefined;
  if (!pkg) return null;
  if (pkg.bookVersionId && pkg.bookVersionId.trim()) return pkg.bookVersionId;
  const sample = pkg.samplePagesVersionId ? materials.find((m) => m.id === pkg.samplePagesVersionId) : undefined;
  return sample ? bookVersionOf(sample) : null;
}

/**
 * D4 — which version went with this query:
 *   0. "Not sure yet", said on purpose (`VERSION_NOT_SURE`), is unrecorded and stays so;
 *   1. the query's own `bookVersionId`, if it names a version on the manuscript (archived counts);
 *   2. else the version its package carries;
 *   3. else Original, if the query was sent on or before the day Original was saved;
 *   4. else unrecorded (null).
 */
export function resolveQueryVersion(
  q: Query,
  versions: readonly V2Version[],
  packages: readonly SubmissionPackage[],
  materials: readonly ManuscriptVersion[],
): Resolved | null {
  const has = (id: string | null | undefined) => !!id && versions.some((v) => v.id === id);
  if (q.bookVersionId === VERSION_NOT_SURE) return null;
  if (has(q.bookVersionId)) return { id: q.bookVersionId!, via: "query" };
  const pv = packageVersion(q, packages, materials);
  if (has(pv)) return { id: pv!, via: "package" };
  const orig = versions.find((v) => v.original);
  const sent = dayOfStored(q.dateSent);
  if (orig && sent && sent <= orig.createdDate) return { id: orig.id, via: "original" };
  return null;
}

/**
 * D2 — the in-use version: the stored one, if it is on the manuscript and not archived. A pre-v2 manuscript has none
 * stored, so it reads the active package's version (v1's rule), else the newest live version. Always exactly one
 * once any live version exists.
 */
export function inUseId(ms: Pick<Manuscript, "bookVersions" | "inUseBookVersionId" | "activePackageId"> | null, packages: readonly SubmissionPackage[]): string | null {
  if (!ms) return null;
  const live = readVersions(ms).filter((v) => !v.archived);
  if (!live.length) return null;
  if (ms.inUseBookVersionId && live.some((v) => v.id === ms.inUseBookVersionId)) return ms.inUseBookVersionId;
  const act = ms.activePackageId ? packages.find((p) => p.id === ms.activePackageId) : undefined;
  if (act?.bookVersionId && live.some((v) => v.id === act.bookVersionId)) return act.bookVersionId;
  return [...live].sort((a, b) => b.num - a.num)[0].id;
}

/**
 * D3a / R6 — the version a query records when it is LOGGED: its package's version (when that names a live version on
 * the manuscript), else the in-use version. So a new query is never unrecorded once any version exists.
 */
export function versionAtLogging(
  ms: Pick<Manuscript, "bookVersions" | "inUseBookVersionId" | "activePackageId"> | null,
  pkg: SubmissionPackage | null | undefined,
  packages: readonly SubmissionPackage[],
  materials: readonly ManuscriptVersion[],
): string | null {
  if (!ms) return null;
  const vs = readVersions(ms);
  if (!vs.length) return null;
  if (pkg) {
    const pv = pkg.bookVersionId?.trim() ? pkg.bookVersionId
      : (() => { const s = pkg.samplePagesVersionId ? materials.find((m) => m.id === pkg.samplePagesVersionId) : undefined; return s ? bookVersionOf(s) : null; })();
    if (pv && vs.some((v) => v.id === pv)) return pv;
  }
  return inUseId(ms, packages);
}

/* ══ the figures ═════════════════════════════════════════════════════════════════════════════════════════════ */

export const counts = (q: Pick<Query, "status">): boolean => q.status !== QueryStatus.WITHDRAWN;

export interface VersionFacts {
  v: V2Version;
  /** every query that went with it, newest first, Withdrawn included (listed, never counted) */
  all: Query[];
  /** the counted ones (Withdrawn excluded), oldest first */
  qs: Query[];
  n: number;
  replied: Query[];
  more: Query[];
  offers: Query[];
  partial: number;
  full: number;
  avgReply: number | null;
  replyN: number;
  firstMs: number | null;
  lastMs: number | null;
  /** asked for more ÷ sent, 0–100 rounded — null below 5 sent (R5) */
  ratePct: number | null;
  repliedPct: number | null;
  early: boolean;
}

const sentMsOf = (q: Query, rows: Map<string, AnalyticsRow>): number | null => {
  const r = rows.get(q.id)?.sentMs;
  if (typeof r === "number") return r;
  const d = dayOfStored(q.dateSent);
  return d ? Date.parse(`${d}T12:00:00Z`) : null;
};

/** R4 — a reply is any agent act; asked-for-more is the history's partial-requested rung or beyond. Monotonic. */
export const isMore = (q: Query, rows: Map<string, AnalyticsRow>): boolean => rows.get(q.id)?.reachedRequest === true;
export const isOffer = (q: Query, rows: Map<string, AnalyticsRow>): boolean => rows.get(q.id)?.reachedOffer === true;
export const isReply = (q: Query, rows: Map<string, AnalyticsRow>): boolean => {
  const r = rows.get(q.id);
  return !!r && (r.hasResponded || r.reachedRequest || (q.status !== QueryStatus.QUERIED && q.status !== QueryStatus.NO_RESPONSE && q.status !== QueryStatus.WITHDRAWN));
};

export function versionFacts(v: V2Version, queries: readonly Query[], resolved: Map<string, string | null>, rows: Map<string, AnalyticsRow>): VersionFacts {
  const all = queries.filter((q) => resolved.get(q.id) === v.id)
    .sort((a, b) => (sentMsOf(b, rows) ?? 0) - (sentMsOf(a, rows) ?? 0));
  const qs = all.filter(counts).sort((a, b) => (sentMsOf(a, rows) ?? 0) - (sentMsOf(b, rows) ?? 0));
  const replied = qs.filter((q) => isReply(q, rows));
  const more = qs.filter((q) => isMore(q, rows));
  const offers = qs.filter((q) => isOffer(q, rows));
  const full = more.filter((q) => rows.get(q.id)?.reachedFull === true).length;
  const days = qs.map((q) => rows.get(q.id)?.replyDays).filter((d): d is number => typeof d === "number");
  const sent = qs.map((q) => sentMsOf(q, rows)).filter((x): x is number => x != null);
  const n = qs.length;
  const early = n < MIN_SENT_FOR_RATE;
  return {
    v, all, qs, n, replied, more, offers, partial: more.length - full, full,
    avgReply: days.length ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : null,
    replyN: days.length,
    firstMs: sent.length ? Math.min(...sent) : null,
    lastMs: sent.length ? Math.max(...sent) : null,
    ratePct: early ? null : Math.round((more.length / n) * 100),
    repliedPct: early ? null : Math.round((replied.length / n) * 100),
    early,
  };
}

/** What the page needs, computed once. */
export interface VersionsModel {
  versions: V2Version[];
  live: V2Version[];
  archived: V2Version[];
  original: V2Version | null;
  inUse: string | null;
  resolved: Map<string, string | null>;
  facts: Map<string, VersionFacts>;
  /** counted queries with no version (the banner and the picker) */
  unrecorded: Query[];
  /** every counted query on the manuscript */
  sentTotal: number;
}

export function versionsModel(
  ms: Manuscript | null,
  queries: readonly Query[],
  packages: readonly SubmissionPackage[],
  materials: readonly ManuscriptVersion[],
  rows: Map<string, AnalyticsRow>,
): VersionsModel {
  const versions = readVersions(ms);
  const msQueries = ms ? queries.filter((q) => q.manuscriptId === ms.id) : [];
  const resolved = new Map(msQueries.map((q) => [q.id, resolveQueryVersion(q, versions, packages, materials)?.id ?? null]));
  const facts = new Map(versions.map((v) => [v.id, versionFacts(v, msQueries, resolved, rows)]));
  const counted = msQueries.filter(counts);
  return {
    versions,
    live: versions.filter((v) => !v.archived),
    archived: versions.filter((v) => v.archived),
    original: versions.find((v) => v.original) ?? null,
    inUse: inUseId(ms, packages),
    resolved, facts,
    unrecorded: counted.filter((q) => resolved.get(q.id) == null),
    sentTotal: counted.length,
  };
}

/**
 * The packages a delete clears the version from: this manuscript's packages stating it that have not gone out. A sent
 * package's version is frozen by the rules (and a never-sent version cannot be what a sent package's credited edition
 * carried, or a query would resolve to it).
 */
export const packagesHolding = (packages: readonly SubmissionPackage[], msId: string, versionId: string): SubmissionPackage[] =>
  packages.filter((p) => p.manuscriptId === msId && p.bookVersionId === versionId && !isPackageLocked(p));

/** A version has gone out when any query (Withdrawn included) resolves to it: archive, never delete. */
export const hasGoneOut = (m: VersionsModel, id: string): boolean => (m.facts.get(id)?.all.length ?? 0) > 0;

/** The rated versions (5+ sent), best first — the only ones that can be ranked first or be "Leading". */
export function rated(fs: readonly VersionFacts[]): VersionFacts[] {
  return fs.filter((f) => !f.early).sort((a, b) => (b.ratePct! - a.ratePct!) || (b.n - a.n));
}

/** "Leading": the top rated version, strictly ahead of the next rated one (the ref's rule), 5+ sent (R5). */
export function leadingId(fs: readonly VersionFacts[]): string | null {
  const r = rated(fs);
  return r.length > 1 && r[0].ratePct! > r[1].ratePct! ? r[0].v.id : null;
}

/* ══ the carousel and the league (P6, P7) ════════════════════════════════════════════════════════════════════ */

export type CarouselSort = "rate" | "sent" | "fast";

export function carouselOrder(fs: readonly VersionFacts[], key: CarouselSort): VersionFacts[] {
  const sent = fs.filter((f) => f.n > 0), unsent = fs.filter((f) => f.n === 0);
  const by: Record<CarouselSort, (a: VersionFacts, b: VersionFacts) => number> = {
    rate: (a, b) => (Number(a.early) - Number(b.early)) || ((b.ratePct ?? -1) - (a.ratePct ?? -1)) || (b.n - a.n),
    sent: (a, b) => (b.n - a.n) || ((b.ratePct ?? -1) - (a.ratePct ?? -1)),
    fast: (a, b) => (Number(a.avgReply == null) - Number(b.avgReply == null)) || ((a.avgReply ?? 0) - (b.avgReply ?? 0)),
  };
  return [...sent.sort(by[key]), ...unsent.sort((a, b) => b.v.num - a.v.num)];
}

export type LeagueKey = "n" | "rep" | "rate" | "req" | "avg";

/** The league's order: unsent last; Avg reply ascending, everything else descending; rate needs 5 sent. */
export function leagueOrder(fs: readonly VersionFacts[], key: LeagueKey): VersionFacts[] {
  const val = (f: VersionFacts): number => key === "n" ? f.n : key === "avg" ? (f.avgReply ?? 1e9) : key === "rep" ? f.replied.length
    : key === "rate" ? (f.ratePct ?? -1) : f.more.length;
  return [...fs].sort((a, b) => (Number(a.n === 0) - Number(b.n === 0))
    || (key === "avg" ? val(a) - val(b) : val(b) - val(a))
    || ((b.ratePct ?? -1) - (a.ratePct ?? -1)) || (b.v.num - a.v.num));
}

/* ══ the family tree (P4) ════════════════════════════════════════════════════════════════════════════════════ */

export interface TreeModel { cols: V2Version[][]; path: Set<string>; compact: boolean; nodes: V2Version[] }

/** Live versions plus archived ones that still have live descendants, by generation; the route to the in-use one. */
export function treeModel(m: VersionsModel): TreeModel {
  const byId = new Map(m.versions.map((v) => [v.id, v]));
  const parentOf = (v: V2Version) => (v.parentId ? byId.get(v.parentId) ?? null : null);
  const keep = new Set<string>();
  for (const v of m.live) for (let p = parentOf(v); p; p = parentOf(p)) keep.add(p.id);
  const nodes = m.versions.filter((v) => !v.archived || keep.has(v.id));
  const gen = (v: V2Version) => { let g = 0; for (let p = parentOf(v); p && g < 60; p = parentOf(p)) g++; return g; };
  const cols: V2Version[][] = [];
  for (const v of nodes) (cols[gen(v)] ??= []).push(v);
  for (let g = 0; g < cols.length; g++) {
    cols[g] ??= [];
    const prev = cols[g - 1] ?? [];
    cols[g].sort((a, b) => (prev.indexOf(parentOf(a)!) - prev.indexOf(parentOf(b)!)) || (a.num - b.num));
  }
  const path = new Set<string>();
  for (let x = m.inUse ? byId.get(m.inUse) ?? null : null; x; x = parentOf(x)) path.add(x.id);
  return { cols, path, compact: nodes.length > 7, nodes };
}

export const GENERATION = ["Where it started", "One step on", "Two steps on", "Three steps on", "Four steps on", "Five steps on", "Six steps on", "Seven steps on"];
export const generationLabel = (g: number): string => GENERATION[g] ?? `${g} steps on`;

/* ══ "Which version went?" (P10) ═════════════════════════════════════════════════════════════════════════════ */

/** A version had been saved by the send date (Original always had). */
export const savedBy = (v: V2Version, sentDay: string | null): boolean => v.original || !sentDay || v.createdDate <= sentDay;

/** How long after the send a version was saved: "5 days" / "3 weeks" / "2 months" (the ref's `gap`). */
export function laterBy(savedDay: string, sentDay: string): string {
  const d = Math.round((Date.parse(`${savedDay}T12:00:00Z`) - Date.parse(`${sentDay}T12:00:00Z`)) / 864e5);
  return d < 14 ? `${d} ${d === 1 ? "day" : "days"}` : d < 63 ? `${Math.round(d / 7)} weeks` : `${Math.round(d / 30.4)} months`;
}

/** The picker's first choice for a query: its current version, else the only version saved by its send date. */
export function pickerDefault(q: Query, m: VersionsModel): string | null {
  const cur = m.resolved.get(q.id);
  if (cur) return cur;
  const fits = m.live.filter((v) => savedBy(v, dayOfStored(q.dateSent)));
  return fits.length === 1 ? fits[0].id : null;
}

/* ══ v2.1 — Tracking & performance before there's enough to compare (design-refs/versions-v2-1, S30) ═══════════════
   ⚠️ ONE THRESHOLD: "ready" is MIN_SENT_FOR_RATE sent (withdrawn excluded, the same `n` every figure reads), and the
   full section needs two ready versions. Nothing here restates the number. */

/** How many ready versions the full section needs. */
export const READY_TO_COMPARE = 2;

export type TrackingState = "hidden" | "warming" | "full";

/** B1 — no live versions: hidden; fewer than two live versions with 5+ sent: warming up; otherwise the full section. */
export function trackingState(m: Pick<VersionsModel, "live" | "facts">): TrackingState {
  if (!m.live.length) return "hidden";
  const ready = m.live.filter((v) => (m.facts.get(v.id)?.n ?? 0) >= MIN_SENT_FOR_RATE).length;
  return ready >= READY_TO_COMPARE ? "full" : "warming";
}

/** B2 — the progress rows: live versions by sent (high first), ties by version number. */
export const warmOrder = (fs: readonly VersionFacts[]): VersionFacts[] => [...fs].sort((a, b) => (b.n - a.n) || (a.v.num - b.v.num));

/** B2 — queries still needed: over the two live versions with the most sent, the shortfall to 5 each; a missing
 *  second version needs all 5. */
export function warmNeed(fs: readonly VersionFacts[]): number {
  const top = warmOrder(fs).slice(0, READY_TO_COMPARE);
  return top.reduce((t, f) => t + Math.max(0, MIN_SENT_FOR_RATE - f.n), 0) + (READY_TO_COMPARE - top.length) * MIN_SENT_FOR_RATE;
}

/** A stored date's London calendar day, "YYYY-MM-DD" (a send late on the 30th in summer is the 31st in London). */
export function londonDayOf(at: unknown): string | null {
  const ms = typeof at === "string" ? Date.parse(at) : at && typeof (at as { toMillis?: () => number }).toMillis === "function" ? (at as { toMillis: () => number }).toMillis() : at instanceof Date ? at.getTime() : NaN;
  if (!Number.isFinite(ms)) return null;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms));
}

/** B2 — pace: this manuscript's queries sent in the last 30 London calendar days (today and the 29 before it),
 *  withdrawn excluded, with any version or none. */
export function warmPace(queries: readonly Query[], today: string): number {
  const t = Date.parse(`${today}T12:00:00Z`);
  return queries.filter((q) => {
    if (!counts(q)) return false;
    const d = londonDayOf(q.dateSent);
    if (!d) return false;
    const days = Math.round((t - Date.parse(`${d}T12:00:00Z`)) / 864e5);
    return days >= 0 && days < 30;
  }).length;
}

/** B2 — weeks at that pace, at least 1; null when nothing was sent in 30 days. */
export const warmWeeks = (need: number, pace: number): number | null => (pace > 0 ? Math.max(1, Math.ceil(need / (pace / 30) / 7)) : null);

/* ══ v2.2 C4 — the first save's toast ═════════════════════════════════════════════════════════════════════════ */

/** What the first save says. With queries already out they count towards Original; with none, Original simply came
 *  with the version (S37) — never "your 0 earlier queries". */
export function firstSaveMessage(name: string, earlier: number): string {
  return earlier
    ? `Saved ${name}. Your ${earlier} earlier ${earlier === 1 ? "query counts" : "queries count"} towards Original.`
    : `Saved ${name}, and Original with it.`;
}
