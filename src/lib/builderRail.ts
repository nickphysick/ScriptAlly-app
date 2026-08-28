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
import { fileKind, wordsPhrase } from "./materialDraft";
import { holdings, latestVersion, NOT_IN_A_PACKAGE_USE } from "./bookVersions";

export type RailKind = "let" | "syn" | "ver";

/**
 * The source line's glyph — a page for pasted text, nothing otherwise.
 *
 * ⚠️ THE PAPERCLIP IS RETIRED WITH THE FILENAME IT SAT BESIDE (D3). The foot now reads `Attached
 * file`; the filename and its document glyph moved into the description band, where the plate shows
 * them once. A clip in the foot beside a plate above it would be the same fact drawn twice.
 */
export type CardIcon = "page" | null;

/**
 * ⚠️ `file` IS NOT AN EMPTY DESCRIPTION — IT IS A DIFFERENT ONE (D2). Where a material is an
 * attached file with nothing pasted, the band holds a document plate: the filename and, when the
 * name says what kind of document it is, that kind beneath it. The space stops looking empty
 * because it stopped being asked the wrong question.
 *
 * ⚠️ `nonote` IS A VERSION'S ORDINARY STATE, NOT ITS EXCEPTION (D4) — five of the eight cards on
 * the fixture. A version has no body and no file, so it has genuinely nothing to show, and the one
 * honest thing it can do with the band is say so in words.
 */
export type CardBody =
  | { kind: "text"; text: string }
  | { kind: "file"; fileName: string; fileKind: string | null }
  | { kind: "none" }
  /**
   * ⚠️ A VERSION'S BAND CARRIES ITS OWN METADATA, AND THAT IS WHY THE VERSIONS FEATURE EXISTS.
   * `held by N agents` is the fact the whole thing is for — which ordering of the book is actually
   * out there, in whose hands — and the two-register foot has no slot for it. The foot's grammar
   * governs the FOOT; the description area is the version's own, and a third muted line there
   * wraps nothing.
   *
   * ⚠️ `holdings` IS NULL AT ZERO, never `0 packages · held by 0 agents`. The foot already states
   * that absence once, in words, as `Not in a package`.
   */
  | { kind: "version"; note: string | null; holdings: string | null };

export interface RailChip {
  id: string;
  kind: RailKind;
  name: string;
  /**
   * What the description band holds. FOUR states, and the band is reserved in all of them (D6).
   *
   * ⚠️ IT IS A UNION BECAUSE THE BAND HAS FOUR ANSWERS AND A STRING CAN CARRY ONE. The earlier
   * shape was `desc: string | null` plus a `descNone` flag, which could express "text", "nothing
   * written" and "blank" — and the blank was the fault: an attachment rendered an empty band that
   * read as a line which had failed to load. A file is not an absence, it is a different KIND of
   * content, and a type that cannot say so is the type this repo's own rule says to widen.
   *
   * ⚠️ AND THERE IS NO DESCRIPTION FIELD ON A MATERIAL (R4). `text` here is `contentDraft`, the
   * body itself, clamped by CSS; a version's is its `note`, which is a real description because a
   * version has no body to show.
   */
  body: CardBody;
  /**
   * The foot's LEFT: what this material IS — `412 words` · `Attached file` · `Latest` (D7).
   *
   * ⚠️ NULL WHERE THERE IS NOTHING TRUE TO PUT THERE, never a filler. `Empty` used to sit here and
   * was a STATE masquerading as a source; the card with neither text nor file now says so in the
   * description band, where the state belongs, and leaves this slot alone.
   */
  src: string | null;
  srcIcon: CardIcon;
  /**
   * The foot's RIGHT: where it is USED — `In 2` · `In 1` · `Not in a package` (D8).
   *
   * ⚠️ ONE REGISTER PER SLOT IS THE WHOLE POINT. A usage phrase in the source slot is what made
   * `Latest · not yet in a package` one string, and that card was the only one on the page that
   * wrapped. Always present: a version or a material in nothing states it here rather than leaving
   * the reader to infer it from a gap.
   */
  use: string;
  /** True when nothing holds it. Read by callers; the card no longer draws a tag for it. */
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
 * A version's holdings — `2 packages · held by 4 agents` — or null when it is in nothing.
 *
 * ⚠️ IT LIVES IN THE DESCRIPTION BAND, NOT THE FOOT (F-BR). `versionMetaLine` used to build it for
 * the foot's left slot, where it read `Latest · not yet in a package` as one string and made that
 * card the only one on the page that wrapped. Splitting the foot into two registers left this
 * figure with nowhere to go and it briefly went nowhere at all — which took the most valuable thing
 * a version card says off the page. The band is where it belongs: a version's own metadata, under
 * its own note.
 *
 * ⚠️ AND THE VERBS AGREE AT ONE. `1 package · held by 1 agent`.
 */
export const holdingsLine = (packages: number, agents: number): string | null =>
  packages > 0 ? `${plural(packages, "package")} · held by ${plural(agents, "agent")}` : null;

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

