/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles v25, Part A: which letters name a comp, and which queries went out with it.
 *
 * A comp carries a stable `id`. A QUERY LETTER (a `ManuscriptVersion` whose `componentType` is Query
 * Letter) records the comps it mentions in `compIds`. Every query is traced to its letter by
 * `letterOf`, so a comp's queries are the queries whose letter names it. Nothing here is stored:
 * every figure the comps page shows is derived from those two facts.
 *
 * ⚠️ `compIds` ABSENT MEANS "NOT RECORDED"; `[]` MEANS "RECORDED: MENTIONS NONE". The two are never
 * folded together: a query whose letter records nothing is not logged, and one whose letter records
 * an empty list is.
 *
 * ⚠️ "REACHED" IS THE ANALYTICS DERIVATION (`buildRows`), never a status list of this file's own, so
 * this page and Analytics cannot disagree about which queries drew a request.
 */
import { Activity, CompTitle, ComponentType, Manuscript, ManuscriptVersion, Query, SubmissionPackage } from "../types";
import { buildRows } from "./analytics";
import { manuscriptComps } from "./comps";
import { editionsOf } from "./packageEditions";
import { sentRecordOf } from "./queryActions/sentRecord";

/** The most comps one letter may record. Artefact-locked to `firestore.rules` (`compIds.size() <= 12`). */
export const MAX_LETTER_COMPS = 12;

type VersionLike = Pick<ManuscriptVersion, "id" | "manuscriptId" | "componentType" | "versionName" | "createdDate"> &
  Partial<Pick<ManuscriptVersion, "compIds" | "status">>;
type PackageLike = Pick<SubmissionPackage, "id" | "queryLetterVersionId" | "synopsisVersionId"> &
  Partial<Pick<SubmissionPackage, "edition" | "editions" | "createdDate" | "bookVersionId" | "otherMaterials" | "packageName" | "manuscriptId">>;
type QueryLike = Pick<Query, "id" | "manuscriptId" | "packageId"> & Partial<Query>;

/* ══ comp identity ════════════════════════════════════════════════════════════════════════════ */

/** A new comp id. Random, so an id is never reused within a manuscript. */
export function newCompId(): string {
  const r = () => Math.random().toString(36).slice(2, 8);
  return `cmp_${r()}${r()}`;
}

/** Every comp with an id: one that has none is given one, one that has one keeps it. */
export function withCompIds(comps: readonly CompTitle[]): CompTitle[] {
  const seen = new Set<string>();
  return comps.map((c) => {
    let id = c.id && !seen.has(c.id) ? c.id : newCompId();
    while (seen.has(id)) id = newCompId();
    seen.add(id);
    return id === c.id ? c : { ...c, id };
  });
}

/**
 * The key a comp is rendered and looked up by: its id, or, before its first write, its index.
 * ⚠️ READ-ONLY. An index key is never written into a letter's `compIds`.
 */
export const compKey = (c: Pick<CompTitle, "id">, index: number): string => c.id ?? `idx_${index}`;

/** The letter-ready rule: a book needs a publisher and a year; a film or TV comp needs a year. */
export const ready = (c: Pick<CompTitle, "year" | "media" | "publisher">): boolean =>
  !!c.year && ((c.media ?? "book") !== "book" || !!c.publisher?.trim());

/* ══ letters ══════════════════════════════════════════════════════════════════════════════════ */

const isLetter = (v: Pick<ManuscriptVersion, "componentType">): boolean => v.componentType === ComponentType.QUERY_LETTER;

/** The manuscript's query letters, oldest first (retired ones included: a retired letter still went out). */
export function lettersOf<V extends VersionLike>(manuscriptId: string, versions: readonly V[]): V[] {
  return versions
    .filter((v) => v.manuscriptId === manuscriptId && isLetter(v))
    .sort((a, b) => (a.createdDate < b.createdDate ? -1 : a.createdDate > b.createdDate ? 1 : 0));
}

export type LetterTrace =
  | { kind: "letter"; letterId: string; via: "versions" | "edition" | "package"; ambiguous: boolean }
  | { kind: "none" };

