/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Agent "materials wanted" — the round-trip between the stored `string[]` and the structured editor
 * (pills + count inputs + an "Other" free-text) used by the Add-Agent form, the v12 Edit Agent
 * drawer, AND (Stage 6d) the Contact list reading pane's Materials card.
 *
 * STORAGE SHAPE: the agent stores `materialsWanted: string[]` of FORMATTED strings — "Query letter",
 * "Author bio", "Synopsis" / "Synopsis (2 pages)", "First 10 pages" / "Sample pages", "First 3
 * chapters" / "Sample chapters", "5,000 words" / "Sample words", "Full manuscript", plus any
 * free-text "Other". `buildAgentMaterials` is the single canonical encoder; `parseAgentMaterials` is
 * its inverse. We deliberately keep the string[] storage (no migration, no consumer cascade): every
 * reader in the app already treats these as display strings.
 *
 * 6d VOCABULARY EVOLUTION (Nick, Option 1 — evolve the one model, don't fork): the pill set gained
 * "Author bio" and "Full manuscript" (both binary), "Synopsis" became optionally page-quantified, and
 * "Pages"/"Chapters"/"Word count" were renamed "Sample pages"/"Sample chapters"/"Sample words".
 * Legacy stored strings ("Chapters" / "Word count" no-count spellings, "First N pages", "N words",
 * the old binary "Synopsis") still PARSE — read-time tolerant, never dropped — so no backfill is
 * needed.
 *
 * ★componentType map (`materialComponentType`): reuses the Package Builder's `ComponentType` enum
 * where a member exists, so a future package↔requirement matcher can align without a re-model.
 * KNOWN GAPS (reported, deliberately NOT forked — `packageMetrics` is untouched):
 *   • "Author bio" has NO `ComponentType` member — it maps to nothing (undefined in the map).
 *   • "Sample pages", "Sample chapters" and "Sample words" ALL collapse to `SAMPLE_PAGES` —
 *     they are differentiated only by unit, which the enum does not carry. A matcher would need the
 *     structured {componentType, quantity, unit} shape to tell them apart; the map makes that a later
 *     refactor, not a blocker.
 *   • "Other" is free text — no member.
 *
 * ★1 (Nick's call): a stored string matching none of the structured patterns is "Other" by
 * definition — it loads into the Other free-text (multiple joined with " · ") so nothing is ever
 * dropped or corrupted. It round-trips back out as Other, editable.
 */

import { ComponentType } from "../types";

/** Pill options, in display order. The four in MAT_QTY reveal a count input. */
export const MAT_OPTS = [
  "Query letter",
  "Author bio",
  "Synopsis",
  "Sample pages",
  "Sample chapters",
  "Sample words",
  "Full manuscript",
  "Other",
] as const;
export type MatOpt = (typeof MAT_OPTS)[number];

/** Count config for the quantified pills — unit + placeholder + inclusive validation range. */
export const MAT_QTY: Record<string, { unit: string; placeholder: string; min: number; max: number }> = {
  "Synopsis": { unit: "pages", placeholder: "2", min: 1, max: 20 },
  "Sample pages": { unit: "pages", placeholder: "10", min: 1, max: 9999 },
  "Sample chapters": { unit: "chapters", placeholder: "3", min: 1, max: 999 },
  "Sample words": { unit: "words", placeholder: "5000", min: 1, max: 999999 },
};

/**
 * The Package Builder `ComponentType` a wanted-material aligns to, where a member exists. Absent keys
 * ("Author bio", "Other") have no member — that is the reported gap, not an omission. Sample
 * pages/chapters/words intentionally share `SAMPLE_PAGES` (unit is the only difference; see header).
 */
export const materialComponentType: Partial<Record<MatOpt, ComponentType>> = {
  "Query letter": ComponentType.QUERY_LETTER,
  "Synopsis": ComponentType.SYNOPSIS,
  "Sample pages": ComponentType.SAMPLE_PAGES,
  "Sample chapters": ComponentType.SAMPLE_PAGES,
  "Sample words": ComponentType.SAMPLE_PAGES,
  "Full manuscript": ComponentType.FULL_MANUSCRIPT,
};

/** Separator used when several unrecognised stored strings fold into the single Other field. */
export const OTHER_JOIN = " · ";

export interface AgentMaterialsState {
  /** Selected pills, a subset of MAT_OPTS (order not significant). */
  selected: string[];
  /** Digit strings for the quantified pills, keyed by pill ("Synopsis"/"Sample pages"/…). */
  counts: Record<string, string>;
  /** Free text behind the "Other" pill. */
  otherText: string;
}

export const emptyMaterials = (): AgentMaterialsState => ({ selected: [], counts: {}, otherText: "" });

/**
 * Encode the structured state into the stored `string[]`, in MAT_OPTS display order. A quantified pill
 * with a blank/invalid count emits its no-count variant ("Synopsis" / "Sample pages" / "Sample
 * chapters" / "Sample words").
 */
export function buildAgentMaterials(s: AgentMaterialsState): string[] {
  const out: string[] = [];
  const has = (o: string) => s.selected.includes(o);
  const digits = (o: string) => (s.counts[o] || "").replace(/\D/g, "");

  if (has("Query letter")) out.push("Query letter");
  if (has("Author bio")) out.push("Author bio");
  if (has("Synopsis")) {
    const n = digits("Synopsis");
    out.push(n ? `Synopsis (${n} pages)` : "Synopsis");
  }
  if (has("Sample pages")) {
    const n = digits("Sample pages");
    out.push(n ? `First ${n} pages` : "Sample pages");
  }
  if (has("Sample chapters")) {
    const n = digits("Sample chapters");
    out.push(n ? `First ${n} chapters` : "Sample chapters");
  }
  if (has("Sample words")) {
    const n = digits("Sample words");
    out.push(n ? `${Number(n).toLocaleString("en-US")} words` : "Sample words");
  }
  if (has("Full manuscript")) out.push("Full manuscript");
  if (has("Other") && s.otherText.trim()) out.push(s.otherText.trim());
  return out;
}

/**
 * Decode the stored `string[]` back into structured state. Recognises the structured patterns (incl.
 * the legacy "Chapters" / "Word count" no-count spellings and the old "Synopsis" binary); everything
 * else folds into the Other free-text (joined), never dropped.
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
    if (lower === "author bio") { select("Author bio"); continue; }
    if (lower === "full manuscript") { select("Full manuscript"); continue; }

    let m: RegExpMatchArray | null;
    if ((m = v.match(/^synopsis\s*\(\s*(\d+)\s*pages?\s*\)$/i))) { select("Synopsis"); state.counts["Synopsis"] = m[1]; continue; }
    if (lower === "synopsis") { select("Synopsis"); continue; }
    if ((m = v.match(/^first\s+(\d+)\s+pages$/i))) { select("Sample pages"); state.counts["Sample pages"] = m[1]; continue; }
    if (lower === "sample pages") { select("Sample pages"); continue; }
    if ((m = v.match(/^first\s+(\d+)\s+chapters$/i))) { select("Sample chapters"); state.counts["Sample chapters"] = m[1]; continue; }
    if (lower === "sample chapters" || lower === "chapters") { select("Sample chapters"); continue; }
    if ((m = v.match(/^([\d,]+)\s+words$/i))) { select("Sample words"); state.counts["Sample words"] = m[1].replace(/,/g, ""); continue; }
    if (lower === "sample words" || lower === "word count") { select("Sample words"); continue; }

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

/* ══════════════════════════════════════════════════════════════════════════════
   AGENT LIST — the four-row document editor (decisions 11–12, as ruled)
   ──────────────────────────────────────────────────────────────────────────────
   The Materials tab has EXACTLY four rows: Query letter · Synopsis · Opening
   sample · Other. "Author bio" and "Full manuscript" were deliberately dropped in
   favour of Other, so this editor never renders them AND STRIPS them on every
   commit — legacy flags decay on the agent's next edit rather than lurking.

   Storage is unchanged: the canonical `string[]` via buildAgentMaterials /
   parseAgentMaterials above. No new shape is introduced.

   Unit physics (decision 11) drive the stepper — per-unit step, floor and default,
   and switching unit SNAPS to that unit's default rather than fake-converting.
   MAT_QTY remains the storage-level range, so the stepper clamps to its maxima too.
   ══════════════════════════════════════════════════════════════════════════════ */

export type SampleUnit = "Chapters" | "Pages" | "Words";
export const SAMPLE_UNITS: readonly SampleUnit[] = ["Chapters", "Pages", "Words"];

/** The MAT_OPTS pill each sample unit stores as. */
export const SAMPLE_PILL: Record<SampleUnit, string> = {
  Chapters: "Sample chapters",
  Pages: "Sample pages",
  Words: "Sample words",
};

/** Decision 11's physics. `max` comes from MAT_QTY so the stepper and storage agree. */
export const UNIT_CFG: Record<SampleUnit, { step: number; min: number; def: number; max: number }> = {
  Chapters: { step: 1, min: 1, def: 3, max: MAT_QTY["Sample chapters"].max },
  Pages: { step: 5, min: 1, def: 10, max: MAT_QTY["Sample pages"].max },
  Words: { step: 500, min: 500, def: 5000, max: MAT_QTY["Sample words"].max },
};

/** Pills this editor deliberately drops on write (see the header). */
export const STRIPPED_PILLS = ["Author bio", "Full manuscript"] as const;

export const formatAmount = (n: number | string): string => {
  const v = typeof n === "number" ? n : parseInt(String(n).replace(/,/g, ""), 10);
  return Number.isNaN(v) ? "" : v.toLocaleString("en-GB");
};
export const parseAmount = (raw: string): number => parseInt(String(raw ?? "").replace(/,/g, ""), 10);

export type MaterialRow =
  | { key: "queryLetter"; kind: "binary"; name: string; on: boolean }
  /** Synopsis is BINARY here, but preserves any stored page count for display. */
  | { key: "synopsis"; kind: "binary"; name: string; on: boolean; pages: string }
  | { key: "sample"; kind: "qty"; name: string; on: boolean; unit: SampleUnit; amount: string }
  | { key: "other"; kind: "text"; name: string; on: boolean; text: string };

export const MATERIAL_ROW_NAMES = {
  queryLetter: "Query letter",
  synopsis: "Synopsis",
  sample: "Opening sample",
  other: "Other",
} as const;

/**
 * Stored materials → editor rows. Several sample units can be selected on legacy data, so ONE
 * quantity row is emitted per selected unit rather than collapsing them (decision 12).
 */
export function materialRowsFromAgent(materialsWanted: readonly string[] | undefined): MaterialRow[] {
  const s = parseAgentMaterials(materialsWanted);
  const has = (o: string) => s.selected.includes(o);

  const rows: MaterialRow[] = [
    { key: "queryLetter", kind: "binary", name: MATERIAL_ROW_NAMES.queryLetter, on: has("Query letter") },
    { key: "synopsis", kind: "binary", name: MATERIAL_ROW_NAMES.synopsis, on: has("Synopsis"), pages: s.counts["Synopsis"] || "" },
  ];

  const units = SAMPLE_UNITS.filter((u) => has(SAMPLE_PILL[u]));
  if (units.length) {
    for (const u of units) {
      rows.push({ key: "sample", kind: "qty", name: MATERIAL_ROW_NAMES.sample, on: true, unit: u, amount: s.counts[SAMPLE_PILL[u]] || "" });
    }
  } else {
    rows.push({ key: "sample", kind: "qty", name: MATERIAL_ROW_NAMES.sample, on: false, unit: "Chapters", amount: "" });
  }

  rows.push({ key: "other", kind: "text", name: MATERIAL_ROW_NAMES.other, on: has("Other"), text: s.otherText });
  return rows;
}

/**
 * Editor rows → the canonical `string[]`. Author bio and Full manuscript are NOT re-emitted, so a
 * legacy agent sheds them on its next Materials commit. An unticked Synopsis drops its page count.
 */
export function materialsWantedFromRows(rows: MaterialRow[]): string[] {
  const state = emptyMaterials();
  for (const r of rows) {
    if (r.key === "queryLetter" && r.on) state.selected.push("Query letter");
    else if (r.key === "synopsis" && r.on) {
      state.selected.push("Synopsis");
      if (r.pages.trim()) state.counts["Synopsis"] = r.pages.trim();
    } else if (r.key === "sample" && r.on) {
      const pill = SAMPLE_PILL[r.unit];
      state.selected.push(pill);
      const n = parseAmount(r.amount);
      if (!Number.isNaN(n)) state.counts[pill] = String(n);
    } else if (r.key === "other" && r.on && r.text.trim()) {
      state.selected.push("Other");
      state.otherText = r.text.trim();
    }
  }
  // belt and braces: the two dropped pills can never survive a commit
  state.selected = state.selected.filter((p) => !STRIPPED_PILLS.includes(p as (typeof STRIPPED_PILLS)[number]));
  return buildAgentMaterials(state);
}

/** Switching unit snaps to that unit's default — never a fake conversion. */
export const snapToUnit = (unit: SampleUnit): string => String(UNIT_CFG[unit].def);

/** Stepper arithmetic: floored by decision 11, capped by MAT_QTY. */
export function stepAmount(raw: string, unit: SampleUnit, direction: 1 | -1): string {
  const cfg = UNIT_CFG[unit];
  const current = parseAmount(raw);
  const base = Number.isNaN(current) ? cfg.def : current;
  return String(Math.min(cfg.max, Math.max(cfg.min, base + direction * cfg.step)));
}

/** The card-face summary. The Other row reads as its own words — never an "Other —" prefix. */
export function summaryFromRows(rows: MaterialRow[]): string | null {
  const parts: string[] = [];
  for (const r of rows) {
    if (!r.on) continue;
    if (r.kind === "qty") {
      const amt = r.amount ? formatAmount(r.amount) : "";
      parts.push(amt ? `${r.name} (${amt} ${r.unit.toLowerCase()})` : r.name);
    } else if (r.kind === "text") {
      if (r.text.trim()) parts.push(r.text.trim());
    } else if (r.key === "synopsis" && r.pages.trim()) {
      parts.push(`${r.name} · ${formatAmount(r.pages)} pages`);
    } else parts.push(r.name);
  }
  return parts.length ? parts.join("  ·  ") : null;
}

/** Materials validation for Done: a selected sample needs an amount at/above its NAMED floor. */
export function validateMaterials(rows: MaterialRow[]): { msg: string } | null {
  for (const r of rows) {
    if (r.kind === "qty" && r.on) {
      const cfg = UNIT_CFG[r.unit];
      const n = parseAmount(r.amount);
      if (!String(r.amount).trim() || Number.isNaN(n) || n < cfg.min) {
        const floor = cfg.min > 1 ? ` (at least ${formatAmount(cfg.min)} ${r.unit.toLowerCase()})` : "";
        return { msg: `Enter how much of the opening sample they ask for${floor}.` };
      }
    }
    if (r.kind === "text" && r.on && !r.text.trim()) {
      return { msg: "Explain what 'Other' materials are requested." };
    }
  }
  return null;
}