  const byId = new Map(materials.map((m) => [m.id, m]));

  const ofType = (t: ComponentType, kind: RailKind): RailChip[] =>
    sheets.filter((s) => s.type === t).map((s) => {
      const m = byId.get(s.id);
      const body = m?.contentDraft?.trim() ?? "";
      const words = m ? wordsPhrase(m) : null;
      const file = m?.fileName?.trim() ?? "";
      /**
       * ⚠️ THREE SOURCE STATES, AND ONLY ONE OF THEM SPEAKS IN THE DESCRIPTION (D5, and Nick's
       * ruling on R4). Pasted text shows its own opening lines and a word count. An attachment
       * shows its filename and NOTHING above it — the source has already said what there is, and a
       * sentence would be the app narrating an absence twice. Neither reads `Empty` in the foot and
       * `Nothing written yet` above, because that card genuinely has nothing and the writer needs
       * to know it is empty rather than broken.
       */
      const hasBody = body.length > 0;
      return {
        id: s.id,
        kind,
        name: s.name,
        body: hasBody
          ? { kind: "text" as const, text: body }
          : file
            ? { kind: "file" as const, fileName: file, fileKind: fileKind(file) }
            : { kind: "none" as const },
        /* ⚠️ `Attached file`, NOT THE FILENAME (D3). The plate above already shows the name; the
           foot states what kind of thing this is, in the same register as `412 words`. One fact,
           one place — and it is what stops the longest filename on the fixture setting the width
           of a slot that has a neighbour. */
        src: hasBody ? (words ?? "Text") : file ? "Attached file" : null,
        srcIcon: (hasBody ? "page" : null) as CardIcon,
        use: s.usedIn > 0 ? `In ${s.usedIn}` : NOT_IN_A_PACKAGE_USE,
        unused: s.usedIn === 0,
      };
    });

  const verChips: RailChip[] = bookVersions.map((v) => {
    const pkgIds = new Set(packages.filter((p) => p.bookVersionId === v.id).map((p) => p.id));
    /* ⚠️ AGENTS, NOT SENDS — a query counted once however many times it went out. */
    const agents = new Set(
      held.filter((h) => h.versionId === v.id && !!h.query.agentId).map((h) => h.query.agentId),
    );
    /**
     * ⚠️ A VERSION SAYS `No note on this version` RATHER THAN NOTHING (D4), and this is the case
     * the whole pack turns on: a note-less version is the ORDINARY state — five of the eight cards
     * on the fixture — so the band's blank was not an edge case a reader would meet rarely, it was
     * what the Versions section mostly looked like.
     *
     * ⚠️ AND ITS SOURCE SLOT IS `Latest` OR NOTHING — never a word count (D8), because a version is
     * a shape of the book rather than a document, and never a holdings sentence, because holdings
     * are usage and usage is the other slot's business.
     */
    const note = v.note?.trim() ?? "";
    return {
      id: v.id,
      kind: "ver" as const,
      name: v.name,
      body: { kind: "version" as const, note: note || null, holdings: holdingsLine(pkgIds.size, agents.size) },
      src: newest?.id === v.id ? "Latest" : null,
      srcIcon: null as CardIcon,
      use: pkgIds.size > 0 ? `In ${pkgIds.size}` : NOT_IN_A_PACKAGE_USE,
      unused: pkgIds.size === 0,
    };
  });

  return [
    { kind: "let", heading: RAIL_HEADING.let, chips: ofType(ComponentType.QUERY_LETTER, "let"), note: null },
    { kind: "syn", heading: RAIL_HEADING.syn, chips: ofType(ComponentType.SYNOPSIS, "syn"), note: null },
    { kind: "ver", heading: RAIL_HEADING.ver, chips: verChips, note: VERSIONS_NOTE },
  ];
};
