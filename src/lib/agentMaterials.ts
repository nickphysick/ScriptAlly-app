/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Agent "materials wanted" — the round-trip between the stored `string[]` and the structured editor
 * (pills + count inputs + an "Other" free-text) used by the Add-Agent form, the v12 Edit Agent
 * drawer, AND (Stage 6d) the Contact List reading pane's Materials card.
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
import { materialLabel } from "./materials";

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
    const c = classifyMaterial(v);
    if (c.pill === null) { others.push(v); continue; } // unrecognised → Other
    select(c.pill);
    if (c.count) state.counts[c.pill] = c.count;
  }

  if (others.length) { select("Other"); state.otherText = others.join(OTHER_JOIN); }
  return state;
}

/**
 * ══ THE ONE CLASSIFIER ═══════════════════════════════════════════════════════════════════════
 *
 * What a single stored material IS. Extracted from `parseAgentMaterials`, which is where these
 * patterns have always lived — so this is one set of rules with two callers rather than a third
 * copy. The array parser above reads it per item; the Query Centre reads it through
 * `classifyQueryMaterial` below.
 *
 * ⚠️ IT EXISTS BECAUSE THE QUERY CENTRE WAS GUESSING. That page classified with three ad-hoc
 * predicates, the last of which was a CATCH-ALL — `!queryLetter && !synopsis` meant "sample". So
 * any free text a writer had entered was reported back to them as an opening sample: the app
 * misstating a fact about their own submission, not merely failing to model it.
 *
 * ⚠️ `pill: null` MEANS OTHER, and it is a decision rather than a failure. Nick's ★1: a stored
 * string matching none of the structured patterns IS Other by definition, so nothing is ever
 * dropped or corrupted — it round-trips back out as editable free text.
 *
 * ⚠️ AUTHOR BIO AND FULL MANUSCRIPT ARE STILL RECOGNISED, and that is what lets them be shed. They
 * are retired from the UI, not from the parser: a legacy agent has to be able to SAY it holds one
 * before `materialsWantedFromRows` can decline to re-emit it.
 */
export interface MaterialClass {
  /** The `MAT_OPTS` pill this material is, or null for free text ("Other"). */
  pill: MatOpt | null;
  /** The sample unit, where the pill is a quantified sample. */
  unit?: SampleUnit;
  /** The digits, where the pattern stated a count. */
  count?: string;
}

export function classifyMaterial(raw: string): MaterialClass {
  const v = (raw ?? "").trim();
  if (v === "") return { pill: null };
  const lower = v.toLowerCase();

  if (lower === "query letter") return { pill: "Query letter" };
  if (lower === "author bio") return { pill: "Author bio" };
  if (lower === "full manuscript") return { pill: "Full manuscript" };

  let m: RegExpMatchArray | null;
  if ((m = v.match(/^synopsis\s*\(\s*(\d+)\s*pages?\s*\)$/i))) return { pill: "Synopsis", count: m[1] };
  if (lower === "synopsis") return { pill: "Synopsis" };
  if ((m = v.match(/^first\s+(\d+)\s+pages$/i))) return { pill: "Sample pages", unit: "Pages", count: m[1] };
  if (lower === "sample pages") return { pill: "Sample pages", unit: "Pages" };
  if ((m = v.match(/^first\s+(\d+)\s+chapters$/i))) return { pill: "Sample chapters", unit: "Chapters", count: m[1] };
  if (lower === "sample chapters" || lower === "chapters") return { pill: "Sample chapters", unit: "Chapters" };
  if ((m = v.match(/^([\d,]+)\s+words$/i))) return { pill: "Sample words", unit: "Words", count: m[1].replace(/,/g, "") };
  if (lower === "sample words" || lower === "word count") return { pill: "Sample words", unit: "Words" };

  return { pill: null }; // free text — Other by definition
}

/**
 * The four KINDS a query's material can be — the locked list, and the vocabulary the Query Centre
 * speaks. Author bio and Full manuscript have no kind here: they are recognised by the classifier
 * so legacy data can shed them, and they are not offerable.
 */
export type MaterialKind = "queryLetter" | "synopsis" | "sample" | "other";

const PILL_KIND: Partial<Record<MatOpt, MaterialKind>> = {
  "Query letter": "queryLetter",
  "Synopsis": "synopsis",
  "Sample pages": "sample",
  "Sample chapters": "sample",
  "Sample words": "sample",
};

/**
 * What a QUERY's stored material is. A query holds `(string | QueryMaterial)[]`: legacy plain
 * strings go through the classifier above, and a structured item is already self-describing.
 *
 * ⚠️ `type === "other"` IS THE STRUCTURED FREE TEXT, and it is checked FIRST. `QueryMaterial`
 * already carries the unit, so Other needs no schema change to have an identity — only a reader
 * that looks at it.
 *
 * ⚠️ AND A RETIRED PILL READS AS `other` RATHER THAN VANISHING. A query that genuinely holds an
 * author bio should say so in the writer's own words; silently dropping it from the card would be
 * the app deciding a fact about their submission did not happen.
 */
