/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ ATTACHING A SUBMISSION PACKAGE TO A SEND (ref 173-package-attach.html) ═══════════════════
 *
 * ⚠️ AN ATTACH IS A SNAPSHOT, NOT A REFERENCE, AND THAT IS THE WHOLE DESIGN. `materialsWanted` on a
 * query records WHAT WENT to a named person on a named day. A package is a working document the
 * writer keeps revising — so a live link would mean editing "UK standard" next month silently
 * rewrote what you sent last month. The items are copied as they are today and never look back.
 *
 * ⚠️ WHICH IS WHY THIS DOES NOT SET `packageId`. That field is the app's existing package LINK, and
 * `materialsLinkWrites` (packageMetrics.ts) already states the invariant it belongs to: a query
 * carries the package link OR its own materials, never both, and writing one clears the other.
 * A snapshot is the second kind, so it goes in the materials and leaves the link empty. Setting
 * both would give one send two answers to "what did you send", which is the exact divergence that
 * rule exists to prevent.
 *
 * ⚠️ PACKAGES CARRY NO SIZE, SO NOTHING HERE INVENTS ONE. `SubmissionPackage` stores three VERSION
 * IDS; a `ManuscriptVersion` has a `componentType`, a `versionName` and its content — there is no
 * quantity and no unit anywhere in that chain. The ref draws "First 3 chapters"; the data cannot
 * say that, so an attached opening sample lands as `Opening sample` and the writer sizes it
 * afterwards with the pill editor that already exists. A quantity conjured here would be a number
 * the record does not hold, printed as if it did.
 */
import { ComponentType, type ManuscriptVersion, type QueryMaterial, type SubmissionPackage, type User } from "../types";
import { isSlotFilled } from "./packageMetrics";
import { MATERIAL_LABEL } from "./manuscriptPackages";
import { isProUser } from "./suggestComps";

/**
 * ⚠️ THE PROVENANCE LIVES ON THE ITEMS, NOT IN A FIELD BESIDE THEM. A separate stored list of
 * "what the package brought" is a second record of the same fact, and the two drift the first time
 * a writer removes one pill by hand. Marking each item means the tag's count, its name and the
 * undo's target are all DERIVED from the materials themselves and cannot disagree with them.
 *
 * ⚠️ IT NEEDS NO RULES CHANGE: `materialsWanted` is validated as a list of at most 20, and the shape
 * inside each map is client-enforced (firestore.rules:363 and the query allowlist). Extra keys ride
 * through untouched, and every existing reader routes items through `formatQueryMaterial`, which
 * reads `material`/`type`/`quantity` and ignores the rest.
 *
 * ⚠️ DECLARED HERE RATHER THAN ON `QueryMaterial` ONLY BECAUSE `src/types.ts` IS HELD BY ANOTHER
 * STREAM THIS RUN. Its honest home is beside the interface it extends; move it there when that file
 * is free. Structural typing means an `AttachedMaterial` is a `QueryMaterial` wherever one is
 * wanted, so nothing downstream needs to know about it.
 */
export interface AttachedMaterial extends QueryMaterial {
  /** The package this item was copied from. A snapshot's receipt, never a live link. */
  fromPackageId?: string;
  /** Its name AS IT WAS at attach time — renaming the package must not rewrite this send's tag. */
  fromPackageName?: string;
}

/** The canonical order a package's slots are read in — the order the picker and the pills use. */
export const PACKAGE_SLOTS: { key: keyof SubmissionPackage; type: ComponentType }[] = [
  { key: "queryLetterVersionId", type: ComponentType.QUERY_LETTER },
  { key: "synopsisVersionId", type: ComponentType.SYNOPSIS },
  { key: "samplePagesVersionId", type: ComponentType.SAMPLE_PAGES },
];

export interface PackageItem {
  type: ComponentType;
  /** The canonical material name — what lands in `materialsWanted.material`. */
  material: string;
  /** What the picker shows: `Opening sample`, and the version's own name when it has one. */
  label: string;
  versionId: string;
  versionName?: string;
}

