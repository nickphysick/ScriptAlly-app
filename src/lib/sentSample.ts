/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v54, D7 — THE SAMPLE THAT WENT, AS STORED. A query's `materialsWanted` carries the sample as one structured
 * `QueryMaterial` ({ material: "Sample Pages", type, quantity }); v54 adds where it started, `from` and `fromUnit`.
 *
 * ⚠️ BOTH FIELDS ARE OPTIONAL AND A SAMPLE FROM THE OPENING WRITES NEITHER (Nick, 9 Nov). So every record written before
 *    v54 is still valid and reads exactly as before, and a new opening sample is byte-for-byte the record the log journey
 *    has always written. firestore.rules checks only that `materialsWanted` is a list (or map) of 20 or fewer, never an
 *    item's keys, so no rule changes.
 * ⚠️ ONE PARSER READS BOTH SHAPES (`sampleOfMaterials`), and an old record parses to "from the opening". ONE WRITER
 *    (`sampleToMaterial`), used by the log journey and the To-do's batches alike.
 */
import type { QueryMaterial } from "../types";
import { defFromUnit, type FromUnit, type Sample } from "./queryActions/sample";

/** the canonical name a sample is stored under (logSave's `materialsToQuery` has always written this) */
export const SAMPLE_MATERIAL = "Sample Pages";
const UNITS = ["pages", "words", "chapters"] as const;
type Unit = (typeof UNITS)[number];
const FROM_UNITS: readonly FromUnit[] = ["chapter", "page", "word"];

const isUnit = (x: unknown): x is Unit => typeof x === "string" && (UNITS as readonly string[]).includes(x);
const whole = (x: unknown): number | null => {
  const n = typeof x === "number" ? x : parseInt(String(x ?? "").replace(/,/g, ""), 10);
  return Number.isFinite(n) && n >= 1 ? Math.round(n) : null;
};

/** is this item the sample (structured or legacy)? */
export function isSampleItem(item: string | QueryMaterial): boolean {
  const name = (typeof item === "string" ? item : item.material).toLowerCase();
  return /sample|^first\s|\b(pages?|chapters?|words?)\b/.test(name) && !/synopsis|query letter/.test(name);
}

/**
 * One item → the sample, or null when it is not a sample or says no amount. A structured item with no `from` (every
 * record before v54, and every opening sample since) is "from the opening".
 */
export function sampleOfItem(item: string | QueryMaterial): Sample | null {
  if (typeof item === "string") {
    /* legacy strings: "First 50 pages", "50 pages", "Sample chapters: 3" … the first number and unit named */
    const m = item.match(/(\d[\d,]*)\s*(page|chapter|word)s?\b/i) ?? item.match(/(page|chapter|word)s?\b\D*(\d[\d,]*)/i);
    if (!m) return null;
    const [num, u] = /\d/.test(m[1]) ? [m[1], m[2]] : [m[2], m[1]];
    const amt = whole(num);
    const unit = `${u.toLowerCase()}s`;
    return amt && isUnit(unit) ? { unit, amt, from: 1, sect: false, fu: null } : null;
  }
  if (!isUnit(item.type)) return null;
  const amt = whole(item.quantity);
  if (!amt) return null;
  const from = whole(item.from);
  const fu = FROM_UNITS.includes(item.fromUnit as FromUnit) ? (item.fromUnit as FromUnit) : null;
  return from != null && from > 1 ? { unit: item.type, amt, from, sect: true, fu } : { unit: item.type, amt, from: 1, sect: false, fu: null };
}

/** a query's `materialsWanted` → its sample, or null */
export function sampleOfMaterials(items: readonly (string | QueryMaterial)[] | null | undefined): Sample | null {
  for (const it of items ?? []) {
    if (!isSampleItem(it)) continue;
    const s = sampleOfItem(it);
    if (s) return s;
  }
  return null;
}

/** the sample → its stored item; `from`/`fromUnit` only for a section further in */
export function sampleToMaterial(s: Sample): QueryMaterial | null {
  if (s.unit === "none") return null;
  const out: QueryMaterial = { material: SAMPLE_MATERIAL, type: s.unit, quantity: s.amt };
  if (s.sect && s.from > 1) {
    out.from = s.from;
    out.fromUnit = s.fu ?? defFromUnit(s.unit);
  }
  return out;
}

/** a whole number from what was typed ("5,000", " 37 "), or null — the pickers' typed boxes (D7) */
export const typedWhole = (raw: string): number | null => {
  const n = parseInt(String(raw).replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) && n >= 1 ? n : null;
};
