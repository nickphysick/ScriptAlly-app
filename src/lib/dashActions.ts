/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * dashActions — the dashboard's quick actions (stage 3, 17 Sep; rebuilt for v16, 18 Sep).
 *
 * ⚠️ THREE TILES, AND THE TWO THAT LEFT ARE NOT GONE FROM THE APP. Smart email drop and New package
 * were quieter rows on this card and are now reached from their own pages — the Record screen carries
 * the paste flow, the packages page carries its builder. A doorway on the dashboard for every flow in
 * the app is how this card grew a list nobody read.
 *
 * ⚠️ EVERY ACTION IS AN EXISTING FLOW, REACHED THE WAY THE SHELL REACHES IT — `invokeCapture`, the
 * same capture contracts the sidebar's New menu uses. The card is a second doorway, never a second
 * door.
 *
 * ⚠️ THE ART IS PART OF THE TILE, AND TWO OF THE THREE ARE NOT DRAWN YET. `art` names the file each
 * tile is waiting for; where the file does not exist the tile draws the dashed placeholder square the
 * ref draws, captioned with the name. Adding the artwork is one entry in `lib/dashArt`, and the
 * placeholder comes off on its own — the tile's box does not change, so nothing relays out.
 */
export type QuickActionKey = "query" | "record" | "agent";

export interface QuickAction {
  key: QuickActionKey;
  label: string;
  /** the capture contract this tile invokes — `shell/railNav`'s, never a flow of its own */
  capture: "query" | "record" | "agent";
  /** the art key in `lib/dashArt`, or the placeholder's caption while the file is missing */
  art: "quill" | "letter" | "card";
}

/** The three tiles, in the ref's order — the thing you do most at the top. */
export const QUICK_ACTIONS: readonly QuickAction[] = [
  { key: "query", label: "Log a query", capture: "query", art: "quill" },
  { key: "record", label: "Record a response", capture: "record", art: "letter" },
  { key: "agent", label: "Add an agent", capture: "agent", art: "card" },
];
