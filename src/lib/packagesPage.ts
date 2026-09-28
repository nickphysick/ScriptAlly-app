/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v2 (27 Sep; ref design-refs/materials/packages-v2.html) — the page's pure
 * derivations. Everything here is computed from the stored package, materials and queries; nothing
 * is stored. The counts come from the existing packageMetrics / manuscriptSummary helpers, never
 * a second implementation.
 *
 * ⚠️ FACTS ONLY (D6): nothing here ranks, orders by outcome or names a best package. The Side by side
 * rows keep the packages' own list order.
 */
import { BookVersion, ComponentType, ManuscriptVersion, Query, SubmissionPackage } from "../types";
import { isRequest, isResponse, medianReplyDays } from "./packageMetrics";
import { countWords } from "./materialDraft";
import { latestVersion } from "./bookVersions";
import { suggestedName } from "./buildRow";

export type MatKind = "letter" | "synopsis" | "version";

export interface MaterialItem {
  id: string;
  kind: MatKind;
  name: string;
  /** null for a version (BookVersion has no word count) or an uncounted material */
  words: number | null;
  createdDate: string;
  current: boolean;
  /** put away (`status: "Retired"`): still resolvable by a package that holds it, never offered in the rail */
  retired: boolean;
}

/** "30 Aug" — the mock's short date. */
export const shortDate = (iso: string | undefined | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

const newestFirst = <T extends { createdDate: string }>(xs: T[]): T[] =>
  [...xs].sort((a, b) => (a.createdDate < b.createdDate ? 1 : a.createdDate > b.createdDate ? -1 : 0));

const wordsOf = (v: ManuscriptVersion): number | null =>
  typeof v.wordCount === "number" ? v.wordCount : v.contentDraft ? countWords(v.contentDraft) : null;

/** The rail's three sections, newest first; "Current" on the newest book version. */
export function materialsFor(msId: string, versions: ManuscriptVersion[], bookVersions: BookVersion[]): Record<MatKind, MaterialItem[]> {
  const of = (t: ComponentType, kind: MatKind) =>
    newestFirst(versions.filter((v) => v.manuscriptId === msId && v.componentType === t))
      .map((v): MaterialItem => ({ id: v.id, kind, name: v.versionName, words: wordsOf(v), createdDate: v.createdDate, current: false, retired: v.status === "Retired" }));
  const newest = latestVersion(bookVersions);
  return {
    letter: of(ComponentType.QUERY_LETTER, "letter"),
    synopsis: of(ComponentType.SYNOPSIS, "synopsis"),
    version: newestFirst(bookVersions).map((b) => ({ id: b.id, kind: "version", name: b.name, words: null, createdDate: b.createdDate, current: b.id === newest?.id, retired: false })),
  };
}

/** The rail's lists: what the writer can put in a package — put-away materials left out. */
export const offered = (m: Record<MatKind, MaterialItem[]>): Record<MatKind, MaterialItem[]> => ({
  letter: m.letter.filter((x) => !x.retired), synopsis: m.synopsis.filter((x) => !x.retired), version: m.version,
});

/** How many of this manuscript's packages (retired included) carry the material. */
export function usesOf(m: Pick<MaterialItem, "id" | "kind">, packages: SubmissionPackage[]): number {
  return packages.filter((p) =>
    m.kind === "letter" ? p.queryLetterVersionId === m.id : m.kind === "synopsis" ? p.synopsisVersionId === m.id : p.bookVersionId === m.id).length;
}

/** "310 words · saved 30 Aug · in 2 packages" — words left out when there is no count. */
export function materialMeta(m: MaterialItem, uses: number): string {
  return [m.words != null ? `${m.words.toLocaleString("en-GB")} words` : null, `saved ${shortDate(m.createdDate)}`,
    uses ? `in ${uses} package${uses === 1 ? "" : "s"}` : "in no packages"].filter(Boolean).join(" · ");
}

/** The composer's name suggestion: the mock's "letter · synopsis", else "New package". */
export function suggestPackageName(letter: string | null, synopsis: string | null): string {
  return suggestedName({ let: letter ? { id: "l", name: letter } : null, syn: synopsis ? { id: "s", name: synopsis } : null, ver: null }) || "New package";
}

/** Whole weeks, the mock's form: "4 weeks", "1 week", "Under a week"; null → "—". */
export function weeksText(days: number | null): string {
  if (days == null) return "—";
  const w = Math.round(days / 7);
  return w < 1 ? "Under a week" : `${w} week${w === 1 ? "" : "s"}`;
}

export interface SideRow { id: string; queries: number; requests: number; replies: number; typical: string; retired: boolean }

/** One fact row per SENT package, in the packages' own order. No ranking. */
export function sideBySide(sent: SubmissionPackage[], queries: Query[]): SideRow[] {
  return sent.map((p) => {
    const mine = queries.filter((q) => q.packageId === p.id);
    return {
      id: p.id, queries: mine.length, requests: mine.filter(isRequest).length, replies: mine.filter(isResponse).length,
      typical: weeksText(medianReplyDays(p.id, queries)), retired: p.status === "Retired",
    };
  });
}

/** A package has been sent once `firstSentAt` is stamped (the lock). */
export const isSent = (p: Pick<SubmissionPackage, "firstSentAt">): boolean => !!p.firstSentAt;

/** The copy the card's lock line shows — kept in step with packageMetrics.LOCKED_WHY. */
export const lockLine = (sentAt: string): string =>
  `Letter, synopsis and version fixed since first sent on ${shortDate(sentAt)}, so your records stay true. Duplicate it to try a different mix.`;

/**
 * The hero art (v2.1, E3) — Nick's boxes image: the Archivist carrying a tall stack of archive boxes.
 * Supplied transparent and TRIMMED at 560×696; it draws about 276 tall and clears the one-line title
 * without the v2 art's padding (S6). `version` is the file's sha256 prefix.
 */
export const PACKAGES_HERO = {
  src: "/images/packages/packages-hero-boxes.png", version: "aee79d51", width: 560, height: 696,
  alt: "The Archivist carrying a tall stack of archive boxes",
} as const;

/** The Materials tray's art (v2.1, E2): the talon and the pile. Decorative; the tray clips it. */
export const MATERIALS_PILE = { src: "/images/packages/materials-tray-pile.png", version: "47929d27", width: 400, height: 403 } as const;
