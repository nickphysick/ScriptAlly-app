/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v56 (design-refs/todo-list-v56/todo-navy-header-v1.html) — THE NAVY HEADER'S RIGHT-HAND BLOCK: the ring's
 * three segments on the navy, each a button, and "What needs doing" with its one italic line.
 *
 * ⚠️ NO NEW COUNTING RULES. The ring is `needArcs` / `needYou` (lib/todoHeader54) over `breakdownOf`'s figures, the
 *    tray's own; "late" is the breakdown's `late` (the old counts line's figure) and "to tidy" its `house`.
 * ⚠️ THE RING'S COLOURS ARE CHOSEN TO READ ON NAVY. The tray's group colours (NEED_FILL) do not change.
 */
import type { Breakdown } from "./todoWs";

export type RingKey56 = "wait" | "nudge" | "quiet";

/** the ring on navy, clockwise from 12: agents waiting, nudges due, gone quiet */
export const RING56_FILL: Record<RingKey56, string> = { wait: "#e8bdb4", nudge: "#f4eee5", quiet: "rgba(244,238,229,.34)" };
/** the ring's drawn size on the panel (its geometry is RING_GEO's 210 viewBox) */
export const RING56_SIZE = 140;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
/** each segment's accessible name: "2 agents waiting", "1 nudge due", "3 gone quiet" */
export const segLabel56 = (k: RingKey56, n: number): string =>
  k === "wait" ? plural(n, "agent waiting", "agents waiting") : k === "nudge" ? plural(n, "nudge due", "nudges due") : `${n} gone quiet`;

export interface WordsPart56 { key: "late" | "house"; n: number; words: string }
/** the italic line's parts, "{late} late · {house} to tidy"; a part at 0 is left out, and with both at 0 there is none */
export function wordsLine56(bd: Breakdown): WordsPart56[] {
  const out: WordsPart56[] = [];
  if (bd.late > 0) out.push({ key: "late", n: bd.late, words: "late" });
  if (bd.house > 0) out.push({ key: "house", n: bd.house, words: "to tidy" });
  return out;
}
