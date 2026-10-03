/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE MANUSCRIPTS SHELF (v13) — what the three shelf cards, the version tiles and Recent
 * activity state, derived and never stored ═══════════════════════════════════════════════════
 *
 * Design authority: design-refs/manuscripts/manuscripts-v13.html. Pure functions over the app's own
 * records; no Firebase import, no component import, nothing written. Every count reuses the v12
 * derivations in `manuscriptSummary.ts` (the version edge, the letter in use, the package usage)
 * rather than restating them, so the shelf and anything else reading those cannot disagree.
 *
 * ⚠️ THE APP REPORTS, NEVER APPRAISES — counts, dates and the writer's own names. No ordering here
 * ranks by how well anything did; "newest" is a date fact and "active" is the writer's own choice.
 */
import { ActivityType, QueryStatus } from "../types";
import type {
  Activity, Agent, BookVersion, CompMedia, CompTitle, Manuscript, ManuscriptVersion, Query, SubmissionPackage,
} from "../types";
import { versionUsage } from "./manuscriptSummary";
import { describeEvent, feedPill, queriedTimes, trustedElapsed } from "./dashFeed";
import type { FeedSeg } from "./dashFeed";
import { eventShape } from "./feedConversation";
import { MONTHS_SHORT, dayMonth } from "./dates";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/* ══ the comps card ═══════════════════════════════════════════════════════════════════════════ */

/** How many rows the shelf's comps card draws. */
export const COMP_ROWS_MAX = 3;

/** Absent media is a book (`CompTitle.media`'s own rule). */
const MEDIA_LABEL: Record<CompMedia, string> = { book: "Book", film: "Film", tv: "TV", other: "Other" };

export interface CompRow {
  comp: CompTitle;
  /** The spine-tab's letter — the title's first character, as the mock draws it. */
  initial: string;
  /** "R. Okafor · Harvill · 2021" for a book; "Film · 2019" for anything that is not a book. */
  meta: string;
  inLetter: boolean;
}

/**
 * The comps card's rows: those in the letter first, then the newest by year; a comp with no year
 * follows the dated ones, and the list's own order (append-only, so later is newer) breaks every tie.
 * The same order at any length, so a fourth comp never reshuffles the three already shown.
 */
export const compRows = (comps: readonly CompTitle[]): CompRow[] =>
  comps
    .map((comp, i) => ({ comp, i }))
    .sort((a, b) => {
      const la = a.comp.inQuery === true ? 0 : 1;
      const lb = b.comp.inQuery === true ? 0 : 1;
      if (la !== lb) return la - lb;
      const ya = typeof a.comp.year === "number" ? a.comp.year : null;
      const yb = typeof b.comp.year === "number" ? b.comp.year : null;
      if (ya !== null && yb !== null && ya !== yb) return yb - ya;
      if ((ya === null) !== (yb === null)) return ya === null ? 1 : -1;
      return b.i - a.i;
    })
    .slice(0, COMP_ROWS_MAX)
    .map(({ comp }) => {
      const media = comp.media ?? "book";
      const year = typeof comp.year === "number" ? String(comp.year) : "";
      const meta = media === "book"
        ? [comp.author, comp.publisher, year].map((s) => (s ?? "").trim()).filter(Boolean).join(" · ")
        : [MEDIA_LABEL[media], year].filter(Boolean).join(" · ");
      return {
        comp,
        initial: (comp.title ?? "").trim().charAt(0).toUpperCase() || "?",
        meta,
        inLetter: comp.inQuery === true,
      };
    });

/* ══ the materials card ═══════════════════════════════════════════════════════════════════════ */

/** How many letter and synopsis chips the materials card draws (the other-material chips follow). */
export const MATERIAL_CHIPS_MAX = 3;

export interface MaterialChip {
  id: string;
  name: string;
  /** "310 words · in 2 packages" · "in 1 package" · "no packages" */
  meta: string;
  /** The letter in use — drawn first, on white, ringed in ochre. */
  lead: boolean;
}

/** "in 2 packages" / "no packages" — the live packages holding this material in its own slot. */
const packageClause = (n: number) => (n > 0 ? `in ${plural(n, "package", "packages")}` : "no packages");

/**
 * The materials card's chips: the letter in use first, then the newest across letters and synopses,
 * three at most. `letterInUseId` is `letterInUse` — the letter the most recently sent query's package
 * carries — so this card and the comps card name the same letter.
 */
export const materialChips = (
  letters: readonly ManuscriptVersion[],
  synopses: readonly ManuscriptVersion[],
  letterInUseId: string | null,
  packages: readonly Pick<SubmissionPackage, "queryLetterVersionId" | "synopsisVersionId">[],
): MaterialChip[] => {
  const all = [
    ...letters.map((m) => ({ m, slot: "letter" as const })),
    ...synopses.map((m) => ({ m, slot: "synopsis" as const })),
  ].sort((a, b) => {
    const la = a.m.id === letterInUseId ? 0 : 1;
    const lb = b.m.id === letterInUseId ? 0 : 1;
    if (la !== lb) return la - lb;
    return a.m.createdDate < b.m.createdDate ? 1 : a.m.createdDate > b.m.createdDate ? -1 : 0;
  });
  return all.slice(0, MATERIAL_CHIPS_MAX).map(({ m, slot }) => {
    const held = packages.filter((p) => (slot === "letter" ? p.queryLetterVersionId : p.synopsisVersionId) === m.id).length;
    const words = typeof m.wordCount === "number" && m.wordCount > 0 ? `${m.wordCount.toLocaleString("en-GB")} words` : null;
    return {
      id: m.id,
      name: m.versionName,
      meta: [words, packageClause(held)].filter(Boolean).join(" · "),
      lead: m.id === letterInUseId,
    };
  });
};

