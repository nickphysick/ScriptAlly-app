/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Materials — the SINGLE source of truth for turning a query material into display text.
 *
 * A query's `materialsWanted` is a backward-compatible union: legacy entries are plain
 * strings ("Sample Pages", "First 50 pages"); new entries are structured QueryMaterial
 * objects ({ material, type, quantity }). EVERY screen that renders a material — the query
 * detail, the timeline, the CSV export, RecordResponseModal, the editor — routes through
 * `formatQueryMaterial` here. There is deliberately no second formatter: that's how the
 * display can never diverge between screens.
 *
 * All functions here are PURE — they never mutate their input, so reading or displaying a
 * legacy string[] query never "upgrades" or rewrites it.
 */
import type { QueryMaterial } from "../types";

export type MaterialType = "pages" | "words" | "chapters" | "other";

/** The base material name, whether stored as a legacy string or a structured item. */
export function materialLabel(item: string | QueryMaterial): string {
  return typeof item === "string" ? item : item.material;
}

/**
 * Legacy free-string formatter (formerly Queries.formatSubmissionMaterial). Internal —
 * `formatQueryMaterial` is the only public entry point. Also used as the canonical
 * vocabulary for structured items, so "50 pages" and the legacy "First 50 pages" render
 * identically.
 */
/**
 * ⚠️ THE SAMPLE NAMES ITSELF FROM ITS OWN SIZE — `First 3 chapters`, `First 50 pages`,
 * `First 5,500 words`. Derived at render from the unit and the quantity, never stored: the artefact
 * carries one `ComponentType` for all three units, so a stored label would be asserting a unit the
 * record does not know. This is the whole of that rule, in the module that already declares itself
 * the only formatter — so the pill, the timeline, the CSV and the response takeover cannot drift.
 *
 * ⚠️ AND ONE IS SINGULAR WITH NO NUMERAL AT ALL. `First 1 chapter` is a sentence nobody writes; the
 * count is already carried by the word. Anything other than exactly one keeps its numeral, with the
 * thousands separator the caller has already applied.
 */
function sized(n: string, unit: "page" | "chapter" | "word"): string {
  const one = parseInt(n.replace(/[^0-9]/g, ""), 10) === 1;
  return one ? `First ${unit}` : `First ${n} ${unit}s`;
}

function formatLegacyMaterial(mat: string): string {
  const norm = mat.toLowerCase().trim();

  if (norm === "query letter" || norm === "query" || norm.includes("query letter")) {
    return "Query letter";
  }
  if (norm === "synopsis" || norm.includes("synopsis")) {
    return "Synopsis";
  }

  // Extract number from string, e.g. "First 50 pages" or "50 pages" or "3 chapters"
  const numMatch = mat.match(/\d+[\d,.]*/);
  const numStr = numMatch ? numMatch[0] : "";

  if (norm.includes("page")) {
    return sized(numStr || "50", "page");
  }
  if (norm.includes("chapter")) {
    return sized(numStr || "3", "chapter");
  }
  if (norm.includes("word")) {
    let formattedNum = numStr;
    if (numStr && !numStr.includes(",")) {
      const parsedNum = parseInt(numStr.replace(/[^0-9]/g, ""), 10);
      if (!isNaN(parsedNum)) {
        formattedNum = parsedNum.toLocaleString("en-GB");
      }
    }
    return sized(formattedNum || "3,000", "word");
  }

  // Truncate other text at 30 characters
  if (mat.length > 30) {
    return mat.substring(0, 30) + "...";
  }
  return mat;
}

/**
 * ⚠️ IS THERE A QUANTITY WORTH STATING — ONE PREDICATE, because three places asked it and all three
 * asked it wrong.
 *
 * The fault: `Partial manuscript requested — 0 pages`. The guards were truthiness tests, and the
 * quantity reaches them as a STRING — `recordResponse` writes
 * `String(data.materialsQuantity ?? "").trim()` — so the number `0` was filtered and the string
 * `"0"` sailed through. A placeholder rendering as a fact, and the sentence should simply have
 * ended after `requested`.
 *
 * ⚠️ NON-NUMERIC TEXT IS A STATED QUANTITY, whatever it says. An `other` item carries the writer's
 * own words ("the first three chapters"), and `Number()` of that is `NaN` — which must not be read
 * as "nothing stated". Only a value that parses as a number is judged as one.
 */
export function statedQuantity(quantity: unknown): boolean {
  if (quantity === undefined || quantity === null) return false;
  const s = String(quantity).trim();
  if (s === "") return false;
  const n = Number(s);
  return Number.isFinite(n) ? n > 0 : true;
}

/**
 * THE place a material becomes display text. Handles legacy strings (via the parser above)
 * and structured items. A structured item with no type/quantity renders as its bare label;
 * an "other" item renders its free-text quantity verbatim; a numeric item is rendered through
 * the same legacy vocabulary so it matches existing display ("50 pages" → "First 50 pages").
 * Pure — never mutates its input.
 */
export function formatQueryMaterial(item: string | QueryMaterial): string {
  if (typeof item === "string") return formatLegacyMaterial(item);

  const { material, type, quantity } = item;
  const hasQty = statedQuantity(quantity);

  if (!type || !hasQty) return formatLegacyMaterial(material); // unquantified → just the label
  if (type === "other") return String(quantity); // free text, verbatim

  // Numeric quantity + unit → run through the same vocabulary as legacy strings so the two
  // render identically (commas for words, "First N pages/chapters", etc.).
  return formatLegacyMaterial(`${quantity} ${type}`);
}

/**
 * The bare "quantity unit" readback for the What-you-sent sample-materials row — "50 pages",
 * "3 chapters", "10,000 words" (comma-grouped), the free text for an "other" item, or "Included"
 * when the unit/quantity is unspecified (legacy back-compat — a bare item never loses its "was sent"
 * meaning). Deliberately WITHOUT formatQueryMaterial's "First " prefix; kept in this one module so
 * material display never diverges. Pure — never mutates its input.
 */
export function sampleMaterialText(item: string | QueryMaterial): string {
  if (typeof item === "string") return formatLegacyMaterial(item); // legacy string keeps its display
  const { type, quantity } = item;
  const hasQty = statedQuantity(quantity);
  if (!type || !hasQty) return "Included"; // unit/quantity unspecified — historic data preserved
  if (type === "other") return String(quantity);
  const n = typeof quantity === "number" ? quantity : parseInt(String(quantity).replace(/[^0-9]/g, ""), 10);
  const num = Number.isFinite(n) ? n.toLocaleString("en-GB") : String(quantity);
  return `${num} ${type}`;
}