export function classifyQueryMaterial(item: string | { material?: string; type?: string; quantity?: unknown }): MaterialKind {
  if (typeof item !== "string") {
    if (item.type === "other") return "other";
    if (item.type === "pages" || item.type === "chapters" || item.type === "words") return "sample";
    return PILL_KIND[classifyMaterial(item.material ?? "").pill as MatOpt] ?? "other";
  }
  return PILL_KIND[classifyMaterial(item).pill as MatOpt] ?? "other";
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
  /* ⚠️ DISPLAY, through the one map — the STORED token stays "Query letter" (see MAT_OPTS and
     `materialsWantedFromRows`, which push the literal and must never read this). */
  queryLetter: materialLabel("Query letter"),
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

/* ══════════════════════════════════════════════════════════════════════════════
   THE TWO READINGS OF A SAMPLE — `or` vs `·` (missing-materials pack, Phase 1)
   ══════════════════════════════════════════════════════════════════════════════

   ⚠️ ONE SAMPLE, TWO MEANINGS, AND THE JOIN IS THE WHOLE DIFFERENCE. `materialRowsFromAgent`
   already emits one `sample` row PER SELECTED UNIT (decision 12), so two units side by side is a
   shape both surfaces can hold — but they mean opposite things:

     · an AGENT REQUIREMENT of chapters and pages is a CHOICE the agency offers
       → "3 chapters or 50 pages"
     · a RECORD OF WHAT WENT with chapters and pages is ONE parcel described two ways
       → "3 chapters · 50 pages"

   Reading the second as the first would tell a writer their agent accepts either, when what
   happened is that they sent one thing and measured it twice. `summaryFromRows` joins `·`
   unconditionally, which is correct for what it does (a record) and wrong for a requirement —
   so the join becomes a parameter rather than a second formatter that would drift.

   ⚠️ AND IT IS ONE FORMATTER, NOT TWO. A `formatRequirement` beside a `formatRecord` is how one
   fact gets two wordings; the codebase has paid for that shape before. */

export type SampleJoin = "or" | "and";

/** The separator each reading uses. `and` is the interpunct — one parcel, two measures. */
const JOIN_SEP: Record<SampleJoin, string> = { or: " or ", and: " · " };

/**
 * One sample row as words: `3 chapters`, `50 pages`, `5,000 words`.
 * An `on` row with no amount reads as its bare unit rather than inventing a number.
 */
export function sampleRowText(row: Extract<MaterialRow, { kind: "qty" }>): string {
  const amt = String(row.amount ?? "").trim();
  const unit = row.unit.toLowerCase();
  if (!amt) return unit;
  const n = parseAmount(amt);
  return Number.isNaN(n) ? unit : `${formatAmount(n)} ${n === 1 ? unit.replace(/s$/, "") : unit}`;
}

/**
 * Every selected sample row, in the reading the caller asks for.
 * Returns `null` when nothing is selected — absence is stated by the caller, never as "0 pages".
 */
export function formatSampleSpecs(rows: readonly MaterialRow[], join: SampleJoin): string | null {
  const parts = rows
    .filter((r): r is Extract<MaterialRow, { kind: "qty" }> => r.kind === "qty" && r.on)
    .map(sampleRowText);
  return parts.length ? parts.join(JOIN_SEP[join]) : null;
}

/**
 * The "Will record:" strip and the `Sent previously` tile read from HERE, so the two can never
 * describe the same commit differently. Materials in row order, the sample folded to one clause.
 *
 * ⚠️ IT STATES THE OUTCOME, NEVER A COUNT OF FORMS. "Covering letter · synopsis · 3 chapters"
 * is what will be recorded; "3 items" is a fact about the interface instead of about the work.
 */
export function willRecordText(rows: readonly MaterialRow[], join: SampleJoin = "and"): string | null {
  const parts: string[] = [];
  for (const r of rows) {
    if (!r.on) continue;
    if (r.kind === "qty") continue; // folded in once, below, so two units read as one clause
    if (r.kind === "text") { if (r.text.trim()) parts.push(r.text.trim()); continue; }
    if (r.key === "synopsis" && r.pages.trim()) { parts.push(`${r.name} · ${formatAmount(r.pages)} pages`); continue; }
    parts.push(r.name);
  }
  const sample = formatSampleSpecs(rows, join);
  if (sample) {
    // The sample keeps its position among the rows rather than being appended last.
    const at = rows.findIndex((r) => r.kind === "qty" && r.on);
    const before = rows.slice(0, at).filter((r) => r.on && r.kind !== "qty").length;
    parts.splice(before, 0, sample);
  }
  return parts.length ? parts.join(" · ") : null;
}
