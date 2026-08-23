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
  /**
   * ⚠️ WHICH VERSION WENT — and without it "the package has changed since" cannot be answered.
   *
   * A snapshot recording only the material NAMES can see a slot appear or disappear and cannot see
   * the synopsis swapped for a different synopsis, which is ref 177's own example of state 1. The
   * package stores version ids; the send has to store the one it copied, or the comparison is
   * between two lists of the same three words.
   *
   * ⚠️ OPTIONAL, AND ITS ABSENCE MEANS "CANNOT SAY" RATHER THAN "UNCHANGED". Sends attached before
   * this field existed carry no version ids, and `packageDrift` returns `unknown` for them — no
   * marker at all. A false "changed" is worse than no marker.
   */
  fromVersionId?: string;
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
  items.map((i) => ({
    material: i.material,
    fromPackageId: pkg.id,
    fromPackageName: pkg.packageName,
    fromVersionId: i.versionId,
  }));

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

/**
 * The Attach menu's REMOVAL rows — one per package the send currently carries.
 *
 * ⚠️ IT LIVES WHERE ATTACH LIVES, AND THAT IS THE WHOLE POINT OF PUTTING IT HERE. `attachPackage`
 * had no inverse on any surface: `detachPackage` was written, commented, and never mounted, because
 * its only caller — the origin tag — was retired and the reasoning recorded at the time was that
 * "each pill already carries its own ×". That is true and it is not the same act. Three separate
 * removals with three separate undos is not "remove this package", and nothing on the page said the
 * three items belonged to one decision the writer could take back in one move.
 *
 * ⚠️ ONE ROW PER PACKAGE, NAMED. `materialsWanted` is a flat list and a send may legitimately draw
 * on two templates, so a single "Remove package" row would have to guess which. The name comes from
 * the GROUP — i.e. from the mark stored on the items — so it still reads correctly after the
 * package itself has been deleted, which is the same reason the strip shows it.
 *
 * ⚠️ AND THE HINT STATES THE SCOPE RATHER THAN WARNING ABOUT IT. `3 ITEMS` is what will go; it is a
 * fact, and it is what lets the writer tell a mis-attached package from one they have since edited
 * down to a single sheet.
 */
export const detachRowLabel = (packageName: string) => `Remove ${packageName}`;

export function detachMenuRows(
  groups: readonly MaterialGroup[],
): { packageId: string; packageName: string; label: string; hint: string }[] {
  return groups.map((g) => ({
    packageId: g.packageId,
    packageName: g.packageName,
    label: detachRowLabel(g.packageName),
    hint: `${g.materials.length} ${g.materials.length === 1 ? "ITEM" : "ITEMS"}`,
  }));
}

/** What the toast says once the items are gone. States the deed and its scope; no verdict. */
export const detachToast = (n: number, packageName: string) =>
  `Removed ${n} ${n === 1 ? "item" : "items"} from ${packageName}`;

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

/* ── the three states (ref 177) ───────────────────────────────────────────────────────────── */

/**
 * Has the package moved on since this send took its copy?
 *
 * ⚠️ COMPARED BY IDENTITY, NOT BY VALUE — slot to VERSION ID. Comparing the material names would
 * see three words that had not changed while the synopsis behind one of them had been replaced,
 * which is ref 177's own example of state 1. Comparing the versions' CONTENT would be worse again:
 * editing a version's text in place is not a change to which materials the package holds, and a
 * send that went out with "QL v3" still went out with QL v3 after its wording was tweaked.
 *
 * ⚠️ ORDER IS NOT PART OF THE QUESTION, AND CANNOT BE. A `SubmissionPackage` has three NAMED slots —
 * query letter, synopsis, opening sample — so a package has no sequence to reorder. The comparison
 * is a slot→version map on both sides, order-free by construction; a reordered-but-identical
 * package is not a state this model can express, and if the shape ever grows a list, comparing maps
 * is still the right answer.
 *
 * ⚠️ AND `unknown` IS A REAL ANSWER THAT RENDERS NOTHING. A send attached before version ids were
 * stored cannot be compared, so it gets no marker rather than a guess. A false "changed" tells a
 * writer their record diverged from a template when it did not.
 */
export type PackageDrift = "none" | "changed" | "deleted" | "unknown";

export interface DriftResult {
  state: PackageDrift;
  /** The materials whose version differs, for the note line. Empty unless `changed`. */
  differing: string[];
}

