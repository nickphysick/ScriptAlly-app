/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages — the overview rail's registers and the how-it-works progress, derived.
 * Design authority: design-refs/submission-packages-restructure.html.
 *
 * ⚠️ EVERYTHING HERE IS DERIVED AT READ TIME AND NOTHING IS STORED (restructure D2). Empty versus
 * in-use is a count of the records that already exist; the infographic's three ticks are the same
 * counts plus a count of queries carrying a package. There is no `hasSeenOverview`, no stored step
 * and no progress field — a flag would be a second source of truth for something the data already
 * answers, and it would drift the first time a writer deleted their last package.
 *
 * ⚠️ THE COUNTING IS `packageMetrics`'s, NEVER A SECOND IMPLEMENTATION. `sent` and `replies` come
 * from `packageMetrics(pkgId, queries)` and requests from `materialUsage`, so the rail cannot
 * disagree with the analytics view it hands off to — which is the same rule the dashboard and the
 * To-do board had to be reconciled onto after they counted "urgent" two different ways.
 *
 * Pure: no Firestore, no clock of its own (`now` is injected), no React.
 */
import { ManuscriptVersion, SubmissionPackage, Query, ComponentType, RecordStatus } from "../types";
import { packageMetrics, isRequest, isSlotFilled, otherMaterialsText, packagesUsingVersion } from "./packageMetrics";
import { TYPE_META, BUILDER_TYPES, SLOT_FIELD } from "../components/packages/typeMeta";
import { SLOT_EYEBROW, PACKAGE_SLOTS } from "./packageAttach";
import { versionMeta } from "./packageMetrics";
import { agoLabel, daysBetween } from "./elapsed";
import { sourceLabel } from "./materialDraft";
import type { BookVersion } from "../types";
import { bookVersionOf } from "./bookVersions";

/* ══════════════════════════════════════════════════════════════════════════════
   MATERIALS
   ══════════════════════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════════════════════
   PACKAGES
   ══════════════════════════════════════════════════════════════════════════════ */

/**
 * ⚠️ ZERO IS A SENTENCE, NOT A COUNT, HERE. "Sent with 0 queries" is technically true and reads as
 * a malfunction; the row is prose about what has happened to the package, so absence is stated in
 * words. This is the same split the manuscript plate makes when two counts read `0` and the third
 * reads `—`: a true count prints, a non-event does not get a number.
 */
export const sentLine = (sent: number): string =>
  sent === 0 ? "Not sent yet" : `Sent with ${sent} quer${sent === 1 ? "y" : "ies"}`;

/* ══════════════════════════════════════════════════════════════════════════════
   TRACKING

   ⚠️ `TrackingRow` / `replyCount` / `trackingRows` ARE GONE (broadsheet §4), and they had been dead
   since the flow pack retired the Tracking RAIL PANEL they summarised — this commit only found
   them. `packageTracking.ts` is the live derivation for everything the tracking band reads. The
   distinction matters when reading the diff: `packageRows` and the materials register block were
   killed BY this pack, these two were already cold.
   ══════════════════════════════════════════════════════════════════════════════ */

/** Queries that carry a package at all — the "anything has gone out" test, and step 3's LIVE. */
export const packagedQueries = (packages: SubmissionPackage[], queries: Query[]): Query[] => {
  const ids = new Set(packages.map((p) => p.id));
  return queries.filter((q) => !!q.packageId && ids.has(q.packageId));
};

/* ══════════════════════════════════════════════════════════════════════════════
   HOW IT WORKS — the infographic doubles as progress (D3)
   ══════════════════════════════════════════════════════════════════════════════ */

export interface StepState {
  /** Sage tick + filled step number. */
  done: boolean;
  /** The pink LIVE treatment — step 3 only. */
  live: boolean;
  /** The chip's text, or null when the step has not been reached. */
  tick: string | null;
}

/**
 * The three steps' derived state.
 *
 * ⚠️ THE INPUTS ARE COUNTS THE CALLER ALREADY HAS, and they are the SAME counts the rail's chips
 * render. One derivation feeding both is what stops the infographic claiming "2 BUILT" beside a
 * register listing three — the reconciliation failure that had the dashboard and the board
 * disagreeing about the word "urgent".
 */
