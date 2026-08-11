/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Illustrated marks for the Manuscripts plate card. Reference: design-refs/manuscripts-plate.html,
 * treatment B (`.tiles2` / `.btile`) — the four tile scenes, lifted verbatim.
 *
 * ⚠️ THESE ARE INLINE SVG WITH GENUINE TRANSPARENCY — NOT THE DASHBOARD'S PAINTED PNGs.
 * The dashboard's illustrated marks are raster artwork drawn on WHITE PAPER, which is why they
 * carry `mix-blend-mode: multiply` and why a `transform` on an ancestor breaks them (a transform
 * isolates the blend group and the white field silently returns). Neither applies here: there is
 * no white field to remove, so multiply would darken the washes instead of cleaning them up.
 * **Do not add `mix-blend-mode` to these, and do not copy the dashboard's blend rules across.**
 *
 * ⚠️ THE FILLS ARE BAKED, DELIBERATELY — these are ILLUSTRATIONS, NOT THEMED SURFACES.
 * Nothing here reads `currentColor` or a `--msv-*` token, so a mark renders identically in
 * Cappuccino, Bold Pastille and Editorial. That is the design decision, not an oversight: the
 * surfaces around them theme, the artwork does not. Editorial is monochrome and has no sage —
 * a mark that themed would have to be redrawn there rather than recoloured.
 *
 * Every mark takes `size` and nothing else. The viewBox is a square 80×80 in all four, so a
 * single number governs both axes and the four sit on a common optical scale.
 */
import React from "react";

/** The ref draws every tile scene at 70px inside its 104px plate. */
export const MARK_SIZE = 70;

interface MarkProps {
  /** Rendered width and height in px. Square by construction — the viewBox is 80×80. */
  size?: number;
}

/**
 * Out in the world — a paper plane. The one mark that sits on the pink plate; its own wing is
 * pink so it reads as one object with the plate rather than a sage mark on the wrong ground.
 */
export const PaperPlaneMark: React.FC<MarkProps> = ({ size = MARK_SIZE }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-hidden="true" focusable="false">
    <path d="M12 48 68 16l-10 38-18-12z" fill="#fff" stroke="#3a1c14" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M40 42 68 16 24 38z" fill="#e8c8bc" stroke="#3a1c14" strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M40 42v14l8-8" fill="#fdfaf5" stroke="#3a1c14" strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
);

/** Comparable titles — three book spines of unequal height, shelved. */
export const BookSpinesMark: React.FC<MarkProps> = ({ size = MARK_SIZE }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-hidden="true" focusable="false">
    <rect x="18" y="16" width="16" height="48" rx="2" fill="#cdd8ca" stroke="#3a1c14" strokeWidth="1.5" />
    <rect x="36" y="22" width="14" height="42" rx="2" fill="#fdfaf5" stroke="#3a1c14" strokeWidth="1.5" />
    <rect x="52" y="12" width="14" height="52" rx="2" fill="#f5e2da" stroke="#3a1c14" strokeWidth="1.5" />
    <path d="M22 28h8M40 32h6M56 24h6" stroke="#5a6e58" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

/** On the shelf — a calendar with a clock face set into it: a date, and time elapsed since. */
export const CalendarClockMark: React.FC<MarkProps> = ({ size = MARK_SIZE }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-hidden="true" focusable="false">
    <rect x="16" y="20" width="48" height="46" rx="4" fill="#fff" stroke="#3a1c14" strokeWidth="1.6" />
    <path d="M16 32h48" stroke="#3a1c14" strokeWidth="1.5" />
    <path d="M28 14v10M52 14v10" stroke="#3a1c14" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="40" cy="49" r="11" fill="#e7ede3" stroke="#5a6e58" strokeWidth="1.5" />
    <path d="M40 43v6l4 3" stroke="#5a6e58" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

/** Submission materials — two stacked leaves, the top one ruled. */
export const StackedPagesMark: React.FC<MarkProps> = ({ size = MARK_SIZE }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-hidden="true" focusable="false">
    <rect x="14" y="26" width="42" height="40" rx="3" fill="#fdfaf5" stroke="#3a1c14" strokeWidth="1.5" />
    <rect x="24" y="16" width="42" height="40" rx="3" fill="#f5e2da" stroke="#3a1c14" strokeWidth="1.5" />
    <path d="M32 26h26M32 34h26M32 42h16" stroke="#7c3a2a" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

/** The Scout — a magnifier over the shelf. Sits in the comps pane's strip, not in a tile. */
export const MagnifierMark: React.FC<MarkProps> = ({ size = MARK_SIZE }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-hidden="true" focusable="false">
    <circle cx="35" cy="35" r="20" fill="#e9ede6" stroke="#3a1c14" strokeWidth="1.6" />
    <path d="m50 50 15 15" stroke="#3a1c14" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M28 35h14M35 28v14" stroke="#5a6e58" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

/**
 * The marks, by key. Exists so a spec can sweep every mark rather than naming them one at a time —
 * a mark added here is covered the moment it lands.
 *
 * ⚠️ THE PLATE'S NOTEBOOK MARK IS NOT IN HERE, AND MUST NOT BE ADDED.
 * It is `src/assets/shell/manuscript-icon.png`, the raster the dashboard author tile already
 * imports. One asset, one home: the plate imports the PNG directly the way `OneScreenAuthor` does.
 * Tracing it to SVG for the sake of a uniform module would fork the artwork in two.
 */
export const MANUSCRIPT_MARKS = {
  plane: PaperPlaneMark,
  spines: BookSpinesMark,
  calendar: CalendarClockMark,
  pages: StackedPagesMark,
  magnifier: MagnifierMark,
} as const;

export type ManuscriptMarkKey = keyof typeof MANUSCRIPT_MARKS;