/**
 * A package's filled slots, resolved through the versions store.
 *
 * ⚠️ AN UNFILLED SLOT IS `""` AND IS SKIPPED — the sentinel the package model already uses
 * (`isSlotFilled`), not a truthiness test, because the three keys are always PRESENT on the
 * document and only their emptiness distinguishes them.
 *
 * ⚠️ A SLOT POINTING AT A MISSING VERSION IS STILL AN ITEM. The package says it carries a synopsis;
 * that the version document has since been deleted is a gap in the register, not evidence the
 * writer sent nothing. It lands with its type name and no version name.
 */
export function packageItems(pkg: SubmissionPackage, versions: readonly ManuscriptVersion[]): PackageItem[] {
  return PACKAGE_SLOTS.flatMap(({ key, type }) => {
    const id = pkg[key] as string;
    if (!isSlotFilled(id)) return [];
    const v = versions.find((x) => x.id === id);
    return [{
      type,
      material: type as string,
      label: MATERIAL_LABEL[type],
      versionId: id,
      versionName: v?.versionName,
    }];
  });
}

/** The canonical name of one already-attached material, however it is stored. */
export const materialName = (m: string | QueryMaterial): string =>
  typeof m === "string" ? m : m.material;

/**
 * ⚠️ AN OVERLAP IS DECLARED, NEVER RESOLVED FOR THE WRITER (ref card: "Covering letter is already
 * attached — the package's query letter will sit beside it"). Silently replacing loses something
 * they chose; silently skipping loses something the package promised. Both are decisions this
 * module has no standing to make, so it reports and the picker prints it.
 */
export function overlaps(items: readonly PackageItem[], existing: readonly (string | QueryMaterial)[]): PackageItem[] {
  const have = new Set(existing.map((m) => materialName(m).toLowerCase()));
  return items.filter((i) => have.has(i.material.toLowerCase()));
}

export const overlapNote = (i: PackageItem): string =>
  `${i.label} is already attached — the package's copy will sit beside it.`;

/** The items as they land in `materialsWanted` — copied, marked, and never linked. */
export const attachedMaterials = (pkg: SubmissionPackage, items: readonly PackageItem[]): AttachedMaterial[] =>
  items.map((i) => ({ material: i.material, fromPackageId: pkg.id, fromPackageName: pkg.packageName }));

/**
 * The origin tag beneath the pills — `3 items from UK standard`.
 *
 * ⚠️ DERIVED FROM THE MATERIALS, so removing a pill by hand makes the tag say 2, and removing the
 * last one makes it disappear. A stored count would keep claiming 3 over two pills.
 *
 * ⚠️ AND THE NAME COMES FROM THE ITEMS TOO, not from the package's document. The tag states what
 * this send was built from at the time; looking the name up live would rewrite the receipt when the
 * package is renamed, which is the same fault as a live link, one field along.
 */
export interface OriginTag { packageId: string; packageName: string; count: number }

export function originTags(materials: readonly (string | QueryMaterial)[]): OriginTag[] {
  const by = new Map<string, OriginTag>();
  for (const m of materials) {
    if (typeof m === "string") continue;
    const a = m as AttachedMaterial;
    if (!a.fromPackageId) continue;
    const t = by.get(a.fromPackageId);
    if (t) t.count += 1;
    else by.set(a.fromPackageId, { packageId: a.fromPackageId, packageName: a.fromPackageName || "a package", count: 1 });
  }
  return [...by.values()];
}

export const originTagText = (t: OriginTag): string =>
  `${t.count} ${t.count === 1 ? "item" : "items"} from ${t.packageName}`;

/**
 * ⚠️ THE UNDO REMOVES WHAT THIS PACKAGE BROUGHT AND NOTHING ELSE — matched on the mark, not on the
 * material name. A writer who attached a package and then added their own synopsis by hand keeps
 * that synopsis; a name-based removal would take it, because it cannot tell the two apart.
 */
export const withoutPackage = (
  materials: readonly (string | QueryMaterial)[],
  packageId: string,
): (string | QueryMaterial)[] =>
  materials.filter((m) => typeof m === "string" || (m as AttachedMaterial).fromPackageId !== packageId);

/** Packages offered for a query — this manuscript's, retired ones excluded. */
export const attachablePackages = (
  packages: readonly SubmissionPackage[],
  manuscriptId: string | undefined,
): SubmissionPackage[] =>
  packages.filter((p) => p.manuscriptId === manuscriptId && p.status !== "Retired");

/* ── the gate (§3) ────────────────────────────────────────────────────────────────────────── */