export function howItWorks(materialCount: number, packageCount: number, liveCount: number): [StepState, StepState, StepState] {
  return [
    { done: materialCount > 0, live: false, tick: materialCount > 0 ? `✓ ${materialCount} ADDED` : null },
    { done: packageCount > 0, live: false, tick: packageCount > 0 ? `✓ ${packageCount} BUILT` : null },
    { done: liveCount > 0, live: liveCount > 0, tick: liveCount > 0 ? "● LIVE" : null },
  ];
}

/* ══════════════════════════════════════════════════════════════════════════════
   THE WORKING STAGE — package tiles (flow pack D7)
   ══════════════════════════════════════════════════════════════════════════════ */

/**
 * ⚠️ A SLOT HAS THREE STATES, NOT TWO — and it read as two for the whole of the flow pack. `name`
 * alone cannot tell "the writer left this blank" apart from "the material this pointed at is gone":
 * both resolved to `null`, so a package that once carried a letter rendered identically to one that
 * never had one. `MISSING_SLOT` is what the archive model made findable — nothing else on this page
 * could delete a referenced material, so the state existed and could not be reached.
 *
 * `empty`   — the writer left the slot blank (the sentinel `""`).
 * `held`    — filled and resolvable; `name` is the material's.
 * `missing` — filled, and the material it names is not in the collection.
 */
export type SlotState = "empty" | "held" | "missing";

/** What a package says about a slot whose material is gone. Stated, never blank. */
export const MISSING_SLOT = "No longer available";

export interface TileSlot { label: string; name: string | null; state: SlotState }

/**
 * Resolve one slot against the FULL version list — retired materials included.
 *
 * ⚠️ THE FULL LIST, DELIBERATELY. Archiving a material must not turn every package holding it into a
 * package missing one; that is the difference between putting something away and destroying it, and
 * resolving against the band's Active-only set would erase it.
 */
export function resolveSlot(
  id: string | undefined,
  byId: Map<string, ManuscriptVersion>,
): { name: string | null; state: SlotState } {
  if (!isSlotFilled(id)) return { name: null, state: "empty" };
  const v = byId.get(id);
  if (!v || !v.versionName?.trim()) return { name: MISSING_SLOT, state: "missing" };
  return { name: v.versionName, state: "held" };
}

/**
 * Resolve the version slot against the manuscript's orderings.
 *
 * ⚠️ IT IS A SEPARATE RESOLVER, NOT `resolveSlot` WITH A DIFFERENT MAP, because its empty state
 * means something else. A material slot's `empty` is "left out"; this one's is "not recorded", and
 * D3 makes that permanent rather than transitional — a sent package is frozen and can never gain a
 * version, so a great many packages stay here for good.
 *
 * ⚠️ AND A VERSION THAT NO LONGER EXISTS IS `missing`, NOT `empty` — same reasoning as the material
 * slots. The package says it was testing an ordering; that the ordering has since been renamed out
 * of existence is a gap in the register, not evidence the writer never said.
 */
export function resolveVersionSlot(
  id: string | undefined,
  bookVersions: readonly BookVersion[],
): { name: string | null; state: SlotState } {
  if (!id) return { name: null, state: "empty" };
  const v = bookVersions.find((x) => x.id === id);
  return v ? { name: v.name, state: "held" } : { name: MISSING_SLOT, state: "missing" };
}

export interface PackageTile {
  id: string;
  name: string;
  /** Three rows, always — an empty slot says "Not included" rather than vanishing. */
  slots: TileSlot[];
  /**
   * ⚠️ THE FREE-TEXT LINE, AND IT IS `null` RATHER THAN A FOURTH `TileSlot` ON PURPOSE. Giving it a
   * `TileSlot` would put it in `slots`, and everything that walks `slots` would then treat prose as
   * a material. It is a different TYPE of thing, so it gets a different field, and the type system
   * carries the distinction instead of a convention nobody can see.
   *
   * ⚠️ AND IT OMITS ITSELF. Unlike the three slots, an absent Other renders NOTHING — no row, no
   * `Not included`. The three rows always render because "considered and left out" is a fact about
   * a package's shape; there is no equivalent fact about free text, and a permanent empty `Other`
   * row would make every package look unfinished.
   */
  other: string | null;
  sent: number;
  replies: number;
  requests: number;
}

