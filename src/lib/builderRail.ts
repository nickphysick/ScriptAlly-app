/**
 * ⚠️ THE BUILDER'S RAIL (Part C) — three sections of chips, derived, never stored.
 *
 * Reference: `design-refs/builder-refined.html`, `.rail` / `.rsec` / `.chip`.
 *
 * ⚠️ IT REUSES `materialShelf` RATHER THAN RE-DERIVING WHAT A MATERIAL IS. The shelf already
 * computes a material's name, its `Text · 412 words` / `Ref · file.docx` source label and how many
 * packages hold it — and the DELETE GUARD reads the same `usedIn`. A second derivation here would
 * let the rail say a material is unused while the guard refuses to remove it.
 *
 * ⚠️ A VERSION IS NOT A DOCUMENT, AND ITS CHIP MUST NOT CLAIM ONE (D9). Letters and synopses have a
 * source and a word count because a writer wrote them; a version is an ordering of the book, with
 * no text of its own. Its meta states its HOLDINGS instead — how many packages test it and how many
 * agents are holding one of those sends — which is the only thing a version can honestly report.
 */
import { Activity, BookVersion, ComponentType, ManuscriptVersion, Query, SubmissionPackage } from "../types";
import { materialShelf } from "./packagesOverview";
import { holdings, latestVersion, NOT_IN_A_PACKAGE } from "./bookVersions";

export type RailKind = "let" | "syn" | "ver";

export interface RailChip {
  id: string;
  kind: RailKind;
  name: string;
  /** The mono line under the name. */
  meta: string;
  /** True when nothing holds it — draws the quiet `Not used` tag (D10). */
  unused: boolean;
}

export interface RailSection {
  kind: RailKind;
  heading: string;
  chips: RailChip[];
  /** The section's own line, or null. Only Versions has one (D11). */
  note: string | null;
}

/** ⚠️ ONE PLACE. The heading, the tint class and the `＋ Add` all key off this order. */
export const RAIL_KINDS: readonly RailKind[] = ["let", "syn", "ver"];

export const RAIL_HEADING: Record<RailKind, string> = {
  let: "Covering letters",
  syn: "Synopses",
  ver: "Versions",
};

/**
 * ⚠️ THE VERSIONS SECTION SAYS WHERE VERSIONS LIVE, because `＋ Add` there does something the other
 * two do not: it writes to the MANUSCRIPT. A writer who adds one here and later finds it on the
 * book profile should have been told, not surprised.
 */
/**
 * What an empty section invites (D4).
 *
 * ⚠️ THE REF GIVES THE TREATMENT AND NOT THE WORDS. `.radd` is styled in `builder-refined.html`
 * — dashed, centred, italic Playfair in burgundy — and rendered ZERO times, because every section
 * in its fixture has chips. So the shape is the ref's and the sentence is a decision (F-BO).
 *
 * ⚠️ AND EACH SECTION NAMES ITS OWN NOUN. One shared "Add your first" would make the reader look up
 * to the heading to find out what they are being offered, in the one state where the section has
 * nothing else in it to say.
 */
export const RAIL_EMPTY: Record<RailKind, string> = {
  let: "Add your first covering letter",
  syn: "Add your first synopsis",
  ver: "Add your first version",
};

export const VERSIONS_NOTE =
  "Versions belong to the manuscript. Adding one here writes it there too.";

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

/**
 * A version's meta line.
 *
 * ⚠️ AN UNUSED VERSION STATES ITS ABSENCE IN WORDS, NEVER AS `0 packages · held by 0 agents`. Two
 * true zeros side by side read as a malfunction, and the standing law is that an unknown or an
 * absence is never rendered as a zero. The ref writes `Latest · not yet in a package`.
 *
 * ⚠️ `Latest` ONLY WHEN IT IS TRUE. The ref's one unused version happens to be the newest, so the
 * artefact cannot say what a non-latest unused version reads — this states the fact where it holds
 * and drops the clause where it does not, rather than inventing a label for every unused version.
 */
export const versionMetaLine = (
  packages: number,
  agents: number,
  isLatest: boolean,
): string =>
  packages > 0
    ? `${plural(packages, "package")} · held by ${plural(agents, "agent")}`
    /* ⚠️ THE SAME CONSTANT THE PANEL READS. Two surfaces describing one state in two spellings is
       how they come to disagree; `bookVersions.ts` states it once. */
    : `${isLatest ? "Latest · " : ""}${NOT_IN_A_PACKAGE}`;

export const builderRail = (
  materials: readonly ManuscriptVersion[],
  packages: readonly SubmissionPackage[],
  bookVersions: readonly BookVersion[],
  queries: readonly Query[],
  activities: readonly Activity[],
): RailSection[] => {
  const sheets = materialShelf([...materials], [...packages], bookVersions);
  const held = holdings(queries, activities);
  const newest = latestVersion(bookVersions);

  const ofType = (t: ComponentType, kind: RailKind): RailChip[] =>
    sheets.filter((s) => s.type === t).map((s) => ({
      id: s.id,
      kind,
      /* ⚠️ THE SHELF'S OWN SOURCE LABEL, plus `in N` — the ref's `Text · 412 words · in 2`. The
         count clause is omitted at zero rather than reading `in 0`: the `Not used` tag states that
         fact once, and stating it twice in two vocabularies is how the two come to disagree. */
      name: s.name,
      meta: s.usedIn > 0 ? `${s.source} · in ${s.usedIn}` : s.source,
      unused: s.usedIn === 0,
    }));

  const verChips: RailChip[] = bookVersions.map((v) => {
    const pkgIds = new Set(packages.filter((p) => p.bookVersionId === v.id).map((p) => p.id));
    /* ⚠️ AGENTS, NOT SENDS — a query counted once however many times it went out. */
    const agents = new Set(
      held.filter((h) => h.versionId === v.id && !!h.query.agentId).map((h) => h.query.agentId),
    );
    return {
      id: v.id,
      kind: "ver" as const,
      name: v.name,
      meta: versionMetaLine(pkgIds.size, agents.size, newest?.id === v.id),
      unused: pkgIds.size === 0,
    };
  });

  return [
    { kind: "let", heading: RAIL_HEADING.let, chips: ofType(ComponentType.QUERY_LETTER, "let"), note: null },
    { kind: "syn", heading: RAIL_HEADING.syn, chips: ofType(ComponentType.SYNOPSIS, "syn"), note: null },
    { kind: "ver", heading: RAIL_HEADING.ver, chips: verChips, note: VERSIONS_NOTE },
  ];
};
