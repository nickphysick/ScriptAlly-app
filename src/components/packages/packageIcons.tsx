/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The placeholder icon library — seventeen line-art marks, ported VERBATIM from
 * design-refs/submission-packages-recut-v2.html (`const ICON`).
 *
 * ⚠️ THESE ARE STILL PLACEHOLDERS AND MUST NOT READ AS FINISHED ICONOGRAPHY (D4). They replace the
 * Caveat brief text, which was illegible at the sizes the page actually renders — a written
 * commission set in a 30px circle is neither a drawing nor a brief. The dashed plate stays around
 * every one of them, because dashed is this page's grammar for provisional, and the day real
 * artwork lands the dash goes with it.
 *
 * ⚠️ AND THE WRITTEN BRIEF IS NOT LOST — IT MOVED TO THE REPORT (D5). "desk scene — letters sorted
 * into a wrapped parcel", "letter on doormat", "magnifying glass over page": those words are the
 * artist's instruction and they no longer appear anywhere on the page, so the slot inventory table
 * in reports/submission-packages-recut.md is now the only place they exist. That table is the
 * deliverable, not an appendix — losing it loses the commission.
 *
 * ⚠️ ONE VIEWBOX FOR ALL SEVENTEEN (32×32), so a size is a single number at the call site and every
 * mark scales identically. Stroke, opacity and cap style are set once on the parent `<svg>` in CSS
 * rather than per path — see `.pkgb-plate svg` in packagesBroadsheet.css.
 */
import React from "react";

/** Every mark the page can render, by name. Paths are the ref's own, unaltered. */
export const PACKAGE_ICONS: Record<string, React.ReactNode> = {
  envelope: (
    <>
      <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h19A2.5 2.5 0 0 1 28 8.5v15a2.5 2.5 0 0 1-2.5 2.5h-19A2.5 2.5 0 0 1 4 23.5z"/>
      <path d="M4.6 7.6 16 17 27.4 7.6"/>
      <circle cx="16" cy="21.5" r="3.2"/>
    </>
  ),
  scroll: (
    <>
      <path d="M8 5h13a3 3 0 0 1 3 3v16a3 3 0 0 0 3 3H11a3 3 0 0 1-3-3z"/>
      <path d="M8 5a3 3 0 0 0-3 3v2h3"/>
      <path d="M12 11h8M12 15h8M12 19h5"/>
    </>
  ),
  pages: (
    <>
      <path d="M9 4h9l5 5v17a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
      <path d="M18 4v5h5"/>
      <path d="M11 14h10M11 18h10M11 22h6"/>
      <path d="M20 2.5v6" strokeDasharray="1.5 2"/>
    </>
  ),
  parcel: (
    <>
      <path d="M16 4 28 10v12L16 28 4 22V10z"/>
      <path d="M16 15 28 10M16 15v13M16 15 4 10"/>
      <path d="M10 7l12 6"/>
      <circle cx="16" cy="15" r="2.4"/>
    </>
  ),
  parcelOpen: (
    <>
      <path d="M4 13 16 7l12 6v11l-12 6-12-6z"/>
      <path d="M16 19 28 13M16 19v11M16 19 4 13"/>
      <path d="M11 4.5 16 7l5-2.5" strokeDasharray="2 2"/>
    </>
  ),
  desk: (
    <>
      <path d="M3 24h26M5 24V12a2 2 0 0 1 2-2h6"/>
      <path d="M13 6h10l4 4v9a1.5 1.5 0 0 1-1.5 1.5H14.5A1.5 1.5 0 0 1 13 19z"/>
      <path d="M23 6v4h4"/>
      <path d="M16 12h7M16 15.5h7"/>
      <circle cx="8.5" cy="17" r="2.6"/>
      <path d="M8.5 14.4v-3"/>
    </>
  ),
  postbox: (
    <>
      <path d="M8 12a8 8 0 0 1 16 0v14H8z"/>
      <path d="M12 12h8" strokeWidth="2"/>
      <path d="M11 20h10"/>
      <path d="M16 26v3"/>
    </>
  ),
  doormat: (
    <>
      <path d="M4 22h24l-2 5H6z"/>
      <path d="M9 22v5M15 22v5M21 22v5"/>
      <path d="M11 6h12v11H11z"/>
      <path d="M11 6l6 5 6-5"/>
    </>
  ),
  magnifier: (
    <>
      <path d="M7 5h11l4 4v6" />
      <path d="M18 5v4h4"/>
      <path d="M7 5v18a2 2 0 0 0 2 2h5"/>
      <path d="M10 11h8M10 15h5"/>
      <circle cx="21" cy="21" r="5.5"/>
      <path d="M25 25l3.5 3.5"/>
    </>
  ),
  chart: (
    <>
      <path d="M5 26h22M5 26V5"/>
      <rect x="9" y="17" width="4" height="9"/>
      <rect x="15" y="12" width="4" height="14"/>
      <rect x="21" y="7" width="4" height="19"/>
    </>
  ),
  tally: (
    <>
      <path d="M7 5h14a2 2 0 0 1 2 2v18a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/>
      <path d="M9.5 11v6M12.5 11v6M15.5 11v6M8.5 19l8-9"/>
      <path d="M9.5 23h9"/>
    </>
  ),
  outgoing: (
    <>
      <path d="M4 15h13a2 2 0 0 0 2-2V7l9 9-9 9v-6a2 2 0 0 0-2-2H4z" strokeDasharray="0"/>
      <path d="M4 9h7M4 21h7" strokeDasharray="2 2.5"/>
    </>
  ),
  opened: (
    <>
      <path d="M5 14 16 6l11 8v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/>
      <path d="M5 14l11 8 11-8"/>
      <path d="M10 12V4h12v8"/>
    </>
  ),
  bookmark: (
    <>
      <path d="M8 4h13l4 4v18a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
      <path d="M21 4v4h4"/>
      <path d="M10 12h9M10 16h6"/>
      <path d="M17 20h6v8l-3-2.5L17 28z" fill="rgba(124,58,42,.1)"/>
    </>
  ),
  typewriter: (
    <>
      <path d="M6 14h20l2 8H4z"/>
      <path d="M9 14V7h14v7"/>
      <path d="M12 10h8"/>
      <path d="M10 22v3h12v-3"/>
    </>
  ),
  inkwell: (
    <>
      <path d="M10 16h12v8a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3z"/>
      <path d="M9 16h14"/>
      <path d="M20 16 25 5l3 1.5-4 10.5"/>
    </>
  ),
  postmark: (
    <>
      <circle cx="16" cy="16" r="10" strokeDasharray="3 2.5"/>
      <path d="M9 13h14M9 19h14"/>
      <path d="M13 13v6M19 13v6"/>
    </>
  ),
};

export type PackageIconName = keyof typeof PACKAGE_ICONS;