/** "3 query letters, 2 synopses" — the materials card's fact, in parts so the counts can be bold. */
export const materialsFact = (letters: number, synopses: number) => ({
  letters: { n: letters, word: letters === 1 ? "query letter" : "query letters" },
  synopses: { n: synopses, word: synopses === 1 ? "synopsis" : "synopses" },
});

/* ══ the packages card ════════════════════════════════════════════════════════════════════════ */

/** How many package rows the shelf's packages card draws. */
export const PACKAGE_ROWS_MAX = 3;

export interface PackageRow {
  pkg: SubmissionPackage;
  /** The writer's own choice for new queries (`activePackageId`) — never a fallback. */
  active: boolean;
  /** Queries that went out with this package. */
  sent: number;
}

/**
 * The packages card's rows: the active package first, then the packages queries went out with, most
 * recent send first, then the unsent ones, newest first. Three at most. `packages` are the
 * manuscript's LIVE packages (a retired one is not on the shelf).
 */
export const packageRows = (
  packages: readonly SubmissionPackage[],
  queries: readonly Pick<Query, "packageId" | "dateSent">[],
  activeId: string | null,
): PackageRow[] => {
  const lastSend = (id: string): string => {
    let last = "";
    for (const q of queries) if (q.packageId === id && q.dateSent && q.dateSent > last) last = q.dateSent;
    return last;
  };
  return packages
    .map((pkg) => ({ pkg, active: pkg.id === activeId, sent: queries.filter((q) => q.packageId === pkg.id).length, last: lastSend(pkg.id) }))
    .sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      if ((a.sent > 0) !== (b.sent > 0)) return a.sent > 0 ? -1 : 1;
      if (a.last !== b.last) return a.last < b.last ? 1 : -1;
      const ca = a.pkg.createdDate ?? "", cb = b.pkg.createdDate ?? "";
      return ca < cb ? 1 : ca > cb ? -1 : 0;
    })
    .slice(0, PACKAGE_ROWS_MAX)
    .map(({ pkg, active, sent }) => ({ pkg, active, sent }));
};

/** "6 queries sent across 2 packages" — the queries riding a live package, and the packages used. */
export const packagesFact = (
  packages: readonly Pick<SubmissionPackage, "id">[],
  queries: readonly Pick<Query, "packageId">[],
): { queries: number; packages: number } => {
  const live = new Set(packages.map((p) => p.id));
  const riding = queries.filter((q) => !!q.packageId && live.has(q.packageId));
  return { queries: riding.length, packages: new Set(riding.map((q) => q.packageId)).size };
};

/* ══ the version tiles ════════════════════════════════════════════════════════════════════════ */

export interface VersionTile {
  v: BookVersion;
  current: boolean;
  /** The three counts the tile's footer draws, from `versionUsage` — nothing else is counted. */
  queried: number;
  requested: number;
  sent: number;
  /** Closed queries on this version. Not drawn as a count (the mock draws three); the tile's
   *  tooltip states it, so a version whose queries have all closed does not read as unused. */
  closed: number;
  packages: number;
}

const REQUESTED: ReadonlySet<QueryStatus> = new Set([QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED]);
const SENT: ReadonlySet<QueryStatus> = new Set([QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT]);

/**
 * The tiles, newest first: by `createdDate`, ties broken by list order (append-only, so later is
 * newer) — the same tie-break `latestVersion` uses, so the Current tile is always the first one.
 */
export const versionTiles = (
  versions: readonly BookVersion[],
  currentId: string | null,
  packages: Parameters<typeof versionUsage>[1],
  queries: Parameters<typeof versionUsage>[2],
): VersionTile[] =>
  versions
    .map((v, i) => ({ v, i }))
    .sort((a, b) => (a.v.createdDate !== b.v.createdDate ? (a.v.createdDate < b.v.createdDate ? 1 : -1) : b.i - a.i))
    .map(({ v }) => {
      const u = versionUsage(v.id, packages, queries);
      const sum = (set: ReadonlySet<QueryStatus>) => u.counts.filter((c) => !c.closed && set.has(c.status)).reduce((s, c) => s + c.n, 0);
      return {
        v,
        current: v.id === currentId,
        queried: u.counts.find((c) => !c.closed && c.status === QueryStatus.QUERIED)?.n ?? 0,
        requested: sum(REQUESTED),
        sent: sum(SENT),
        closed: u.counts.find((c) => c.closed)?.n ?? 0,
        packages: u.packages,
      };
    });

