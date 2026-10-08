/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE QUERY CENTRE LIST'S MEMORY (v132 §4) — what the list remembers between visits, on this device.
 *
 * It holds DENSITY and the GROUPING (v132 follow-up, 8 Oct: the default grouping is Urgency, and a
 * writer's own choice is remembered). Sort and filter are page state and start at their defaults.
 *
 * ⚠️ THE KEY STAYS `sa.qcList.v1`; THE VERSION INSIDE IT IS 2. A version-1 record (density alone) is
 * refused whole, like any other shape that is not this version's; a junk field reads as its default.
 */
import type { GroupBy } from "./qcCalView";
export type QcDensity = "comfortable" | "compact";
export const QC_LIST_MEMORY_KEY = "sa.qcList.v1";
export const QC_LIST_MEMORY_VERSION = 2;
export interface QcListMemory { density: QcDensity; group: GroupBy }
export const QC_LIST_DEFAULTS: QcListMemory = { density: "comfortable", group: "attention" };
const GROUPS: readonly GroupBy[] = ["attention", "status", "action", "package", "none"];

/** Parse what was stored. Anything that is not this version's shape is the defaults. */
export function parseQcListMemory(raw: string | null | undefined): QcListMemory {
  if (!raw) return { ...QC_LIST_DEFAULTS };
  try {
    const o = JSON.parse(raw) as { v?: unknown; density?: unknown; group?: unknown } | null;
    if (!o || typeof o !== "object" || o.v !== QC_LIST_MEMORY_VERSION) return { ...QC_LIST_DEFAULTS };
    return {
      density: o.density === "compact" ? "compact" : "comfortable",
      group: GROUPS.includes(o.group as GroupBy) ? (o.group as GroupBy) : QC_LIST_DEFAULTS.group,
    };
  } catch { return { ...QC_LIST_DEFAULTS }; }
}
export const serialiseQcListMemory = (m: QcListMemory): string => JSON.stringify({ v: QC_LIST_MEMORY_VERSION, density: m.density, group: m.group });

export function readQcListMemory(): QcListMemory {
  try { return parseQcListMemory(typeof localStorage !== "undefined" ? localStorage.getItem(QC_LIST_MEMORY_KEY) : null); }
  catch { return { ...QC_LIST_DEFAULTS }; }
}
export function writeQcListMemory(m: QcListMemory): void {
  try { localStorage.setItem(QC_LIST_MEMORY_KEY, serialiseQcListMemory(m)); } catch { /* storage may be blocked; the page works without it */ }
}
