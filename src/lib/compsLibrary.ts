/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles: each comp's ROW, pure — its kind, readiness, where it is used, the letters naming it and the
 * queries it went out with. Everything is derived from `lib/compUsage`; nothing here is stored.
 *
 * Comps v28 retired v25's list logic from this file (the one filter, the three-click sort, the grouping, the next
 * move, the strip's glance, `draftRow`): the shelf's own sort and filters are `lib/compsShelf`.
 */
import { Agent, CompTitle, ManuscriptVersion, Query, SubmissionPackage } from "../types";
import { CompUse, CompWhere, compKey, ready, whereOf } from "./compUsage";
import { agentInitials, agentPrimary, agentSecondary } from "./agentDisplay";

export type CompKind = "book" | "film" | "tv";
/** Book, film and TV are an icon, never a colour. "other" draws the film mark. */
export const kindOf = (c: Pick<CompTitle, "media">): CompKind => {
  const m = c.media ?? "book";
  return m === "book" ? "book" : m === "tv" ? "tv" : "film";
};

export type LetterLite = Pick<ManuscriptVersion, "id" | "versionName" | "createdDate"> & Partial<Pick<ManuscriptVersion, "compIds" | "status">>;

/** "Query letter v2" reads "QL v2" on a chip; any other name is kept whole. */
export const letterShort = (name: string): string => name.replace(/^query letter\s+/i, "QL ");

export interface RowQuery {
  id: string;
  agentName: string;
  agency: string;
  initials: string;
  status: string;
  dateSent: string | null;
  letterId: string;
  packageName: string | null;
  asked: boolean;
}

export interface CompRow {
  key: string;
  index: number;
  comp: CompTitle;
  kind: CompKind;
  ready: boolean;
  where: CompWhere;
  /** the letters naming it, oldest first, each marked sent or not */
  letters: { id: string; name: string; short: string; sent: boolean; packages: string[] }[];
  /** names of the live packages holding any of those letters */
  packages: string[];
  queries: RowQuery[];
  askedForMore: number;
  /** the newest send among its queries, ISO, or null */
  lastSent: string | null;
}

export interface RowsInput {
  comps: readonly CompTitle[];
  usage: Map<string, CompUse>;
  letters: readonly LetterLite[];
  packages: readonly Pick<SubmissionPackage, "id" | "packageName" | "queryLetterVersionId" | "editions" | "status">[];
  queries: readonly Query[];
  agents: readonly Agent[];
  /** query id → reached a request (the analytics derivation, from compUsage's caller) */
  asked: ReadonlySet<string>;
  /** query id → its letter id */
  letterOfQuery: ReadonlyMap<string, string>;
}

const packagesHolding = (letterId: string, packages: RowsInput["packages"]): string[] =>
  packages
    .filter((p) => p.status !== "Retired")
    .filter((p) => p.queryLetterVersionId === letterId || (p.editions ?? []).some((e) => e.queryLetterVersionId === letterId))
    .map((p) => p.packageName);

export function buildRows(i: RowsInput): CompRow[] {
  const letterById = new Map(i.letters.map((l) => [l.id, l]));
  const queryById = new Map(i.queries.map((q) => [q.id, q]));
  const agentById = new Map(i.agents.map((a) => [a.id, a]));
  const pkgById = new Map(i.packages.map((p) => [p.id, p]));
  return i.comps.map((comp, index) => {
    const key = compKey(comp, index);
    const u = i.usage.get(key);
    const letters = (u?.letters ?? []).flatMap((id) => {
      const l = letterById.get(id);
      return l ? [{ id, name: l.versionName, short: letterShort(l.versionName), sent: (u?.sentLetters ?? []).includes(id), packages: packagesHolding(id, i.packages) }] : [];
    });
    const queries = (u?.queries ?? []).flatMap((id): RowQuery[] => {
      const q = queryById.get(id);
      if (!q) return [];
      const a = agentById.get(q.agentId);
      const pkg = pkgById.get(q.sentPackageId || q.packageId);
      return [{
        id, agentName: a ? agentPrimary(a) : "Agent not on file", agency: a ? agentSecondary(a) : "", initials: agentInitials(a),
        status: q.status, dateSent: q.dateSent ?? null, letterId: i.letterOfQuery.get(id) ?? "",
        packageName: q.sentPackageName || pkg?.packageName || null, asked: i.asked.has(id),
      }];
    });
    const dated = queries.map((q) => q.dateSent).filter((d): d is string => !!d).sort();
    return {
      key, index, comp, kind: kindOf(comp), ready: ready(comp), where: whereOf(u), letters,
      packages: [...new Set(letters.flatMap((l) => l.packages))],
      queries, askedForMore: u?.askedForMore ?? 0, lastSent: dated.length ? dated[dated.length - 1] : null,
    };
  });
}