/**
 * One tile per package, with its composition and its scorecard.
 *
 * ⚠️ ALL THREE SLOT ROWS ALWAYS RENDER, even when the sample is empty. A row that disappears states
 * nothing; `Not included` states that the slot was considered and left out — which is the same split
 * the Submission-packages pane already makes with its `—`, and what earns the tile the right to be
 * read as a complete description of what goes in the envelope.
 *
 * ⚠️ AND THE FIGURES ARE `packageMetrics`'s, NOT COUNTERS. The ref's mockup stores `sent`/`replies`
 * on the package because a mockup has nowhere else to put them; here they are derived from the
 * queries at read time (D1), so nothing can drift and deleting a query moves the tile.
 */
export function packageTiles(
  packages: SubmissionPackage[],
  versions: ManuscriptVersion[],
  queries: Query[],
  bookVersions: readonly BookVersion[] = [],
): PackageTile[] {
  const byId = new Map(versions.map((v) => [v.id, v]));
  return packages.map((p) => {
    const m = packageMetrics(p.id, queries);
    const mine = queries.filter((q) => q.packageId === p.id);
    return {
      id: p.id,
      name: p.packageName,
      /**
       * ⚠️ THE THREE SLOTS A PACKAGE ACTUALLY HAS — letter, synopsis, VERSION (D4/D12), taken from
       * `PACKAGE_SLOTS` rather than from `BUILDER_TYPES`. Those two agreed only while the third
       * slot was a material; the version has no `ComponentType` and no document, so mapping the
       * builder's type list would have silently produced a two-column ledger.
       *
       * ⚠️ AND `Not recorded` IS NOT `Not included`. An empty material slot is a stated choice —
       * the writer left the synopsis out. An empty version slot is an ABSENCE of a statement, and
       * it is permanent for every package already sent (D3), so it must not read as a decision.
       */
      slots: PACKAGE_SLOTS.map((sl) =>
        sl.kind === "material"
          ? { label: TYPE_META[sl.type].label, ...resolveSlot(p[sl.key], byId) }
          : { label: "Version", ...resolveVersionSlot(p.bookVersionId, bookVersions) }),
      /* ⚠️ NOT IN `slots`. See the field's note — prose is not a material. */
      other: otherMaterialsText(p),
      sent: m.sent,
      replies: m.responses,
      requests: mine.filter(isRequest).length,
    };
  });
}

/** The tile's footer, in the ref's words. Absence is a sentence; presence is three counts. */
export function tileFooter(t: PackageTile): { idle: string } | { out: string; replied: string; requests: string } {
  if (t.sent === 0) return { idle: "Not yet sent — attach it when you log a query" };
  return {
    out: `→ ${t.sent} sent`,
    replied: `← ${t.replies} replied`,
    requests: `${t.requests} ${t.requests === 1 ? "request" : "requests"}`,
  };
}

/* ══════════════════════════════════════════════════════════════════════════════
   THE MATERIALS BAND — three columns by type (broadsheet D3)
   ══════════════════════════════════════════════════════════════════════════════ */

export interface MaterialSheet {
  id: string;
  typeLabel: string;
  name: string;
  /** `Text · N words` / `Ref · file.docx` — the flow pack's source label. */
  source: string;
  /** `In N packages` / `Not in a package` — derived, never stored. */
  usage: string;
  /** How many packages reference it — the delete guard reads the same number. */
  usedIn: number;
  /**
   * The BOOK version these pages excerpt, as its name (D12) — absent on everything else.
   *
   * ⚠️ IT IS THE NAME, NOT THE ID, because the card renders a chip and nothing on this surface
   * resolves ids. Absent for three separate reasons that all mean "draw no chip": the material is
   * not sample pages, it carries no version, or the writer has fewer than two versions and sees
   * none of this feature at all. One field, one absence, no caller re-deriving the gate.
   */
  bookVersionName?: string;
}

export interface MaterialColumn {
  type: ComponentType;
  /** Plural heading: "Covering letters" / "Synopses" / "Sample pages". */
  heading: string;
  held: number;
  sheets: MaterialSheet[];
  /** The per-column ghost's wording, per the ref. */
  ghostLabel: string;
}

