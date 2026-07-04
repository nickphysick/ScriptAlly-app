/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared presentation metadata for the three material types the Package Builder surfaces (Query
 * Letter / Synopsis / Sample Pages). Full Manuscript is intentionally excluded — it stays in the data
 * model but has no shelf, slot or modal in this feature. Colours are theme tokens (index.css): the
 * `tint` is the type's tinted-band background, `ink` its stroke/label colour.
 */
import { ComponentType } from "../../types";

export interface TypeMeta {
  /** Singular label ("Query letter"). */
  label: string;
  /** Plural label for count rows ("Query letters"). */
  plural: string;
  /** Tinted-band background token. */
  tint: string;
  /** Type ink (glyph strokes / labels on white). */
  ink: string;
}

export const TYPE_META: Record<ComponentType, TypeMeta> = {
  [ComponentType.QUERY_LETTER]: { label: "Query letter", plural: "Query letters", tint: "var(--tl)", ink: "var(--burg)" },
  [ComponentType.SYNOPSIS]: { label: "Synopsis", plural: "Synopses", tint: "var(--ts)", ink: "var(--sage-d)" },
  [ComponentType.SAMPLE_PAGES]: { label: "Sample pages", plural: "Sample pages", tint: "var(--tp)", ink: "var(--gold)" },
  // Present for exhaustiveness only — the builder never renders it.
  [ComponentType.FULL_MANUSCRIPT]: { label: "Full manuscript", plural: "Full manuscripts", tint: "var(--band)", ink: "var(--ink)" },
};

/** The three types the builder surfaces, in canonical order. */
export const BUILDER_TYPES: ComponentType[] = [ComponentType.QUERY_LETTER, ComponentType.SYNOPSIS, ComponentType.SAMPLE_PAGES];

/** The slot field on SubmissionPackage that holds each type's version-id reference. */
export const SLOT_FIELD: Record<ComponentType, "queryLetterVersionId" | "synopsisVersionId" | "samplePagesVersionId"> = {
  [ComponentType.QUERY_LETTER]: "queryLetterVersionId",
  [ComponentType.SYNOPSIS]: "synopsisVersionId",
  [ComponentType.SAMPLE_PAGES]: "samplePagesVersionId",
  [ComponentType.FULL_MANUSCRIPT]: "queryLetterVersionId", // unused
};
