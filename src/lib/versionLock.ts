/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SENT VERSIONS ARE LOCKED (docs/contracts/package-editions.md §C2; Part B §B2, 28 Sep).
 *
 * A material version that appears in any query's snapshot — its `sentVersions`, or, for a query
 * written before snapshots, the slots of the package it points at — has gone out, so its content can
 * never change. Editing it makes the NEXT version and leaves the sent one byte-identical: "v3 has been
 * sent, so your changes become v4." A rename is a label, not content, and stays allowed.
 */
import type { Query, SubmissionPackage } from "../types";

export function isVersionSent(versionId: string, queries: Pick<Query, "sentVersions" | "packageId" | "sentHow">[], packages: Pick<SubmissionPackage, "id" | "queryLetterVersionId" | "synopsisVersionId" | "editions">[]): boolean {
  if (!versionId) return false;
  const byId = new Map(packages.map((p) => [p.id, p]));
  for (const q of queries) {
    if ((q.sentVersions ?? []).includes(versionId)) return true;
    /* an older query records only its package — every edition that package has had could be it */
    if (!q.sentVersions?.length && q.packageId) {
      const p = byId.get(q.packageId);
      if (!p) continue;
      if (p.queryLetterVersionId === versionId || p.synopsisVersionId === versionId) return true;
      if ((p.editions ?? []).some((e) => e.queryLetterVersionId === versionId || e.synopsisVersionId === versionId)) return true;
    }
  }
  return false;
}

/**
 * The next version's name: a trailing number goes up by one ("Query letter v3" → "Query letter v4"),
 * anything else gains " v2"; and a name already taken keeps counting, so two edits never collide.
 */
export function nextVersionName(name: string, taken: string[] = []): string {
  const has = new Set(taken.map((t) => t.trim().toLowerCase()));
  const m = /^(.*?)(\d+)\s*$/.exec(name.trim());
  const base = m ? m[1] : `${name.trim()} v`;
  let n = m ? Number(m[2]) + 1 : 2;
  let out = `${base}${n}`;
  while (has.has(out.toLowerCase())) { n++; out = `${base}${n}`; }
  return out;
}

/** The sentence the edit screen says before saving (§B2). */
export function lockedEditLine(name: string, next: string): string {
  const short = (s: string) => /(v\d+)\s*$/i.exec(s)?.[1] ?? s;
  return `${short(name)} has been sent, so your changes become ${short(next)}.`;
}