/** The ref's per-column ghost wording — its own phrasing per type, not a template. */
const GHOST_LABEL: Record<string, string> = {
  [ComponentType.QUERY_LETTER]: "Add a letter",
  [ComponentType.SYNOPSIS]: "Add a synopsis",
  };

/**
 * The three type columns.
 *
 * ⚠️ THE USAGE LINE AND THE DELETE GUARD READ THE SAME NUMBER. `usedIn` is what the sheet prints as
 * "In 2 packages" and what the guard uses to refuse the delete — one derivation, so the sheet can
 * never say a material is free while the guard says it is held.
 */
export function materialColumns(
  versions: ManuscriptVersion[],
  packages: SubmissionPackage[],
  /**
   * The manuscript's BOOK versions — see `BookVersion` in types.ts, which is NOT `ManuscriptVersion`
   * above. Optional so every existing caller is unchanged; a caller that passes nothing gets no
   * chips, which is the correct reading of "this surface knows nothing about versions".
   */
  bookVersions: readonly BookVersion[] = [],
): MaterialColumn[] {
  /* ⚠️ THE GATE IS READ ONCE, HERE. Below two versions the writer sees no chip anywhere, and every
     sheet below gets its `bookVersionName` from this one decision rather than re-testing it. */
  const showChips = bookVersions.length >= 2;
  return BUILDER_TYPES.map((type) => {
    const mine = versions
      /* ⚠️ ACTIVE ONLY HERE, AND THE FULL LIST EVERYWHERE A PACKAGE RESOLVES A SLOT. An archived
         material leaves the working list and stays readable by the packages that hold it — filter
         both against this same set and archiving becomes indistinguishable from deleting, which is
         the one thing it exists to avoid. */
      .filter((v) => v.componentType === type && !isRetired(v))
      .sort((a, b) => Date.parse(b.createdDate ?? "") - Date.parse(a.createdDate ?? ""));
    return {
      type,
      heading: TYPE_META[type].plural,
      held: mine.length,
      ghostLabel: GHOST_LABEL[type],
      sheets: mine.map((v) => {
        const used = packagesUsing(v.id, packages).length;
        return {
          id: v.id,
          typeLabel: TYPE_META[type].label,
          name: v.versionName,
          source: sourceLabel(v),
          usage: usageLine(used),
          usedIn: used,
          /* `bookVersionOf` enforces sample-pages-only, so a stray id on a letter draws nothing. */
          ...(showChips
            ? (() => {
                const bv = bookVersions.find((x) => x.id === bookVersionOf(v));
                return bv ? { bookVersionName: bv.name } : {};
              })()
            : {}),
        };
      }),
    };
  });
}

/**
 * Every package referencing this material, by any slot.
 *
 * ⚠️ THE MATCHING IS `packagesUsingVersion`'s, NOT A SECOND COPY OF IT. This function was first
 * written as its own `BUILDER_TYPES.some(...)` filter, which made two definitions of "does this
 * package reference this material" — one here driving the usage line a writer reads, one in
 * `packageMetrics` driving `componentMetrics`, `mostUsedVersionOfType` and `materialUsage`. They
 * agreed on every input the app can produce, which is exactly how that pair survives until the day
 * someone edits one of them.
 *
 * ⚠️ WHAT IS GENUINELY THIS FUNCTION'S OWN IS THE SENTINEL GUARD. An unfilled slot is `""`, so
 * `packagesUsingVersion("", …)` matches every package with an empty slot — correct for a raw
 * predicate, wrong for a question phrased "which packages hold THIS material". No caller can reach
 * it (`materialColumns` passes a Firestore document id), and the guard states the boundary rather
 * than relying on that staying true.
 */
/**
 * ══ THE SHELF (D-B2) — one row of paper, not three columns ═══════════════════════════════════
 *
 * ⚠️ AN EMPTY TYPE DOES NOT APPEAR AT ALL. The columns it replaces rendered a heading, a `0 held`
 * count and a ghost for every type the writer had not used — three statements of absence for
 * somebody who had simply not got there yet. A shelf shows what is on it.
 *
 * ⚠️ SORTED BY TYPE, THEN NEWEST FIRST INSIDE EACH. Type is the only grouping a writer reads the
 * shelf by ("where are my synopses"), and `BUILDER_TYPES` is the same order the builder offers the
 * slots in — so the shelf and the form cannot disagree about what comes first.
 *
 * ⚠️ AND IT REUSES `materialColumns`' SHEETS RATHER THAN RE-DERIVING THEM. `usedIn` is what the
 * sheet prints and what the delete guard reads; a second derivation here would let the shelf say a
 * material is free while the guard refuses to remove it.
 */
