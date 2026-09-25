/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ MANUSCRIPT SUMMARY — every derivation the Manuscripts page states, and nothing stored ═════
 *
 * Design authority: design-refs/manuscripts/manuscripts-v12.html. Pure functions over the app's
 * own records; no Firebase import, no component import, nothing written.
 *
 * ⚠️ THE VERSION EDGE IS THE PACKAGE'S OWN `bookVersionId` — the one edge, as `bookVersions.ts`
 * holds it since Part F moved it there (a package states its version; nothing is inherited
 * through a sample slot any more). A query reaches a version ONLY through its package:
 * query → packageId → package.bookVersionId. A query whose package states no version — or which
 * has no package at all — reaches NO version, and is counted in no version row. Folding it into
 * the current version is the flattering, silent fault L3 exists to catch; dropping the totals'
 * honesty the other way (claiming the rows are a census of all queries) is the same fault
 * mirrored, so no function here claims one.
 *
 * ⚠️ THE APP REPORTS, NEVER APPRAISES. Counts and dates, no verdict words, no rates — the same
 * discipline `bookVersions.ts` states for itself.
 */
import { ComponentType, QueryStatus } from "../types";
import type { BookVersion, CompTitle, Manuscript, ManuscriptVersion, Query, SubmissionPackage } from "../types";
import { bookVersionsOf, latestVersion } from "./bookVersions";

/* ══ the version edge ═════════════════════════════════════════════════════════════════════════ */

type PkgEdge = Pick<SubmissionPackage, "id" | "bookVersionId">;
type QEdge = Pick<Query, "id" | "packageId" | "status">;

/** The version a query's package states, or null — the ONLY route from a query to a version. */
export const queryVersionId = (q: Pick<Query, "packageId">, packages: readonly PkgEdge[]): string | null => {
  if (!q.packageId) return null;
  const p = packages.find((x) => x.id === q.packageId);
  return p?.bookVersionId || null;
};

/**
 * The order a count cluster lists its states in — the pipeline's own, with the three closed
 * statuses folded to ONE entry (the StatusDot law: the closed set collapses to one mark; the
 * words, not the glyph, carry which outcome — and a summed bucket has no single outcome to name,
 * so its label is the count of closed queries and nothing more).
 */
export const CLOSED_STATUSES: ReadonlySet<QueryStatus> = new Set([
  QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE,
]);
const OPEN_ORDER: readonly QueryStatus[] = [
  QueryStatus.QUERIED, QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_SENT,
  QueryStatus.FULL_REQUESTED, QueryStatus.FULL_SENT, QueryStatus.REVISE_RESUBMIT, QueryStatus.OFFER,
];

export interface CountEntry {
  /** The status the glyph draws. For the closed bucket it is REJECTED — the three closed marks
   *  are one drawing by the StatusDot law — with `closed: true` naming the fold. */
  status: QueryStatus;
  n: number;
  closed?: boolean;
}

export interface VersionUsage {
  versionId: string;
  counts: CountEntry[];
  /** Every query counted across `counts` — the figure L3's rendered lock reads. */
  total: number;
  packages: number;
}

/** Queries and packages riding one version, grouped for a count cluster. */
export const versionUsage = (
  versionId: string,
  packages: readonly PkgEdge[],
  queries: readonly QEdge[],
): VersionUsage => {
  const mine = queries.filter((q) => queryVersionId(q, packages) === versionId);
  const counts: CountEntry[] = [];
  for (const s of OPEN_ORDER) {
    const n = mine.filter((q) => q.status === s).length;
    if (n > 0) counts.push({ status: s, n });
  }
  const closed = mine.filter((q) => CLOSED_STATUSES.has(q.status)).length;
  if (closed > 0) counts.push({ status: QueryStatus.REJECTED, n: closed, closed: true });
  return {
    versionId,
    counts,
    total: mine.length,
    packages: packages.filter((p) => (p.bookVersionId || null) === versionId).length,
  };
};

/** The queries no version row may count — package states no version, or no package at all. */
export const unattributedQueryIds = (
  packages: readonly PkgEdge[],
  queries: readonly QEdge[],
): string[] => queries.filter((q) => queryVersionId(q, packages) === null).map((q) => q.id);

/* ══ the hero's facts ═════════════════════════════════════════════════════════════════════════ */

/** The newest book version — `latestVersion`'s date fact, re-exported under the page's word. */
export const currentBookVersion = (ms: Pick<Manuscript, "bookVersions"> | null | undefined): BookVersion | null =>
  latestVersion(bookVersionsOf(ms));

/** The earliest sent date across the manuscript's queries, or null while nothing has gone out. */
export const queryingSince = (queries: readonly Pick<Query, "dateSent">[]): string | null => {
  const sent = queries.map((q) => q.dateSent).filter((d): d is string => !!d).sort();
  return sent[0] ?? null;
};