/**
 * How a query resolves to its letter, with the route it took.
 *
 * 1. `sentVersions` (what went out, as it went out): the ids that are Query Letter versions. More
 *    than one is AMBIGUOUS and the first is taken.
 * 2. Else a package send: the edition that went (`sentPackageEdition`), else the package's letter now.
 * 3. Else none.
 */
export function traceLetter(q: QueryLike, versions: readonly VersionLike[], packages: readonly PackageLike[]): LetterTrace {
  const letterIds = new Set(versions.filter(isLetter).map((v) => v.id));
  const sentIds = Array.isArray(q.sentVersions) ? q.sentVersions : [];
  if (sentIds.length > 0) {
    const hits = sentIds.filter((id) => letterIds.has(id));
    if (hits.length > 0) return { kind: "letter", letterId: hits[0], via: "versions", ambiguous: new Set(hits).size > 1 };
    /* a recorded send that carried no letter */
    return { kind: "none" };
  }
  const rec = sentRecordOf(q);
  if (rec.how !== "package" || !rec.packageId) return { kind: "none" };
  const pkg = packages.find((p) => p.id === rec.packageId);
  if (!pkg) return { kind: "none" };
  const stored = Array.isArray(pkg.editions) ? pkg.editions : [];
  const edition = stored.length > 0 && rec.edition != null
    ? editionsOf(pkg as SubmissionPackage).find((e) => e.n === rec.edition)
    : undefined;
  const fromEdition = edition?.queryLetterVersionId;
  if (fromEdition && letterIds.has(fromEdition)) return { kind: "letter", letterId: fromEdition, via: "edition", ambiguous: false };
  const live = pkg.queryLetterVersionId;
  if (live && letterIds.has(live)) return { kind: "letter", letterId: live, via: "package", ambiguous: false };
  return { kind: "none" };
}

/** The Query Letter version id a query went out with, or null. */
export function letterOf(q: QueryLike, versions: readonly VersionLike[], packages: readonly PackageLike[]): string | null {
  const t = traceLetter(q, versions, packages);
  return t.kind === "letter" ? t.letterId : null;
}

/** A letter is SENT when at least one query resolves to it. */
export function letterSent(letterId: string, queries: readonly QueryLike[], versions: readonly VersionLike[], packages: readonly PackageLike[]): boolean {
  return queries.some((q) => letterOf(q, versions, packages) === letterId);
}

/** Whether a letter's comps have been recorded at all (`[]` counts: it records that it mentions none). */
export const letterRecorded = (v: Partial<Pick<ManuscriptVersion, "compIds">> | null | undefined): boolean => Array.isArray(v?.compIds);

/** A sent letter whose comps are recorded is FIXED: a change is a new version of the letter. */
export function letterFixed(letter: VersionLike, queries: readonly QueryLike[], versions: readonly VersionLike[], packages: readonly PackageLike[]): boolean {
  return letterRecorded(letter) && letterSent(letter.id, queries, versions, packages);
}

/**
 * The current letter: the newest Query Letter version that is not retired (the one the query drawer
 * marks CURRENT), or null when the manuscript has none.
 */
export function currentLetter<V extends VersionLike>(manuscriptId: string, versions: readonly V[]): V | null {
  const live = lettersOf(manuscriptId, versions).filter((v) => v.status !== "Retired");
  return live.length ? live[live.length - 1] : null;
}

/** The comps a letter names, in the shelf's own order. An unrecorded letter names none. */
export function compsInLetter(comps: readonly CompTitle[], letter: Partial<Pick<ManuscriptVersion, "compIds">> | null | undefined): CompTitle[] {
  const ids = new Set(letterRecorded(letter) ? letter!.compIds! : []);
  return comps.filter((c) => !!c.id && ids.has(c.id));
}

/* ══ usage ════════════════════════════════════════════════════════════════════════════════════ */

export interface CompUse {
  /** ids of the letters naming the comp, oldest first */
  letters: string[];
  /** those of them that have gone out */
  sentLetters: string[];
  /** ids of the queries whose letter names the comp, in the order given */
  queries: string[];
  /** how many of those queries reached a partial or full request, or an offer */
  askedForMore: number;
}