export function materialShelf(
  versions: ManuscriptVersion[],
  packages: SubmissionPackage[],
  bookVersions: readonly BookVersion[] = [],
): (MaterialSheet & { type: ComponentType })[] {
  return materialColumns(versions, packages, bookVersions)
    .filter((c) => c.sheets.length > 0)
    .flatMap((c) => c.sheets.map((sh) => ({ ...sh, type: c.type })));
}

/**
 * The card's one-line composition: `Hook-first · One-page · no sample`.
 *
 * ⚠️ AN OMITTED SLOT READS `no sample`, NOT `Not included`. On the card this is a sentence about
 * what the package sends, and the quiet lower-case clause belongs to the sentence; `Not included`
 * is a stated CHOICE and reads as a row in the builder's list, where it is right and here is not.
 *
 * ⚠️ AND `Other` IS NOT IN IT. The line lists saved materials; the free-text note is not one.
 */
export const NO_SLOT_WORD: Record<string, string> = {
  [ComponentType.QUERY_LETTER]: "no letter",
  [ComponentType.SYNOPSIS]: "no synopsis",
};

/**
 * ⚠️ `label` IS ADDITIVE, FOR THE BANDED CARD'S SLOT ROWS (D6). The card used to print these as one
 * comma sentence, where an omitted slot read as a quiet clause (`no sample`); as ROWS each line
 * needs its slot named, because a row with only a value cannot say which slot is empty.
 */
/** The version slot's empty word. NOT `Not included` — see `composition` for why they differ. */
export const UNRECORDED_SLOT = "Not recorded";

export interface CompositionPart { text: string; held: boolean; label: string }

export function composition(t: PackageTile): CompositionPart[] {
  return t.slots.map((sl, i) => {
    /* ⚠️ THE SAME REGISTER THE SLOTS CAME FROM. This read `BUILDER_TYPES[i]`, which agreed with
       the slot order only while the third slot was a material; against a three-slot tile it would
       have labelled the version with whatever the builder's third type happened to be. */
    const reg = PACKAGE_SLOTS[i];
    const label = reg?.kind === "material" ? (SLOT_EYEBROW[reg.type] ?? "") : "Version";
    /**
     * ⚠️ AS A ROW, AN OMITTED SLOT READS `Not included` — the ref's word, and the right one here.
     * The old `no sample` was correct in a SENTENCE about what the package sends; in a labelled row
     * the slot is already named, so the value states the choice rather than repeating the noun.
     *
     * ⚠️ EXCEPT ON THE VERSION, WHERE IT READS `Not recorded` (D3) — and the two are different
     * facts, not two wordings of one. `Not included` is a stated CHOICE: the writer left the
     * synopsis out. An empty version slot is the ABSENCE of a statement, and it is permanent for
     * every package already sent, because the rules freeze a sent package's slots. `Not included`
     * there would claim the writer built a package without a manuscript.
     */
    const emptyWord = reg?.kind === "version" ? UNRECORDED_SLOT : "Not included";
    return sl.state === "held" && sl.name
      ? { text: sl.name, held: true, label }
      : sl.state === "missing"
        ? { text: MISSING_SLOT, held: false, label }
        : { text: emptyWord, held: false, label };
  });
}

export const packagesUsing = (versionId: string, packages: SubmissionPackage[]): SubmissionPackage[] =>
  isSlotFilled(versionId) ? packagesUsingVersion(versionId, packages) : [];

/**
 * ⚠️ ZERO IS A SENTENCE HERE, NOT A COUNT. "In 0 packages" is true and reads as a malfunction; the
 * line is prose about where a material sits, so absence is stated in words — the same split the
 * package row makes with "Not sent yet".
 *
 * ⚠️ AND IT IS THE ONLY WORDING, WHICH IT BRIEFLY WAS NOT. The re-cut's one-line meta took the
 * ref's shorter "Not in a package" and rendered it INLINE in the band, leaving this function saying
 * "Not in a package yet" and nobody reading it: two sentences for one fact, differing by a word, on
 * a page whose whole claim is that its figures are single-sourced. The band reads this again; the
 * shorter wording won because the ref chose it and the meta line is tight.
 */
