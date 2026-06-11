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
    return `First ${numStr || "50"} pages`;
  }
  if (norm.includes("chapter")) {
    return `First ${numStr || "3"} chapters`;
  }
  if (norm.includes("word")) {
    let formattedNum = numStr;
    if (numStr && !numStr.includes(",")) {
      const parsedNum = parseInt(numStr.replace(/[^0-9]/g, ""), 10);
      if (!isNaN(parsedNum)) {
        formattedNum = parsedNum.toLocaleString("en-GB");
      }
    }
    return `First ${formattedNum || "3,000"} words`;
  }

  // Truncate other text at 30 characters
  if (mat.length > 30) {
    return mat.substring(0, 30) + "...";
  }
  return mat;
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
  const hasQty = quantity !== undefined && quantity !== null && String(quantity).trim() !== "";

  if (!type || !hasQty) return formatLegacyMaterial(material); // unquantified → just the label
  if (type === "other") return String(quantity); // free text, verbatim

  // Numeric quantity + unit → run through the same vocabulary as legacy strings so the two
  // render identically (commas for words, "First N pages/chapters", etc.).
  return formatLegacyMaterial(`${quantity} ${type}`);
}