export interface UsageInput {
  manuscript: Manuscript;
  versions: readonly VersionLike[];
  packages: readonly PackageLike[];
  /** every query; this is scoped to the manuscript here */
  queries: readonly QueryLike[];
  /** the activity log, for `buildRows`; without it "reached" falls back to the query's own fields */
  activities?: readonly Activity[];
}

const scoped = (i: UsageInput): QueryLike[] => i.queries.filter((q) => q.manuscriptId === i.manuscript.id);

/** Per comp key (`compKey`): the letters naming it and the queries it went out with. */
export function compUsage(manuscript: Manuscript, versions: readonly VersionLike[], packages: readonly PackageLike[], queries: readonly QueryLike[], activities: readonly Activity[] = []): Map<string, CompUse> {
  const mine = scoped({ manuscript, versions, packages, queries });
  const letters = lettersOf(manuscript.id, versions);
  const byLetter = new Map<string, QueryLike[]>();
  for (const q of mine) {
    const l = letterOf(q, versions, packages);
    if (!l) continue;
    byLetter.set(l, [...(byLetter.get(l) ?? []), q]);
  }
  const reached = new Set(
    buildRows(mine as Query[], [...activities], [], 0).filter((r) => r.reachedRequest).map((r) => r.id),
  );
  const out = new Map<string, CompUse>();
  manuscriptComps(manuscript).forEach((c, i) => {
    const named = c.id ? letters.filter((l) => letterRecorded(l) && l.compIds!.includes(c.id!)) : [];
    const qs = named.flatMap((l) => byLetter.get(l.id) ?? []);
    out.set(compKey(c, i), {
      letters: named.map((l) => l.id),
      sentLetters: named.filter((l) => byLetter.has(l.id)).map((l) => l.id),
      queries: qs.map((q) => q.id),
      askedForMore: qs.filter((q) => reached.has(q.id)).length,
    });
  });
  return out;
}

export interface Attachment {
  /** the manuscript's sent queries */
  sent: number;
  /** those whose letter has its comps recorded; a query with no letter is not logged */
  logged: number;
  /** logged / sent as a whole percentage; null when nothing has been sent */
  rate: number | null;
  /** one flag per sent query, oldest first (undated first), for the strip's bars */
  bars: boolean[];
}

export function attachment(manuscript: Manuscript, versions: readonly VersionLike[], packages: readonly PackageLike[], queries: readonly QueryLike[]): Attachment {
  const mine = scoped({ manuscript, versions, packages, queries });
  const byId = new Map(versions.map((v) => [v.id, v]));
  const ordered = [...mine].sort((a, b) => (a.dateSent ?? "").localeCompare(b.dateSent ?? ""));
  const bars = ordered.map((q) => {
    const l = letterOf(q, versions, packages);
    return !!l && letterRecorded(byId.get(l));
  });
  const logged = bars.filter(Boolean).length;
  return { sent: mine.length, logged, rate: mine.length ? Math.round((logged / mine.length) * 100) : null, bars };
}

export interface UnrecordedLetter { letterId: string; name: string; queries: number }

/** Sent letters with `compIds` absent, oldest first, each with the number of queries it went out with. */
export function unrecordedLetters(manuscript: Manuscript, versions: readonly VersionLike[], packages: readonly PackageLike[], queries: readonly QueryLike[]): UnrecordedLetter[] {
  const mine = scoped({ manuscript, versions, packages, queries });
  return lettersOf(manuscript.id, versions)
    .filter((l) => !letterRecorded(l))
    .map((l) => ({ letterId: l.id, name: l.versionName, queries: mine.filter((q) => letterOf(q, versions, packages) === l.id).length }))
    .filter((u) => u.queries > 0);
}

/** Where a comp is used: in a letter that has gone out, in one that has not, or in none. */
export type CompWhere = "sent" | "unsent" | "none";
export const whereOf = (u: CompUse | undefined): CompWhere =>
  !u || u.letters.length === 0 ? "none" : u.queries.length > 0 ? "sent" : "unsent";