/**
 * "An adult thriller by Ashe Merren, about 50,000 words" — the hero's byline.
 *
 * ⚠️ THE AUTHOR IS `User.name`. There is no pen-name field anywhere in the model (Step 0), so the
 * byline names the account and the report records the gap rather than this function inventing one.
 * Absent pieces drop their clause rather than rendering a hole.
 */
export const bylineFor = (
  ms: Pick<Manuscript, "genre" | "ageCategory" | "wordCount">,
  authorName: string | null | undefined,
): string => {
  const age = (ms.ageCategory || "").trim().toLowerCase();
  const genre = (ms.genre || "").trim().toLowerCase();
  const kind = [age, genre].filter(Boolean).join(" ");
  const article = /^[aeiou]/.test(kind) ? "An" : "A";
  const head = kind ? `${article} ${kind}` : "A manuscript";
  const by = authorName?.trim() ? ` by ${authorName.trim()}` : "";
  const words = ms.wordCount > 0 ? `, about ${ms.wordCount.toLocaleString("en-GB")} words` : "";
  return `${head}${by}${words}`;
};

/* ══ owed requests ════════════════════════════════════════════════════════════════════════════ */

export interface OwedRow {
  query: Query;
  kind: "partial" | "full";
  /** The request rung's own date, or null where the record does not carry one — the sub-line
   *  then omits the date rather than borrowing another event's (the askedOn rule next door). */
  requestedIso: string | null;
  /** "requested a partial, the first 50 pages" · "requested the full manuscript" */
  ask: string;
}

const OWED_STATUSES: ReadonlySet<QueryStatus> = new Set([
  QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED,
]);

/**
 * The requests the writer owes materials for — Partial/Full Requested and nothing else (an R&R
 * owes a revision, which is the To-do board's row, not this one), newest request first. A row
 * with no request date sorts last: an absent date must never read as "just now".
 */
export const owedRequests = (queries: readonly Query[]): OwedRow[] =>
  queries
    .filter((q) => OWED_STATUSES.has(q.status))
    .map((q) => {
      const kind = q.status === QueryStatus.PARTIAL_REQUESTED ? ("partial" as const) : ("full" as const);
      return {
        query: q,
        kind,
        requestedIso: (kind === "partial" ? q.partialRequestedDate : q.fullRequestedDate) ?? null,
        ask: owedAsk(q),
      };
    })
    .sort((a, b) => {
      if (a.requestedIso === null) return b.requestedIso === null ? 0 : 1;
      if (b.requestedIso === null) return -1;
      return a.requestedIso < b.requestedIso ? 1 : a.requestedIso > b.requestedIso ? -1 : 0;
    });

/**
 * The ask, in the record's own terms. A quantity the agent stated is repeated back
 * ("a partial, the first 50 pages"); an unstated one is not invented ("a partial").
 */
export const owedAsk = (
  q: Pick<Query, "status" | "materialsRequestedType" | "materialsRequestedQuantity">,
): string => {
  if (q.status !== QueryStatus.PARTIAL_REQUESTED) return "requested the full manuscript";
  const qty = q.materialsRequestedQuantity;
  const type = q.materialsRequestedType;
  if (qty && type && ["pages", "words", "chapters"].includes(type)) {
    const n = typeof qty === "number" ? qty.toLocaleString("en-GB") : String(qty).trim();
    if (n) return `requested a partial, the first ${n} ${type}`;
  }
  return "requested a partial";
};

/* ══ materials ════════════════════════════════════════════════════════════════════════════════ */

/** Materials of one type on one manuscript, active only, NEWEST first (the mock's order). */
export const materialsOf = (
  manuscriptId: string,
  type: ComponentType,
  versions: readonly ManuscriptVersion[],
): ManuscriptVersion[] =>
  versions
    .filter((v) => v.manuscriptId === manuscriptId && v.componentType === type && v.status !== "Retired")
    .sort((a, b) => (a.createdDate < b.createdDate ? 1 : a.createdDate > b.createdDate ? -1 : 0));

/**
 * The letter attached to the most recently SENT query — the "In use" tag's whole derivation.
 * No sent queries, or none resolving to a letter, means no tag (never a guess).
 */
export const letterInUse = (
  packages: readonly Pick<SubmissionPackage, "id" | "queryLetterVersionId">[],
  queries: readonly Pick<Query, "packageId" | "dateSent">[],
): string | null => {
  const sent = [...queries]
    .filter((q) => !!q.dateSent && !!q.packageId)
    .sort((a, b) => (a.dateSent! < b.dateSent! ? 1 : a.dateSent! > b.dateSent! ? -1 : 0));
  for (const q of sent) {
    const letter = packages.find((p) => p.id === q.packageId)?.queryLetterVersionId;
    if (letter) return letter;
  }
  return null;
};

/** "in N queries" for a letter or a synopsis — queries whose package holds it in that slot. */
export const materialQueryCount = (
  materialId: string,
  slot: "letter" | "synopsis",
  packages: readonly Pick<SubmissionPackage, "id" | "queryLetterVersionId" | "synopsisVersionId">[],
  queries: readonly Pick<Query, "packageId">[],
): number => {
  const holding = new Set(
    packages
      .filter((p) => (slot === "letter" ? p.queryLetterVersionId : p.synopsisVersionId) === materialId)
      .map((p) => p.id),
  );
  return queries.filter((q) => !!q.packageId && holding.has(q.packageId)).length;
};

