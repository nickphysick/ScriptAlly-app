/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The material modal's pure half — naming, word counting, source labels, and the exact write
 * payloads. Design authority: design-refs/submission-packages-flow.html.
 *
 * ⚠️ NO FIREBASE IMPORT, AND THAT IS WHY THE UNSETS ARE A LIST OF NAMES. `deleteField()` is a
 * Firestore sentinel; importing it here would drag the SDK into a module whose whole value is being
 * testable without one. `updatePayload` returns `{ set, unset }` and the component turns `unset`
 * into `deleteField()` at the call site — so the decision about what to clear is unit-locked, and
 * only the mechanical mapping lives in the component.
 *
 * ⚠️ AND ABSENT KEYS ARE OMITTED, NEVER SET TO `undefined`. `addVersion` spreads its argument
 * straight into `setDoc`, and Firestore rejects `undefined` inside a map — a `wordCount: undefined`
 * would fail the whole write rather than being ignored.
 */
import { ComponentType, ManuscriptVersion } from "../types";
import { TYPE_META, BUILDER_TYPES } from "../components/packages/typeMeta";

/** The three content modes of D2's segmented control. */
export type MatMode = "paste" | "file" | "ref";

/**
 * ⚠️ `ref` IS NOT `link`. The stored `contentType` gains `ref` for NAME ONLY; `link` survives
 * untouched for the URL records that already use it. A material that was stored as `link` reads back
 * as `ref` in the editor — the closest live mode — but nothing rewrites it unless the writer saves.
 */
export const MODE_TO_CONTENT_TYPE: Record<MatMode, "text" | "file" | "ref"> = {
  paste: "text",
  file: "file",
  ref: "ref",
};

export function modeOf(v: Pick<ManuscriptVersion, "contentType" | "fileAttached">): MatMode {
  if (v.contentType === "file" || (v.fileAttached && !v.contentType)) return "file";
  if (v.contentType === "ref" || v.contentType === "link") return "ref";
  return "paste";
}

/* ══════════════════════════════════════════════════════════════════════════════
   NAMING
   ══════════════════════════════════════════════════════════════════════════════ */

/** The ref's suggestion ladder, per type. */
export const TYPE_DEFAULTS: Record<string, string[]> = {
  [ComponentType.QUERY_LETTER]: ["Hook-first", "Comps-forward", "Voice-led"],
  [ComponentType.SYNOPSIS]: ["One-page", "Two-page"],
  [ComponentType.SAMPLE_PAGES]: ["Chapters 1–3", "First fifty pages"],
};

/** The ref's per-type sub-line under the content field. */
export const CONTENT_SUB: Record<string, string> = {
  [ComponentType.QUERY_LETTER]: "Your pitch — hook, comps, bio.",
  [ComponentType.SYNOPSIS]: "The whole story, ending included.",
  [ComponentType.SAMPLE_PAGES]: "Word count is taken from what you paste.",
};

/**
 * The first unused suggestion for this type, else a numbered fallback.
 *
 * ⚠️ IT COUNTS THE TYPE'S OWN MATERIALS, not all of them — "Synopsis 3" beside two synopses is right;
 * beside two letters it would be a number out of nowhere.
 */
export function suggestName(type: ComponentType, existing: ManuscriptVersion[]): string {
  const used = existing.filter((v) => v.componentType === type).map((v) => v.versionName);
  const ladder = TYPE_DEFAULTS[type] ?? [];
  const free = ladder.find((n) => !used.includes(n));
  return free ?? `${TYPE_META[type].label} ${used.length + 1}`;
}

/* ══════════════════════════════════════════════════════════════════════════════
   WORD COUNT
   ══════════════════════════════════════════════════════════════════════════════ */

/** The ref's count: non-empty whitespace-separated runs. */
export const countWords = (text: string): number =>
  text.trim().split(/\s+/).filter(Boolean).length;

/* ══════════════════════════════════════════════════════════════════════════════
   THE REGISTER'S SOURCE LABEL
   ══════════════════════════════════════════════════════════════════════════════ */

/**
 * The register's detail line, verbatim per the ref's `sourceLabel`.
 *
 * ⚠️ THIS SUPERSEDES THE RESTRUCTURE'S "added N ago" LINE. That line existed because the register
 * had nothing else true to say; the flow pack gives each material a real source, which is both more
 * useful and more honest — it describes what the record IS rather than when it arrived.
 *
 * ⚠️ `wordCount` IS PREFERRED, BUT A LEGACY RECORD FALLS BACK TO COUNTING ITS DRAFT. Materials
 * written before Phase 1 have no stored count, and showing a bare "Text" for them would look like a
 * material with no content rather than one whose count predates the field.
 */
/**
 * `412 words` / `1 word`, or **null where nothing is known** (D1/D2).
 *
 * ⚠️ ZERO IS A CLAIM ABOUT THE TEXT; ABSENCE IS THE TRUTH. A material with no recorded length has
 * not been measured at nought words — nobody has counted it. `0 words` states something false about
 * every `ref` material and every unpasted draft, and this is the same family as an unsent package's
 * scorecard reading three noughts: a figure rendered where nothing is known.
 *
 * ⚠️ AND IT IS EXPORTED BECAUSE THE PACKAGE DRAWER WROTE A SECOND, WORSE COPY. `sourceLabel` below
 * had the plural and the zero-guard right from the start; the drawer's band interpolated
 * `${wordCount} words` and rendered "1 WORDS" and "0 WORDS". The fix is not to patch the copy — it
 * is that there is one phrase now and both callers read it.
 */
