/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The illustration placeholder — one implementation, every slot on the page.
 * Design authority: design-refs/submission-packages-recut-v2.html (`.plate`).
 *
 * ⚠️ THE CAVEAT BRIEF TEXT IS GONE FROM THE PAGE AND THE ICON REPLACES IT (D4). The written
 * commission — "desk scene — letters sorted into a wrapped parcel" — was set in handwriting inside
 * plates as small as 30px, which is neither a legible instruction nor a drawing; at that size it
 * read as smudge. A line-art mark reads at 34px and tells the eye what belongs there, which is what
 * a placeholder is for.
 *
 * ⚠️ AND BECAUSE THE WORDS LEFT THE PAGE, THE REPORT IS NOW THE ONLY PLACE THEY EXIST (D5). The slot
 * inventory table in reports/submission-packages-recut.md carries every brief verbatim out of the
 * broadsheet ref. It is the deliverable Nick hands an illustrator; without it the commission is
 * lost, and nothing in the code would show that it had been.
 *
 * ⚠️ DASHED, BECAUSE DASHED MEANS PROVISIONAL on this page — the same grammar as the ghost panels
 * and the empty-column hold. These marks are placeholders, not finished iconography, and the border
 * is what says so. When the real drawings land, the dash goes with them.
 *
 * ⚠️ ONE COMPONENT RATHER THAN SEVENTEEN COPIES. Shape and size are props, so the day the treatment
 * changes — or the day it is replaced by real art — there is one file to edit and no chance of
 * fifteen slots agreeing and two not.
 */
import React from "react";
import { PACKAGE_ICONS } from "./packageIcons";
import "./packagesBroadsheet.css";

export type SlotShape = "rect" | "disc" | "stamp";

export interface IllustrationSlotProps {
  /** Which mark to draw — a key of `PACKAGE_ICONS`. */
  icon: string;
  /** The mark's rendered size in px. The PLATE is sized by CSS or by width/height. */
  px: number;
  shape?: SlotShape;
  /** Plate size. Omitted where a stylesheet rule already sizes it (the type discs, the stamps). */
  width?: number;
  height?: number;
  /** For the inventory table and for measurement. */
  id?: string;
}

export const IllustrationSlot: React.FC<IllustrationSlotProps> = ({
  icon, px, shape = "rect", width, height, id,
}) => (
  <span
    className={`pkgb-plate pkgb-plate--${shape}`}
    style={{ width, height }}
    data-slot={id}
    data-icon={icon}
    aria-hidden="true"
  >
    {/* ⚠️ STROKE, OPACITY AND CAPS COME FROM CSS, not from per-path attributes — one rule governs
        all seventeen marks, so they cannot drift into looking like two different sets. */}
    <svg viewBox="0 0 32 32" width={px} height={px} xmlns="http://www.w3.org/2000/svg">
      {PACKAGE_ICONS[icon] ?? null}
    </svg>
  </span>
);