export const usageLine = (used: number): string =>
  used === 0 ? "Not in a package" : `In ${used} ${used === 1 ? "package" : "packages"}`;

/* ══════════════════════════════════════════════════════════════════════════════
   THE ARCHIVE MODEL (Ruling 2) — put away, or delete when nothing holds it
   ══════════════════════════════════════════════════════════════════════════════ */

/**
 * ⚠️ ABSENT MEANS ACTIVE, AND THIS IS THE ONE PLACE THAT DECIDES IT. Every material and every
 * package written before the field existed has no `status`; a `=== "Active"` test would read all
 * of them as retired and empty the page. One predicate, negated where the question is the other
 * way round, so the two readings cannot drift apart.
 */
export const isRetired = (r: { status?: RecordStatus }): boolean => r.status === "Retired";

/**
 * What removing this material means — and it is a fact about the data, never a preference.
 *
 * ⚠️ THIS REPLACES D9's BLOCKED DELETE, WHICH COULD NOT BE ENFORCED WHERE IT MATTERED. "Refuse to
 * delete a material while any package references it" is a predicate over a COLLECTION, and Firestore
 * rules have no query capability — only `get()`/`exists()` on a known path. The guard could therefore
 * only ever live in the client, which is not a guard: anything with the credentials could delete the
 * record and leave three packages pointing at nothing. Archiving is a single-document field update,
 * which rules CAN express, so the model moved to where it can actually be held.
 *
 * ⚠️ AND THE TWO OUTCOMES ARE NOT A CHOICE OFFERED TO THE WRITER. A material nothing uses is deleted,
 * because keeping it would be filing away something that was never filed. A material a package holds
 * is archived, because deleting it would quietly damage that package. Offering both would be asking
 * the writer to answer a question the data has already answered.
 */
export type RemovalKind = "delete" | "archive";

export interface RemovalChoice {
  kind: RemovalKind;
  /** How many things hold it — 0 for a delete, ≥1 for an archive. Same number the sheet prints. */
  usedIn: number;
  /** What holds it, by name, so the confirmation can say what it is protecting. */
  holderNames: string[];
}

/**
 * ⚠️ THE DECISION IS THE HOLDER COUNT AND NOTHING ELSE — which is what lets one function serve two
 * record types. A material's holders are the packages containing it; a package's holders are the
 * queries sent with it. Both questions are "does removing this damage something that points at it",
 * and answering them in one place is what stops a material archiving while a package deletes.
 */
export function removalChoice(holderNames: string[]): RemovalChoice {
  return {
    kind: holderNames.length === 0 ? "delete" : "archive",
    usedIn: holderNames.length,
    holderNames,
  };
}

/**
 * A material's holders — every package containing it, by name.
 *
 * ⚠️ RETIRED PACKAGES COUNT. One holding this material is still a record of what was sent, and
 * deleting the material out from under it would damage a package the writer archived rather than
 * discarded. The band hides retired packages; this question is not about the band.
 */
export const materialHolders = (versionId: string, packages: SubmissionPackage[]): string[] =>
  packagesUsing(versionId, packages).map((p) => p.packageName);

/**
 * A package's holders — every query sent with it, named by its agent where one resolves.
 *
 * ⚠️ A SENT PACKAGE IS THE RECORD OF WHAT WAS IN AN ENVELOPE, which is why it archives rather than
 * deletes. `Query.packageId` is a real reference and the analytics read through it; deleting the
 * package would leave every one of those queries pointing at nothing, and the writer would lose the
 * answer to "what did I actually send them" for correspondence already out in the world.
 *
 * ⚠️ AND AN UNRESOLVABLE AGENT IS OMITTED, NEVER NAMED "Unknown". The count is what decides the
 * branch, so a missing name costs nothing but a shorter sentence.
 */
export const packageHolders = (
  packageId: string,
  queries: Query[],
  agentName: (agentId: string) => string | null,
): string[] =>
  queries
    .filter((q) => q.packageId === packageId)
    .map((q) => agentName(q.agentId))
    .filter((n): n is string => !!n && n.trim().length > 0);