export const wordsPhrase = (v: Pick<ManuscriptVersion, "wordCount" | "contentDraft" | "contentType" | "fileName" | "contentLink">): string | null => {
  const words = v.wordCount ?? (v.contentDraft ? countWords(v.contentDraft) : 0);
  return words > 0 ? `${words.toLocaleString("en-GB")} ${words === 1 ? "word" : "words"}` : null;
};

export function sourceLabel(v: ManuscriptVersion): string {
  const mode = modeOf(v);
  if (mode === "file") return `${v.fileName ?? "document"} · attached`;
  if (mode === "ref") return `Ref · ${v.fileName ?? v.contentLink ?? "untitled"}`;
  const w = wordsPhrase(v);
  return w ? `Text · ${w}` : "Text";
}

/* ══════════════════════════════════════════════════════════════════════════════
   WRITE PAYLOADS
   ══════════════════════════════════════════════════════════════════════════════ */

export interface DraftInput {
  type: ComponentType;
  name: string;
  mode: MatMode;
  /** The pasted body — only read in `paste` mode. */
  text: string;
  /** The filename the writer typed — only read in `ref` mode. */
  refName: string;
  /** Which BOOK version a sample excerpts; `""` means none. Ignored on any other type. */
  bookVersionId?: string;
}

/** What `addVersion` is handed. Absent keys are OMITTED, never undefined. */
export function createPayload(d: DraftInput, manuscriptId: string): Record<string, unknown> {
  const base: Record<string, unknown> = {
    manuscriptId,
    componentType: d.type,
    versionName: d.name.trim() || TYPE_META[d.type].label,
    fileAttached: false,
    contentType: MODE_TO_CONTENT_TYPE[d.mode],
  };
  if (d.mode === "paste") {
    base.contentDraft = d.text;
    const w = countWords(d.text);
    /* zero words is a real answer for an empty paste, and storing it says "counted, none" — which
       is different from a ref material, where the key is absent because nothing was counted */
    base.wordCount = w;
  } else if (d.mode === "ref") {
    base.fileName = d.refName.trim() || "untitled.docx";
  }
  /* ⚠️ OMITTED WHEN EMPTY, NEVER STORED AS `""`. Absent means "not recorded", and a stored empty
     string would be a second way of saying the same thing — the convention every optional field on
     this record already follows. The MODAL sends `""` for none; the store never sees it. */
  if (d.bookVersionId) base.bookVersionId = d.bookVersionId;
  return base;
}

/**
 * What `updateVersion` is handed, split so the caller can map `unset` to `deleteField()`.
 *
 * ⚠️ A MODE SWITCH MUST CLEAR THE OTHER MODE'S FIELDS OR THE RECORD LIES. Turning a pasted material
 * into a name-only one leaves the old body and its count behind, and the register would go on
 * reporting "Text · 412 words" about a material whose content is now a filename. Every mode names
 * what it owns and what it clears, rather than only writing its own half.
 */
export function updatePayload(d: DraftInput): { set: Record<string, unknown>; unset: string[] } {
  const set: Record<string, unknown> = {
    versionName: d.name.trim() || TYPE_META[d.type].label,
    contentType: MODE_TO_CONTENT_TYPE[d.mode],
  };
  const unset: string[] = [];

  /* ⚠️ CLEARING IT IS A REAL ANSWER, so an emptied field UNSETS rather than being left alone. "I
     picked the wrong version" has to be correctable, and a write that silently skipped the empty
     case would leave the old reference in place while the form showed none. */
  if (d.bookVersionId) set.bookVersionId = d.bookVersionId;
  else unset.push("bookVersionId");

  if (d.mode === "paste") {
    set.contentDraft = d.text;
    set.wordCount = countWords(d.text);
    unset.push("fileName");
  } else if (d.mode === "ref") {
    set.fileName = d.refName.trim() || "untitled.docx";
    unset.push("contentDraft", "wordCount");
  } else {
    /* file mode is not reachable from the UI (D2 ships it disabled) — handled for completeness so a
       legacy file material can be renamed without its filename being cleared out from under it */
    unset.push("contentDraft", "wordCount");
  }
  return { set, unset };
}

/** Materials of one type, in the order the register lists them. */
export const ofType = (versions: ManuscriptVersion[], type: ComponentType): ManuscriptVersion[] =>
  versions.filter((v) => v.componentType === type);

/**
 * D4's gate: a package needs at least one covering letter AND one synopsis. The sample is optional.
 *
 * ⚠️ IT IS A DERIVATION, NOT A STORED FLAG — delete your last synopsis and the gate closes again,
 * with nothing to clear.
 */
export const canBuildPackage = (versions: ManuscriptVersion[]): boolean =>
  ofType(versions, ComponentType.QUERY_LETTER).length > 0 &&
  ofType(versions, ComponentType.SYNOPSIS).length > 0;

/** The three types the modal offers, with their held counts — the type step's tiles. */
export const typeTiles = (versions: ManuscriptVersion[]) =>
  BUILDER_TYPES.map((t) => ({
    type: t,
    label: TYPE_META[t].label,
    held: ofType(versions, t).length,
  }));
