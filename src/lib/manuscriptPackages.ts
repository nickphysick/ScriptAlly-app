/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * `MATERIALS ON FILE` — the Submission packages pane's four rows, derived.
 * Reference: design-refs/manuscripts-plate.html, `#pane-pkgs` (the `pro-only` half).
 *
 * ⚠️ ONE PANE, FOR EVERYONE. The Free/Pro fork is deliberately gone: the package builder has NO
 * Pro gate today, so a Free pane pitching an upgrade would sell a page the user can already open
 * from the rail. That exact mistake already caused a Pro-selling landing to be retired from that
 * route once — building it here would have recreated it one page over.
 *
 * ⚠️ THE FOUR ROWS ARE FIXED AND ALWAYS RENDER. Absence is stated as `—` against a named slot,
 * which is the whole reason the Details tile is allowed to OMIT its absent materials: the pane is
 * where "nothing here yet" is said explicitly, so the tile saying it too would be the same
 * information twice.
 */
import { ComponentType, ManuscriptVersion, SubmissionPackage } from "../types";

/**
 * ⚠️ THE THREE PACKAGE-SLOT MATERIALS, AND THIS LIST IS SHARED WITH THE DETAILS TILE.
 * `SubmissionPackage` has exactly three slots — queryLetterVersionId / synopsisVersionId /
 * samplePagesVersionId — so these three ARE the package materials.
 *
 * `ComponentType.FULL_MANUSCRIPT` is deliberately absent: it is not a package slot. A full
 * manuscript is what you send when an agent asks, not part of a query package. If that turns out
 * to be wrong it is ONE list to change, not two surfaces to reconcile — which is why the tile
 * imports this rather than keeping its own order.
 */
export const PACKAGE_MATERIALS: ComponentType[] = [
  ComponentType.QUERY_LETTER,
  ComponentType.SYNOPSIS,
  ComponentType.SAMPLE_PAGES,
];

/** Sentence case for reading; the enum's Title Case is a stored value, not a sentence. */
export const MATERIAL_LABEL: Record<ComponentType, string> = {
  [ComponentType.QUERY_LETTER]: "Query letter",
  [ComponentType.SYNOPSIS]: "Synopsis",
  [ComponentType.SAMPLE_PAGES]: "Sample pages",
  [ComponentType.FULL_MANUSCRIPT]: "Full manuscript",
};

export interface MaterialRow {
  label: string;
  /** `2 versions` / `1 version` / `2 packages`, or `null` when there are none. */
  count: string | null;
}

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/**
 * The four rows, in the ref's order. `count: null` is the `—` case and is the ONLY way absence is
 * expressed — no row is ever dropped, because a missing row states nothing while `—` states
 * "this slot is empty".
 */
export function materialsOnFile(
  versions: ManuscriptVersion[],
  packages: SubmissionPackage[],
): MaterialRow[] {
  const rows: MaterialRow[] = PACKAGE_MATERIALS.map((t) => {
    const n = versions.filter((v) => v.componentType === t).length;
    return { label: MATERIAL_LABEL[t], count: n ? plural(n, "version", "versions") : null };
  });
  rows.push({
    label: "Packages compiled",
    count: packages.length ? plural(packages.length, "package", "packages") : null,
  });
  return rows;
}