export function packageDrift(
  group: MaterialGroup,
  live: SubmissionPackage | null | undefined,
  sent: readonly (string | QueryMaterial)[],
): DriftResult {
  if (!live) return { state: "deleted", differing: [] };

  /* the snapshot's own slot→version map, from the items this package brought */
  const snapshot = new Map<string, string>();
  let anyMissing = false;
  for (const m of sent) {
    const a = typeof m === "string" ? null : (m as AttachedMaterial);
    if (!a || a.fromPackageId !== group.packageId) continue;
    if (!a.fromVersionId) { anyMissing = true; continue; }
    snapshot.set(a.material, a.fromVersionId);
  }
  if (anyMissing || snapshot.size === 0) return { state: "unknown", differing: [] };

  const current = new Map<string, string>();
  for (const { key, type } of PACKAGE_SLOTS) {
    const id = live[key] as string;
    if (isSlotFilled(id)) current.set(type as string, id);
  }

  /**
   * ⚠️ ONLY THE SLOTS THIS SEND ACTUALLY TOOK ARE COMPARED. A writer who removed the synopsis pill
   * by hand has a send that no longer matches the package — but that is their own edit, not the
   * package moving on, and reporting it as "the package has changed" would blame the template for
   * something the writer did. State 1 is about the PACKAGE's movement.
   */
  const differing: string[] = [];
  for (const [material, versionId] of snapshot) {
    if (current.get(material) !== versionId) differing.push(material);
  }
  return differing.length ? { state: "changed", differing } : { state: "none", differing: [] };
}

/**
 * The note beneath a changed group's meta line.
 *
 * ⚠️ IT REPORTS AND REASSURES; IT NEVER PRESCRIBES. "This send keeps what actually went" is the
 * whole point of the state — nothing here suggests re-attaching, updating or fixing anything,
 * because there is nothing wrong: a send is a fact and a package is a template.
 */
export const driftNote = (differing: readonly string[]): string => {
  const names = differing.map((m) => MATERIAL_LABEL[m as ComponentType] ?? m).map((n) => n.toLowerCase());
  const list = names.length === 1 ? names[0]
    : names.length === 2 ? `${names[0]} and ${names[1]}`
    : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  return `The package now includes a different ${list}. This send keeps what actually went.`;
};

/** `As sent, 12 Aug` — the meta line's left half once a package has moved on. */
export const asSentLabel = (dateISO: string | undefined): string => {
  const t = dateISO ? new Date(dateISO).getTime() : NaN;
  return Number.isNaN(t) ? "As sent" : `As sent, ${new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
};

/* ── §3 · what a package was sent with (ref 177, right panel) ─────────────────────────────── */

/**
 * The sends that carry this package, derived from the queries themselves.
 *
 * ⚠️ NOTHING WRITES TO A PACKAGE WHEN A QUERY IS LOGGED, AND NOTHING HERE CHANGES THAT. This is a
 * READ over data the app already holds. A deleted query stops being counted the moment it is gone,
 * with no cleanup, no counter to decrement and no way for the figure to drift from the truth —
 * which is the whole reason it is derived rather than stored.
 *
 * ⚠️ THE COST, STATED. `queries` is already fully in memory: `DbProvider` holds an `onSnapshot` over
 * the whole collection, so this adds ZERO Firestore reads. It is a linear scan — every query, and
 * within each the items of `materialsWanted` (capped at 20 by the rules) — recomputed per render.
 * At a writer's scale that is a few hundred comparisons and not worth memoising; at ten thousand
 * queries it would be, and the fix then is a single pass building a Map of packageId → sends rather
 * than one pass per package.
 *
 * ⚠️ AND IT COUNTS THE SNAPSHOT'S MARKS, NOT `query.packageId`. Those are two different facts and
 * the difference is load-bearing: `packageId` is the app's older package LINK, which the snapshot
 * attach deliberately CLEARS (a query carries the link or its own materials, never both). A count
 * over the link would therefore report zero for every send made through the attach flow.
 * ⚠️ `packageMetrics` IN `packageMetrics.ts` STILL COUNTS THE LINK — reported, not changed, since
 * that module is the Packages page's own. The two answer different questions today and will
 * disagree about any snapshot-attached send.
 */
export interface PackageSend {
  queryId: string;
  agentId?: string;
  status: string;
  dateSent?: string;
}

export function sendsWithPackage(
  packageId: string,
  queries: readonly { id: string; agentId?: string; status: string; dateSent?: string; materialsWanted?: (string | QueryMaterial)[] }[],
): PackageSend[] {
  return queries
    .filter((q) => (q.materialsWanted ?? []).some((m) =>
      typeof m !== "string" && (m as AttachedMaterial).fromPackageId === packageId))
    .map((q) => ({ queryId: q.id, agentId: q.agentId, status: q.status, dateSent: q.dateSent }))
    /* newest first — the list is read for "what happened lately", and the full set is behind Show all */
    .sort((a, b) => (b.dateSent ?? "").localeCompare(a.dateSent ?? ""));
}

/** ⚠️ THE SHORT LIST IS THREE; the rest are behind `Show all`, which states the real total. */
export const TRACKING_PREVIEW = 3;

export const sentWithLine = (n: number): string =>
  `${n} ${n === 1 ? "query" : "queries"} sent with this package`;

/**
 * ⚠️ STATE 3, DERIVED RATHER THAN ASSUMED. The packages page already carried this sentence; what it
 * lacked was a fact behind it. It now appears when the derived count is zero and at no other time.
 */
export const NEVER_SENT_LINE = "Not yet sent — attach it when you log a query.";
