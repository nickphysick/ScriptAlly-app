/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Import page's words (onboarding v5, part 3; ref design-refs/onboarding/onboarding-journey-v5.html
 * #desk). Stated once so the page and its lock read the same strings.
 */
import type { SmartImportEntitlement } from "./smartImportEntitlement";

export const IMPORT_TITLE = "Bring your list across.";
export const IMPORT_SUB = "Agents, queries and dates from the spreadsheet you already keep. You check everything before it's saved.";

export const TILE_SMART = {
  title: "Smart import.",
  text: "Any layout, any wording. QueryHawk reads the sheet and shows you everything before anything is saved.",
  action: "Import a spreadsheet",
} as const;
export const TILE_TEMPLATE = {
  title: "Our template.",
  text: "Set columns, read exactly. Use it as often as you like to add agents and queries in bulk.",
  download: "Download the template",
  upload: "Upload my sheet",
  fact: "Always free · No limit",
} as const;
export const TILE_MATCH = {
  title: "Match your own columns.",
  text: "Keep a sheet with unusual columns? Tell QueryHawk which column is which.",
  action: "Match columns",
  fact: "CSV · Always free",
} as const;

/**
 * The Smart import tile's fact line, from the entitlement.
 *   allowed                 → "1 Smart Import available"
 *   free, already used      → "Smart Import already used"
 *   Pro, this month's used  → "Available {date}" (the entitlement's `nextAvailable`), or
 *                             "Available next month" when the entitlement carries no date.
 */
export function smartFactLine(e: Pick<SmartImportEntitlement, "allowed" | "reason" | "nextAvailable">, shortDate: (iso: string) => string): string {
  if (e.allowed) return "1 Smart Import available";
  if (e.reason === "pro_month_used") return e.nextAvailable ? `Available ${shortDate(e.nextAvailable)}` : "Available next month";
  return "Smart Import already used";
}

/**
 * The footnote: two sentences, as the reference has them. The second was held back while it was
 * not true of all three ways in. It is true since import-truth: the template, Smart Import and the
 * column matcher all match an agent with `sameAgent` (the same name, and the same agency or one
 * side giving none), and a matched agent is not written again.
 */
export const IMPORT_FOOTNOTE = "An import adds to what you already have.";
export const IMPORT_FOOTNOTE_SECOND = "An agent already on your contact list isn't added again.";