/**
 * Whether any synopsis names a 2-page length. The record stores no page count, so this reads the
 * writer's own name for the material ("Synopsis, 2 pages") — a stated heuristic, not a fact the
 * model carries, and the note it gates says "Some agents ask for 2 pages", which stays true
 * either way.
 */
export const hasTwoPageSynopsis = (synopses: readonly Pick<ManuscriptVersion, "versionName">[]): boolean =>
  synopses.some((s) => /\b2\s*(?:-\s*)?(?:page|pages|pp)\b/i.test(s.versionName ?? ""));

/* ══ packages ═════════════════════════════════════════════════════════════════════════════════ */

/** Queries riding one package. */
export const packageQueries = <T extends Pick<Query, "packageId">>(
  packageId: string,
  queries: readonly T[],
): T[] => queries.filter((q) => q.packageId === packageId);

/** "N in use" — packages at least one query has gone out with. Active packages only. */
export const packagesInUse = (
  packages: readonly Pick<SubmissionPackage, "id" | "status">[],
  queries: readonly Pick<Query, "packageId">[],
): number =>
  packages.filter((p) => p.status !== "Retired" && queries.some((q) => q.packageId === p.id)).length;

/** A count cluster for one package's queries — same fold, same order as a version's. */
export const packageUsageCounts = (
  packageId: string,
  queries: readonly QEdge[],
): CountEntry[] => {
  const mine = queries.filter((q) => q.packageId === packageId);
  const counts: CountEntry[] = [];
  for (const s of OPEN_ORDER) {
    const n = mine.filter((q) => q.status === s).length;
    if (n > 0) counts.push({ status: s, n });
  }
  const closed = mine.filter((q) => CLOSED_STATUSES.has(q.status)).length;
  if (closed > 0) counts.push({ status: QueryStatus.REJECTED, n: closed, closed: true });
  return counts;
};

/** Initials for a recipient disc — first letters of the first two words of the name. */
export const initialsOf = (name: string | null | undefined): string => {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts.slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
};

/**
 * The Other-materials tiles — the writer's own `otherMaterials` lines across this manuscript's
 * packages, deduplicated by their exact words, each with the queries that went out carrying it.
 *
 * ⚠️ THERE IS NO STANDALONE OTHER-MATERIAL ENTITY (Step 0's reported gap): the app's "Other" is a
 * package's free-text line, deliberately not a fourth slot. These tiles surface what the writer
 * really recorded — their own words, from real packages — and invent no word counts, no dates and
 * no documents. The mock's richer tiles await the entity; run report.
 */
export const otherMaterialTiles = (
  packages: readonly Pick<SubmissionPackage, "id" | "otherMaterials" | "status">[],
  queries: readonly Pick<Query, "packageId">[],
): { label: string; queries: number }[] => {
  const byLabel = new Map<string, Set<string>>();
  for (const p of packages) {
    const label = (p.otherMaterials ?? "").trim();
    if (!label || p.status === "Retired") continue;
    if (!byLabel.has(label)) byLabel.set(label, new Set());
    byLabel.get(label)!.add(p.id);
  }
  return [...byLabel.entries()].map(([label, pkgIds]) => ({
    label,
    queries: queries.filter((q) => !!q.packageId && pkgIds.has(q.packageId)).length,
  }));
};

/* ══ comps ════════════════════════════════════════════════════════════════════════════════════ */

/** The tray's two chips: how many comps, how many the letter names (`inQuery`, absent = false). */
export const compLetterTally = (comps: readonly CompTitle[]): { total: number; inLetter: number } => ({
  total: comps.length,
  inLetter: comps.filter((c) => c.inQuery === true).length,
});

/* ══ the scoped manuscript ════════════════════════════════════════════════════════════════════ */

/**
 * Which manuscript the page shows — the shell's own `scriptally_active_manuscript_id` selection
 * when it names one that exists, else the most recently moved manuscript (statusChangedDate),
 * else the first. Null only when there are none, which is the empty state.
 *
 * ⚠️ THE PAGE IS SINGLE-MANUSCRIPT BY DESIGN (D1); this resolves WHICH one, it does not list.
 * The sidebar switcher stays the way between books and is out of scope here.
 */
export const scopedManuscript = (
  manuscripts: readonly Manuscript[],
  storedId: string | null | undefined,
): Manuscript | null => {
  if (manuscripts.length === 0) return null;
  const stored = storedId ? manuscripts.find((m) => m.id === storedId) : undefined;
  if (stored) return stored;
  return [...manuscripts].sort((a, b) =>
    (a.statusChangedDate ?? "") < (b.statusChangedDate ?? "") ? 1 : -1)[0] ?? null;
};