/** "2 Sep 2026" from a date-only "YYYY-MM-DD" — parsed by hand, never through `new Date()`, which
 *  reads a date-only string as UTC midnight and shows the previous day west of Greenwich. */
export const savedOn = (iso: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  if (!m) return "";
  const month = MONTHS_SHORT[Number(m[2]) - 1];
  return month ? `${Number(m[3])} ${month} ${m[1]}` : "";
};

/* ══ recent activity ══════════════════════════════════════════════════════════════════════════ */

/** How many rows Recent activity draws; past this the band link names the Query Centre's log. */
export const ACTIVITY_ROWS_MAX = 7;

export type ActivityGlyph =
  /** a record that produced a status — drawn by StatusDot and nothing else */
  | { kind: "status"; status: QueryStatus }
  /** a record about the manuscript itself — the rust square, the manuscript's object colour */
  | { kind: "ms" }
  /** a query event that names no status (a nudge) — no mark, because no status is claimed */
  | { kind: "none" };

export interface ActivityRow {
  id: string;
  at: number;
  /** "28 Sep" (the year added when it is not this year) — the column uppercases it */
  date: string;
  glyph: ActivityGlyph;
  /** the feed's own sentence, in runs */
  say: FeedSeg[];
  /** "Fast-paced opening · Autumn round" — the version and the package, where the record has them */
  sub: string | null;
  queryId: string | null;
  manuscriptId: string;
}

const MS_TYPES = new Set<string>([ActivityType.MANUSCRIPT_ADDED, ActivityType.MANUSCRIPT_UPDATED, ActivityType.MANUSCRIPT_DELETED]);

export interface ActivityInput {
  ms: Pick<Manuscript, "id" | "title">;
  activities: readonly Activity[];
  queries: readonly Query[];
  agents: readonly Agent[];
  packages: readonly SubmissionPackage[];
  bookVersions: readonly BookVersion[];
  now: Date;
}

/**
 * Every record on THIS manuscript, newest first, each with the dashboard feed's own sentence
 * (`describeEvent`) and pill test (`feedPill`) — so a row reads here exactly as it reads there.
 *
 * ⚠️ A ROW THE FEED WOULD DROP IS DROPPED HERE TOO: no pill, or a query event whose agent cannot be
 * resolved, never renders with a hole in it. `rows` is the first seven; `total` counts every row that
 * would render, which is what decides whether the band names the Query Centre's full log.
 */
export const manuscriptActivity = (i: ActivityInput): { rows: ActivityRow[]; total: number } => {
  const nowMs = i.now.getTime();
  const queriedAt = queriedTimes(i.activities);
  const thisYear = i.now.getFullYear();
  const out: ActivityRow[] = [];

  const onThisBook = i.activities.filter((a) => a.manuscriptId === i.ms.id);
  for (const { a, t } of onThisBook
    .map((x) => ({ a: x, t: new Date(x.date).getTime() }))
    .filter((x) => Number.isFinite(x.t) && x.t <= nowMs)
    .sort((x, y) => y.t - x.t)) {
    if (!feedPill(a)) continue;
    const shape = eventShape(a);
    let say: FeedSeg[] | null = null;
    let sub: string | null = null;
    let glyph: ActivityGlyph = { kind: "none" };

    if (MS_TYPES.has(a.activityType)) {
      const words = (a.description ?? "").trim() || (i.ms.title ?? "").trim();
      if (!words) continue;
      say = [{ t: words }];
      glyph = { kind: "ms" };
    } else if (a.queryId) {
      const q = i.queries.find((x) => x.id === a.queryId);
      const agent = q ? i.agents.find((x) => x.id === q.agentId) : undefined;
      const who = (agent?.name || agent?.agency || "").trim();
      if (!who) continue;
      const sentAt = queriedAt.get(a.queryId) ?? (q?.dateSent ? new Date(q.dateSent).getTime() : null);
      say = describeEvent(
        shape.status, who, (i.ms.title ?? "").trim(), trustedElapsed(sentAt ?? null, t, nowMs),
        String(a.activityType), q?.ifNoResponse === "Mark as no response automatically",
      ) ?? ((a.description ?? "").trim() ? [{ t: a.description.trim() }] : null);
      if (!say) continue;
      if (shape.status) glyph = { kind: "status", status: shape.status };
      const pkg = q?.packageId ? i.packages.find((p) => p.id === q.packageId) : undefined;
      const versionId = a.bookVersionId || pkg?.bookVersionId || null;
      const version = versionId ? i.bookVersions.find((v) => v.id === versionId)?.name : undefined;
      sub = [version, pkg?.packageName].map((s) => (s ?? "").trim()).filter(Boolean).join(" · ") || null;
    } else {
      continue;
    }

    const d = new Date(t);
    out.push({
      id: a.id,
      at: t,
      date: d.getFullYear() === thisYear ? dayMonth(d) : `${dayMonth(d)} ${d.getFullYear()}`,
      glyph,
      say,
      sub,
      queryId: a.queryId || null,
      manuscriptId: a.manuscriptId,
    });
  }
  return { rows: out.slice(0, ACTIVITY_ROWS_MAX), total: out.length };
};
