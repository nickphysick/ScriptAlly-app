/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PACKAGE EDITIONS (docs/contracts/package-editions.md §C2; Part B, 28 Sep).
 *
 * A package's CONTENTS are its letter, its synopsis, its book version and its other materials — the
 * version ids it points at. Nick's ruling (28 Sep): the sample's SIZE is the agent's, so it is never
 * package content and never starts an edition. A rename, the note, or which package is "used for new
 * queries" never starts one either.
 *
 * ⚠️ AN EDITION STARTS ONLY ONCE THE PACKAGE HAS BEEN SENT. An edition is "what went out"; changing an
 * unsent package's contents changes a draft, and minting a 2nd edition that nobody ever received
 * would put an empty 1st edition on every card. Recorded as a deliberate reading of §C2.
 *
 * ⚠️ AN UNMIGRATED PACKAGE IS ITS 1ST EDITION, started on its createdDate (§C5) — `editionsOf`
 * synthesises that record, so nothing waits on a migration and a migrated package reads the same.
 */
import type { PackageEdition, SubmissionPackage } from "../types";

export type PackageContents = Pick<SubmissionPackage, "queryLetterVersionId" | "synopsisVersionId" | "bookVersionId" | "otherMaterials">;

const norm = (s: string | undefined | null) => (s ?? "").trim();

/** The comparable contents. Empty and absent are the same answer. */
export function contentsOf(p: PackageContents): { ql: string; syn: string; bv: string; other: string } {
  return { ql: norm(p.queryLetterVersionId), syn: norm(p.synopsisVersionId), bv: norm(p.bookVersionId), other: norm(p.otherMaterials) };
}

export function contentsChanged(a: PackageContents, b: PackageContents): boolean {
  const x = contentsOf(a), y = contentsOf(b);
  return x.ql !== y.ql || x.syn !== y.syn || x.bv !== y.bv || x.other !== y.other;
}

/** The current edition number — 1 until the model says otherwise. */
export function editionNumber(p: Pick<SubmissionPackage, "edition">): number {
  return typeof p.edition === "number" && Number.isInteger(p.edition) && p.edition >= 1 ? p.edition : 1;
}

/** One edition record from a package's contents. */
export function editionRecord(n: number, startedAt: string, p: PackageContents, summary: string): PackageEdition {
  const c = contentsOf(p);
  return {
    n, startedAt, summary, versions: [c.ql, c.syn].filter(Boolean),
    queryLetterVersionId: c.ql, synopsisVersionId: c.syn,
    ...(c.bv ? { bookVersionId: c.bv } : {}),
    ...(c.other ? { otherMaterials: c.other } : {}),
  };
}

/**
 * Every edition, oldest first — the stored list, or a synthesised 1st edition for a package written
 * before editions. The CURRENT edition is always present and always matches the package's live slots.
 */
export function editionsOf(p: SubmissionPackage, summaryFor: (c: PackageContents) => string = () => ""): PackageEdition[] {
  const stored = Array.isArray(p.editions) ? [...p.editions].sort((a, b) => a.n - b.n) : [];
  if (stored.length) return stored;
  return [editionRecord(1, p.createdDate || "", p, summaryFor(p))];
}

/**
 * THE WRITE A CONTENTS CHANGE MAKES ON A SENT PACKAGE: the next edition number and the list with it
 * appended. Null when nothing starts — the package unsent, or its contents unchanged.
 */
export function nextEdition(p: SubmissionPackage, next: PackageContents, nowIso: string, summaryFor: (c: PackageContents) => string): { edition: number; editions: PackageEdition[] } | null {
  if (!p.firstSentAt) return null;
  if (!contentsChanged(p, { ...p, ...next })) return null;
  const list = editionsOf(p, summaryFor);
  const n = editionNumber(p) + 1;
  return { edition: n, editions: [...list, editionRecord(n, nowIso, { ...p, ...next }, summaryFor({ ...p, ...next }))] };
}

export const ordinal = (n: number): string => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th"}`;

/** The edit screen's warning (§B1) — null when only the name changed, or the package is unsent. */
export function editionWarning(p: SubmissionPackage, next: PackageContents): string | null {
  if (!p.firstSentAt || !contentsChanged(p, { ...p, ...next })) return null;
  const n = editionNumber(p);
  return `This starts ${p.packageName}'s ${ordinal(n + 1)} edition. Queries already sent keep the ${ordinal(n)}.`;
}

/**
 * The readable contents line an edition keeps — "Query letter v3 · Synopsis v2 · Fast-paced opening ·
 * Also: author bio" — built from the version NAMES as they are now, and frozen into the edition record
 * so a later rename cannot rewrite what an edition was called.
 */
export function summaryFrom(
  versions: { id: string; versionName: string }[],
  bookVersions: { id: string; name: string }[],
): (c: PackageContents) => string {
  const bare = (label: string, name: string | undefined) => {
    const n = (name ?? "").trim();
    return n.toLowerCase().startsWith(label.toLowerCase()) ? n.slice(label.length).replace(/^[\s,:·–-]+/, "").trim() || n : n;
  };
  return (p) => {
    const c = contentsOf(p);
    const out: string[] = [];
    if (c.ql) out.push(`Query letter ${bare("Query letter", versions.find((v) => v.id === c.ql)?.versionName)}`.trim());
    if (c.syn) out.push(`Synopsis ${bare("Synopsis", versions.find((v) => v.id === c.syn)?.versionName)}`.trim());
    if (c.bv) { const b = bookVersions.find((x) => x.id === c.bv)?.name; if (b) out.push(b); }
    if (c.other) out.push(`Also: ${c.other}`);
    return out.join(" · ");
  };
}
