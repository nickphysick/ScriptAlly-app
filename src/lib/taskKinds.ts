/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE TASK KINDS, ONE MAP FOR BOTH SURFACES (Dashboard v118.1 Part D). The desktop task card and the phone's Up next
 * read their colours from here, keyed by the same four kinds, with each surface's values side by side — so a ruling on a
 * kind's colour is one edit, and the two can only differ where this file says they do.
 *
 * ⚠️ THE KIND IS THE TASK'S LIST GROUP (`kindForGroup`). "Agents are waiting" (req) is the writer's move — an offer
 * included, which the desktop card used to file as "other" because it is not a send. Nudges, then quiet queries to
 * consider closing; everything else (housekeeping, a ready agent, a coming date) is "other".
 */
import type { ListGroupKey } from "./dashList";

export type TaskKind = "nudge" | "close" | "send" | "other";

export interface DesktopKind {
  /** the band's title; null means the item's own group label (housekeeping and the rest) */
  title: string | null;
  band: string;
  bandInk: string;
  /** progress segments and the avatar */
  accent: string;
  /** a past segment: a stated colour, or null for the accent at the card's own .45 */
  past: string | null;
  /** the pager's round buttons on the band */
  pager: string;
}
export interface PhoneKindStyle { tint: string; ring: string | null; kicker: string; disc: string; glyph: string }

export const TASK_KIND: Record<TaskKind, { desktop: DesktopKind; phone: PhoneKindStyle }> = {
  /* ⚠️ Nick's ruling (v118.1): "Your move" is burgundy on the desktop. The phone stays soft pink until it is ruled on. */
  send: {
    desktop: { title: "Your move", band: "#6e3426", bandInk: "#ffffff", accent: "#6e3426", past: "rgba(110, 52, 38, 0.4)", pager: "rgba(255, 255, 255, 0.18)" },
    phone: { tint: "#f5e2da", ring: "#eecdc3", kicker: "#8a4030", disc: "#f5e2da", glyph: "#8a4030" },
  },
  nudge: {
    desktop: { title: "Time to nudge", band: "#2a3a52", bandInk: "#ffffff", accent: "#2a3a52", past: null, pager: "rgba(255, 255, 255, 0.16)" },
    phone: { tint: "#e6edf6", ring: null, kicker: "#2a3a52", disc: "#2a3a52", glyph: "#ffffff" },
  },
  close: {
    desktop: { title: "Consider closing", band: "#e4dfd7", bandInk: "#1c130f", accent: "#7d7064", past: null, pager: "#ffffff" },
    phone: { tint: "#ece8e2", ring: null, kicker: "#6d665e", disc: "#ece8e2", glyph: "#1c130f" },
  },
  other: {
    desktop: { title: null, band: "#5f7591", bandInk: "#ffffff", accent: "#5f7591", past: null, pager: "rgba(255, 255, 255, 0.16)" },
    phone: { tint: "#e8edf3", ring: null, kicker: "#5f7591", disc: "#5f7591", glyph: "#ffffff" },
  },
};

/** The kind, from the task's list group — the one rule both surfaces use. */
export const kindForGroup = (group: ListGroupKey): TaskKind =>
  group === "req" ? "send" : group === "nudge" ? "nudge" : group === "quiet" ? "close" : "other";
