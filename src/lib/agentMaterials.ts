/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Agent "materials wanted" — the round-trip between the stored `string[]` and the structured editor
 * (pills + count inputs + an "Other" free-text) used by both the Add-Agent form and the v12 Edit
 * Agent drawer.
 *
 * STORAGE SHAPE: the agent stores `materialsWanted: string[]` of FORMATTED strings — "Query letter",
 * "Synopsis", "First 10 pages" / "Sample pages", "First 3 chapters" / "Chapters", "5,000 words" /
 * "Word count", plus any free-text "Other". `buildAgentMaterials` is the single canonical encoder
 * (lifted verbatim from the Add-Agent form's old inline `buildMaterials`); `parseAgentMaterials` is
 * its inverse.
 *
 * ★1 (Nick's call): a stored string matching none of the five structured patterns is "Other" by
 * definition — it loads into the Other free-text (multiple joined with " · ") so nothing is ever
 * dropped or corrupted. It round-trips back out as Other, editable. Re-save normalises formatting
 * (e.g. "5000 words" → "5,000 words"); content is preserved.
 */

/** Pill options, in display order. The three with a QTY reveal a count input. */
export const MAT_OPTS = ["Query letter", "Synopsis", "Pages", "Chapters", "Word count", "Other"] as const;
export type MatOpt = (typeof MAT_OPTS)[number];

/** Count config for the quantified pills — placeholder + inclusive validation range. */
export const MAT_QTY: Record<string, { unit: string; placeholder: string; min: number; max: number }> = {
  Pages: { unit: "pages", placeholder: "10", min: 1, max: 9999 },
  Chapters: { unit: "chapters", placeholder: "2", min: 1, max: 999 },
  "Word count": { unit: "words", placeholder: "5000", min: 1, max: 999999 },
};

/** Separator used when several unrecognised stored strings fold into the single Other field. */
export const OTHER_JOIN = " · ";

export interface AgentMaterialsState {
  /** Selected pills, a subset of MAT_OPTS (order not significant). */
  selected: string[];
  /** Digit strings for the quantified pills, keyed by pill ("Pages"/"Chapters"/"Word count"). */
  counts: Record<string, string>;
  /** Free text behind the "Other" pill. */
  otherText: string;
}

export const emptyMaterials = (): AgentMaterialsState => ({ selected: [], counts: {}, otherText: "" });

/**
 * Encode the structured state into the stored `string[]`. Canonical — keep byte-identical to the
 * Add-Agent form's historical output so the agent-database display (which reads these strings) and
 * the round-trip stay consistent. A quantified pill with a blank/invalid count emits its no-count
 * variant ("Sample pages" / "Chapters" / "Word count").
 */
export function buildAgentMaterials(s: AgentMaterialsState): string[] {
  const out: string[] = [];
  const has = (o: string) => s.selected.includes(o);
  if (has("Query letter")) out.push("Query letter");
  if (has("Synopsis")) out.push("Synopsis");
  if (has("Pages")) {
    const n = (s.counts["Pages"] || "").replace(/\D/g, "");
    out.push(n ? `First ${n} pages` : "Sample pages");
  }
  if (has("Chapters")) {
    const n = (s.counts["Chapters"] || "").replace(/\D/g, "");
    out.push(n ? `First ${n} chapters` : "Chapters");
  }
  if (has("Word count")) {
    const n = (s.counts["Word count"] || "").replace(/\D/g, "");
    out.push(n ? `${Number(n).toLocaleString("en-US")} words` : "Word count");
  }
  if (has("Other") && s.otherText.trim()) out.push(s.otherText.trim());
  return out;
}

/**
 * Decode the stored `string[]` back into structured state. Recognises the five structured patterns;
 * everything else folds into the Other free-text (joined), never dropped.
 */
export function parseAgentMaterials(stored: readonly string[] | undefined): AgentMaterialsState {
  const state = emptyMaterials();
  const others: string[] = [];
  const select = (o: string) => { if (!state.selected.includes(o)) state.selected.push(o); };

  for (const raw of stored ?? []) {
    const v = (raw ?? "").trim();
    if (v === "") continue;
    const lower = v.toLowerCase();

    if (lower === "query letter") { select("Query letter"); continue; }
    if (lower === "synopsis") { select("Synopsis"); continue; }

    let m: RegExpMatchArray | null;
    if ((m = v.match(/^first\s+(\d+)\s+pages$/i))) { select("Pages"); state.counts["Pages"] = m[1]; continue; }
    if (lower === "sample pages") { select("Pages"); continue; }
    if ((m = v.match(/^first\s+(\d+)\s+chapters$/i))) { select("Chapters"); state.counts["Chapters"] = m[1]; continue; }
    if (lower === "chapters") { select("Chapters"); continue; }
    if ((m = v.match(/^([\d,]+)\s+words$/i))) { select("Word count"); state.counts["Word count"] = m[1].replace(/,/g, ""); continue; }
    if (lower === "word count") { select("Word count"); continue; }

    others.push(v); // unrecognised → Other
  }

  if (others.length) { select("Other"); state.otherText = others.join(OTHER_JOIN); }
  return state;
}

/**
 * Per-pill count validation. Returns a Set of pills whose count is out of range (blank is allowed —
 * it just emits the no-count variant). A non-empty result blocks Save.
 */
export function materialsCountErrors(s: AgentMaterialsState): Set<string> {
  const bad = new Set<string>();
  for (const opt of Object.keys(MAT_QTY)) {
    if (!s.selected.includes(opt)) continue;
    const t = (s.counts[opt] || "").trim();
    if (t === "") continue;
    const q = MAT_QTY[opt];
    if (!/^\d+$/.test(t) || Number(t) < q.min || Number(t) > q.max) bad.add(opt);
  }
  return bad;
}
