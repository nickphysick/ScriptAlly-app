/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Material icons v1 — which of the six material drawings an ITEM takes (design-refs/material-icons-v1).
 *
 * ⚠️ CALL THIS WITH A MATERIAL ITEM, NEVER WITH LABEL TEXT. A manuscript's word count ("50,000 words")
 * and a synopsis length ("2 pages") are not materials, and they read exactly like one. The mock found
 * its icons by matching text because it is a mock; the app decides from the stored item, through the
 * readers that already own it:
 *   - `materialToken` (lib/materials) for the token, matched case-insensitively — the corpus holds both
 *     "Query letter" and "Query Letter";
 *   - `parseAgentMaterials` (lib/agentMaterials) for the agent-side strings, which is where "Synopsis
 *     (2 pages)", "First 5 chapters", "5,000 words" and the legacy "Chapters" are recognised;
 *   - `isSampleItem` / `sampleOfItem` (lib/sentSample) for the query-side samples, legacy and structured,
 *     where the UNIT picks pages, chapters or words.
 *
 * Full manuscript → null (it keeps its own mark wherever it has one). Free text under Other → null.
 * A sample with no unit → "pages".
 */
import type { QueryMaterial } from "../types";
import { materialToken } from "./materials";
import { parseAgentMaterials, type MatOpt } from "./agentMaterials";
import { isSampleItem, sampleOfItem, SAMPLE_MATERIAL } from "./sentSample";
import type { StepMaterial } from "./qc152Write";

export type MaterialIconKind = "letter" | "synopsis" | "pages" | "chapters" | "words" | "bio";

/** The agent-side pill → its drawing. Full manuscript and Other are absent on purpose: no icon. */
const PILL_ICON: Partial<Record<MatOpt, MaterialIconKind>> = {
  "Query letter": "letter",
  "Author bio": "bio",
  "Synopsis": "synopsis",
  "Sample pages": "pages",
  "Sample chapters": "chapters",
  "Sample words": "words",
};

/** One stored string → its agent-side pill, or null for free text. `parseAgentMaterials` folds anything it
 *  does not recognise into Other, so a single-item parse selects exactly one pill or "Other". */
function pillOf(token: string): MatOpt | null {
  const sel = parseAgentMaterials([token]).selected[0] as MatOpt | undefined;
  return sel && sel !== "Other" ? sel : null;
}

export function materialIconKind(item: string | QueryMaterial): MaterialIconKind | null {
  if (item == null) return null;
  const token = materialToken(item);
  if (typeof token !== "string" || token.trim() === "") return null;

  /* the token first: a structured synopsis can carry `type: "pages"` (its length), and it is still a synopsis */
  const pill = pillOf(token);
  if (pill === "Full manuscript") return null;
  if (pill === "Query letter" || pill === "Author bio" || pill === "Synopsis") return PILL_ICON[pill]!;

  if (typeof item !== "string") {
    if (item.type === "other") return null; // the structured free text
    if (item.type === "pages" || item.type === "chapters" || item.type === "words") return item.type;
  }
  if (pill) return PILL_ICON[pill] ?? null; // "First 5 chapters", "5,000 words", "Sample pages", legacy "Chapters"

  /* the query-side legacy samples the agent parser does not know ("Sample Pages", "Sample chapters: 3") */
  if (isSampleItem(item)) {
    const s = sampleOfItem(item);
    if (s && (s.unit === "pages" || s.unit === "chapters" || s.unit === "words")) return s.unit;
    /* no amount stated: a sample only when it SAYS sample — otherwise this is someone's free text that
       happens to contain "pages" */
    if (/sample/i.test(token)) return "pages";
  }
  return null;
}

/**
 * Material icons v1 — the drawing a step's stored material takes, read off the map as `matLabel` reads it: the kind,
 * and for a sample its unit (matLabel's default unit is chapters, so the icon agrees with the words). Full manuscript
 * keeps its own mark ("full"); "something else" is free text and takes none.
 */
export function stepMaterialIcon(m: Pick<StepMaterial, "kind" | "unit"> | null | undefined): MaterialIconKind | "full" | null {
  switch (m?.kind) {
    case "letter": return "letter";
    case "synopsis": return "synopsis";
    case "sample": return materialIconKind({ material: SAMPLE_MATERIAL, type: m.unit ?? "chapters" });
    case "full": return "full";
    case "other": return null;
    case undefined: return null;
    default: { const unhandled: never = m.kind; return unhandled; }
  }
}
