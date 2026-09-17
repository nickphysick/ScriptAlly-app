/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * dashActions — the quick actions card's four quieter actions (dashboard stage 3, 17 Sep).
 *
 * ⚠️ DECLARED ONCE, SO THE CARD AND ITS LOADING GHOST DRAW THE SAME ROWS. The cover counts this list;
 * a number typed beside it is the drift the skeleton's own lock forbids.
 *
 * ⚠️ THE ICONS AND THE HANDLERS ARE THE CARD'S. This is words, order and ink only, so the ghost can
 * read it without importing an icon set or a flow.
 */

export type QuickActionKey = "record" | "agent" | "email" | "package";

export interface QuickAction {
  key: QuickActionKey;
  label: string;
  /** the icon's ink — the page's ink, the app's slate, or ochre */
  tone: "ink" | "slate" | "ochre";
}

export const QUICK_ACTIONS: readonly QuickAction[] = [
  { key: "record", label: "Record a reply", tone: "ink" },
  { key: "agent", label: "Add an agent", tone: "slate" },
  { key: "email", label: "Smart email drop", tone: "ink" },
  { key: "package", label: "New package", tone: "ochre" },
];
