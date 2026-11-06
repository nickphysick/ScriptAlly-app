/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v152.2 (design-refs/query-centre-v152-2/) — the list page's pure parts: the three-option Group menu,
 * the group headers' fills, the "queries need you" to-do rows, and the wait wording ("Same day", "1 day later").
 *
 * ⚠️ "ACTION" IS THE STORED KEY `attention` (the six states, lib/queryState). The old "Next action" (`action`) and
 *    "No grouping" (`none`) are gone from the menu: a saved one reads as Action, and the Group pill's × still gives the
 *    one ungrouped list (`none`), which is never saved.
 */
import { QueryStatus } from "../types";
import type { GroupBy } from "./qcCalView";
import type { QueryState } from "./queryState";
import { STATUS_FILL, statusKind } from "./qc1512";

/* ── §1.1 the Group menu ──────────────────────────────────────────────────────────────────────────────────────── */

export type Group1522 = "status" | "attention" | "package";
export const GROUP_1522: readonly { key: Group1522; label: string; line: string; pro?: boolean }[] = [
  { key: "status", label: "Status", line: "Queried, partial requested, partial sent and so on" },
  { key: "attention", label: "Action", line: "What it needs from you: send, nudge, wait or close" },
  { key: "package", label: "Package", line: "Which submission package you sent", pro: true },
];
export const PACKAGE_LOCKED_LINE = "Group by package with Pro";
export const GROUP_MENU_HEAD = "Group the list by";
/** a saved or chosen grouping as the list reads it: the retired two are Action; Package without the plan is Action */
export function listGroupOf(g: GroupBy, packageOk: boolean): GroupBy {
  if (g === "action") return "attention";
  if (g === "package" && !packageOk) return "attention";
  return g;
}
/** the grouping a device remembers: never the ungrouped one, which the Group pill's × gives for the visit only */
export const savedGroupOf = (g: GroupBy): GroupBy => (g === "none" || g === "action" ? "attention" : g);

/* ── §1.2 group headers ──────────────────────────────────────────────────────────────────────────────────────── */

export const NAVY = "#2a3a52";
export const HARBOUR = "#2e4a5e";
export const INK = "#1c130f";
export const CLOSED_HEAD = "#f8f7f5";
export const PKG_NONE_HEAD = "#f6f3ee";
const mix = (c: string, pct: number): string => `color-mix(in srgb, ${c} ${pct}%, #fff)`;
/** Action's six groups */
export const ACTION_HEAD: Record<QueryState, string> = {
  offer: mix(NAVY, 18),
  materials: mix(NAVY, 18),
  nudge: mix("#c5d0dd", 32),
  agent: mix("#e3dbcf", 32),
  quiet: `linear-gradient(90deg, ${mix("#e3dbcf", 32)}, #fff 60%)`,
  closed: CLOSED_HEAD,
};
/** Action's group titles: "With the agent" reads "Watch and wait" here only (the tab and the card band keep it) */
export const ACTION_LABEL: Record<QueryState, string> = {
  offer: "Offers", materials: "Materials requested", nudge: "Nudge due", agent: "Watch and wait", quiet: "Gone quiet", closed: "Closed",
};
export type HeadKind = "tint" | "pkg" | "pkg-none" | "closed";
/** a header's fill and kind, by grouping and key. Status keys are statuses ("closed" for the closed set); package keys
 *  are `pkg:<name>` or `pkg:none`. */
export function head1522(group: GroupBy, key: string): { fill: string; kind: HeadKind } {
  if (group === "attention" && key in ACTION_HEAD) return { fill: ACTION_HEAD[key as QueryState], kind: key === "closed" ? "closed" : "tint" };
  if (group === "status") {
    if (key === "closed") return { fill: CLOSED_HEAD, kind: "closed" };
    return { fill: mix(STATUS_FILL[statusKind(key)], 32), kind: "tint" };
  }
  if (group === "package") return key === "pkg:none" ? { fill: PKG_NONE_HEAD, kind: "pkg-none" } : { fill: "#ffffff", kind: "pkg" };
  return { fill: mix("#e3dbcf", 32), kind: "tint" };
}
/** the statuses the Status grouping folds into its one "Closed" group */
export const CLOSED_SET: readonly string[] = [QueryStatus.SIGNED, QueryStatus.REJECTED, QueryStatus.NO_RESPONSE, QueryStatus.WITHDRAWN];

/* ── §1.7 / §2.2 the wait wording ─────────────────────────────────────────────────────────────────────────────── */

/** a gap between two dated steps: "Same day", "1 day later", "44 days later" */
export const waitWords = (days: number): string => (days <= 0 ? "Same day" : days === 1 ? "1 day later" : `${days} days later`);
/** a count of days that can be zero: "today", "1 day", "N days" — callers phrase around "today" */
export const dayCount = (n: number): string => (n === 1 ? "1 day" : `${n} days`);
