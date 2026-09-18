/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * dashActions — the dashboard's quick actions (v33, 18 Sep; ref design-refs/dashboard-v33.html).
 *
 * ⚠️ ONE MAIN ACTION AND TWO LINES. "Log a query" is the tile — it is what this card is for, and it
 * carries the quill; "Record a response" and "Add an agent" are plain rows beneath it. Three equal
 * tiles said the three were equally likely, and they are not.
 *
 * ⚠️ EVERY ACTION IS AN EXISTING FLOW, REACHED THE WAY THE SHELL REACHES IT — `invokeCapture`, the
 * same capture contracts the sidebar's New menu uses. The card is a second doorway, never a second
 * door. Smart email drop and New package stay reached from their own pages.
 *
 * ⚠️ THE PER-TILE ART KEYS AND THEIR DASHED PLACEHOLDERS ARE RETIRED. Only the main tile carries a
 * picture now, and it exists (`DASH_ART.quill`), so there is nothing left to wait for.
 */
export type QuickActionKey = "query" | "record" | "agent";
export interface QuickAction {
  key: QuickActionKey;
  label: string;
  /** the capture contract this action invokes — `shell/railNav`'s, never a flow of its own */
  capture: "query" | "record" | "agent";
  /** the tile, or one of the rows under it */
  rank: "main" | "minor";
}
/** In the ref's order — the thing you do most at the top. */
export const QUICK_ACTIONS: readonly QuickAction[] = [
  { key: "query", label: "Log a query", capture: "query", rank: "main" },
  { key: "record", label: "Record a response", capture: "record", rank: "minor" },
  { key: "agent", label: "Add an agent", capture: "agent", rank: "minor" },
];