/**
 * ⚠️ WIRED, AND OPEN. Package-attach is a Pro feature; beta grants everyone Pro, so it ships
 * AVAILABLE — but through a predicate rather than ungated, because the difference between "no gate"
 * and "a gate that currently passes" is a whole feature's worth of work on the day billing arrives.
 * One place, one name, so the check can never be scattered across the call sites that need it.
 *
 * ⚠️ IT TAKES THE USER TODAY THOUGH IT DOES NOT READ THEM, and that is deliberate: when this becomes
 * `isProUser(user)` the signature does not change, so no call site is touched and no call site can
 * be missed. `isProUser` is imported rather than re-implemented — it is the app's ONE Pro predicate
 * (`suggestComps.ts`), the same field the Scout and assist-fill read.
 *
 * ⚠️ AND NOTHING SELLS ANYTHING. No upsell copy, no PRO badge, no meter — the free plan shows no
 * ceilings here. When the gate closes, what it does is HIDE the row; deciding how to offer the
 * upgrade is that day's design question, not a string left waiting in this file.
 */
export { isProUser };

export function canAttachPackages(_user: Pick<User, "plan"> | null | undefined): boolean {
  /* becomes `isProUser(_user)` when billing arrives — see above. */
  return true;
}

/**
 * The Attach menu's package row, as data.
 *
 * ⚠️ THE ROW IS BUILT HERE SO THE GATE IS TESTABLE WITHOUT RENDERING THE PAGE. Asked to prove that
 * flipping the predicate hides the row, the alternative is mounting a 6,000-line component and
 * reading its markup — which tests the renderer, not the rule. This returns the row or nothing, and
 * the page spreads it.
 *
 * ⚠️ IT SITS BELOW A DIVIDER AND IS NOT A FIFTH MATERIAL TYPE. The four types above are things you
 * attach ONE of; this fills the row above wholesale. Same menu, different kind of act, so the rule
 * is what says so.
 */
export interface AttachMenuRow { divider: true }
export const PACKAGE_ROW_LABEL = "Attach a submission package";

export function packageMenuRow(
  canAttach: boolean,
  packageCount: number,
): { label: string; hint?: string }[] {
  /* ⚠️ NO ROW WITH NOWHERE TO GO. A manuscript with no packages would open a picker stating that it
     is empty — a control that can only disappoint. The Packages page is reachable from the rail. */
  if (!canAttach || packageCount < 1) return [];
  return [{ label: PACKAGE_ROW_LABEL, hint: `${packageCount}` }];
}

/* ── the group in the send (ref 177, left panel) ──────────────────────────────────────────── */

/**
 * ⚠️ THE GROUP IS PRESENTATION OVER STORED ORIGIN, NEVER A CONTAINER IN THE DATA. `materialsWanted`
 * stays one flat list; this reads the marks each item already carries and says which of them were
 * drawn from the same template. That is why removing a pill cannot "break" the package: there is no
 * container to break, and the send simply stops matching the template — which is state 1.
 *
 * ⚠️ FIRST-APPEARANCE ORDER, so a send that drew on two packages lists them in the order they were
 * attached rather than in whatever order a map happens to iterate.
 */
export interface MaterialGroup {
  packageId: string;
  /** The name AS STORED on the items — it outlives the package's deletion, which is the point. */
  packageName: string;
  /** The canonical material names this package brought to the send. */
  materials: string[];
}

export function groupByOrigin(
  materials: readonly (string | QueryMaterial)[],
): { groups: MaterialGroup[]; loose: string[] } {
  const groups: MaterialGroup[] = [];
  const byId = new Map<string, MaterialGroup>();
  const loose: string[] = [];
  for (const m of materials) {
    const a = typeof m === "string" ? null : (m as AttachedMaterial);
    if (!a?.fromPackageId) { loose.push(materialName(m)); continue; }
    let g = byId.get(a.fromPackageId);
    if (!g) {
      g = { packageId: a.fromPackageId, packageName: a.fromPackageName || "a package", materials: [] };
      byId.set(a.fromPackageId, g);
      groups.push(g);
    }
    g.materials.push(a.material);
  }
  return { groups, loose };
}

/** ⚠️ ONE MARK FOR ALL PACKAGES, not one per package — a package is not a brand. */
export const PACKAGE_MARK_SLOT = "package-mark" as const;
