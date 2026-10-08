/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE QUERY CENTRE LIST'S MEMORY (v132 §4) — what the list remembers between visits, on this device.
 *
 * ⚠️ THERE WAS NO LIST MEMORY BEFORE THIS: the list's grouping, sort and filter are page state and
 * start at their defaults on every load. So this holds DENSITY alone, under its own versioned key,
 * rather than "alongside group and sort" as the brief assumed.
 *
 * ⚠️ VERSIONED AND VALIDATED ON RESTORE. An older or unknown shape is refused whole; a junk field
 * reads as its default.
 */
export type QcDensity = "comfortable" | "compact";
export const QC_LIST_MEMORY_KEY = "sa.qcList.v1";
export const QC_LIST_MEMORY_VERSION = 1;
export interface QcListMemory { density: QcDensity }
export const QC_LIST_DEFAULTS: QcListMemory = { density: "comfortable" };

/** Parse what was stored. Anything that is not this version's shape is the defaults. */
export function parseQcListMemory(raw: string | null | undefined): QcListMemory {
  if (!raw) return { ...QC_LIST_DEFAULTS };
  try {
    const o = JSON.parse(raw) as { v?: unknown; density?: unknown } | null;
    if (!o || typeof o !== "object" || o.v !== QC_LIST_MEMORY_VERSION) return { ...QC_LIST_DEFAULTS };
    return { density: o.density === "compact" ? "compact" : "comfortable" };
  } catch { return { ...QC_LIST_DEFAULTS }; }
}
export const serialiseQcListMemory = (m: QcListMemory): string => JSON.stringify({ v: QC_LIST_MEMORY_VERSION, density: m.density });

export function readQcListMemory(): QcListMemory {
  try { return parseQcListMemory(typeof localStorage !== "undefined" ? localStorage.getItem(QC_LIST_MEMORY_KEY) : null); }
  catch { return { ...QC_LIST_DEFAULTS }; }
}
export function writeQcListMemory(m: QcListMemory): void {
  try { localStorage.setItem(QC_LIST_MEMORY_KEY, serialiseQcListMemory(m)); } catch { /* storage may be blocked; the page works without it */ }
}