/** How the manuscript's queries resolve to letters (the §0 recon's three counts). */
export function resolutionCounts(manuscript: Manuscript, versions: readonly VersionLike[], packages: readonly PackageLike[], queries: readonly QueryLike[]): { resolved: number; unresolved: number; ambiguous: number } {
  let resolved = 0, unresolved = 0, ambiguous = 0;
  for (const q of scoped({ manuscript, versions, packages, queries })) {
    const t = traceLetter(q, versions, packages);
    if (t.kind === "none") unresolved++;
    else { resolved++; if (t.ambiguous) ambiguous++; }
  }
  return { resolved, unresolved, ambiguous };
}

/* ══ everything the comps page reads, in one pass ═════════════════════════════════════════════ */

export interface UsageModel {
  letters: VersionLike[];
  usage: Map<string, CompUse>;
  /** query id → its letter id, for the queries that resolve to one */
  letterOfQuery: Map<string, string>;
  /** letter id → the number of queries it went out with */
  sentByLetter: Map<string, number>;
  /** ids of the queries that reached a partial or full request, or an offer */
  asked: Set<string>;
  attachment: Attachment;
  unrecorded: UnrecordedLetter[];
}

export function usageModel(manuscript: Manuscript, versions: readonly VersionLike[], packages: readonly PackageLike[], queries: readonly QueryLike[], activities: readonly Activity[] = []): UsageModel {
  const mine = queries.filter((q) => q.manuscriptId === manuscript.id);
  const letterOfQuery = new Map<string, string>();
  const sentByLetter = new Map<string, number>();
  for (const q of mine) {
    const l = letterOf(q, versions, packages);
    if (!l) continue;
    letterOfQuery.set(q.id, l);
    sentByLetter.set(l, (sentByLetter.get(l) ?? 0) + 1);
  }
  return {
    letters: lettersOf(manuscript.id, versions),
    usage: compUsage(manuscript, versions, packages, queries, activities),
    letterOfQuery, sentByLetter,
    asked: new Set(buildRows(mine as Query[], [...activities], [], 0).filter((r) => r.reachedRequest).map((r) => r.id)),
    attachment: attachment(manuscript, versions, packages, queries),
    unrecorded: unrecordedLetters(manuscript, versions, packages, queries),
  };
}

/* ══ comps v28: the rates "What's landing" reads ══════════════════════════════════════════════ */

/** A rate: how many asked for more, of how many sent, and the whole percentage (null when none were sent). */
export interface AskedRate { asked: number; sent: number; pct: number | null }
const rateOf = (asked: number, sent: number): AskedRate => ({ asked, sent, pct: sent ? Math.round((asked / sent) * 100) : null });

/**
 * "Your average": the manuscript's request rate, the share of ALL its queries that reached a partial or full
 * request, or an offer.
 * ⚠️ THE ANALYTICS DERIVATION (`buildRows(...).reachedRequest` over every query, waiting ones included), the same
 *    numerator and denominator as Analytics' "Request rate" on all time, so the two pages cannot disagree. Unit-locked
 *    against `analyticsModel` in compUsage.test.ts.
 */
export function averageAsked(manuscript: Pick<Manuscript, "id">, queries: readonly QueryLike[], activities: readonly Activity[] = []): AskedRate {
  const mine = queries.filter((q) => q.manuscriptId === manuscript.id);
  const asked = buildRows(mine as Query[], [...activities], [], 0).filter((r) => r.reachedRequest).length;
  return rateOf(asked, mine.length);
}

/** One letter's rate: of the queries it went out with, how many asked for more. */
export function letterRate(model: Pick<UsageModel, "letterOfQuery" | "asked">, letterId: string): AskedRate {
  let sent = 0, asked = 0;
  for (const [q, l] of model.letterOfQuery) {
    if (l !== letterId) continue;
    sent++;
    if (model.asked.has(q)) asked++;
  }
  return rateOf(asked, sent);
}
