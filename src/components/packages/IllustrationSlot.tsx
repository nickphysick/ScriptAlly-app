/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The illustration placeholder — one implementation, thirteen instances.
 * Design authority: design-refs/submission-packages-broadsheet.html (`.plate`).
 *
 * ⚠️ THE BRIEF TEXT IS THE ARTIST'S COMMISSION AND IS QUOTED, NEVER PARAPHRASED (D7). Each slot
 * carries the exact words the ref put in it — "sealed envelope", "open parcel, empty", "letter on
 * doormat". Those are instructions to whoever draws these, and a paraphrase is a different
 * instruction. The full inventory is tabulated in reports/submission-packages-broadsheet.md for
 * handing over.
 *
 * ⚠️ DASHED, BECAUSE DASHED MEANS PROVISIONAL on this page — the same grammar as the ghost panels
 * and the ghost tile. When the real drawings land, the dash goes with them.
 *
 * ⚠️ AND IT IS ONE COMPONENT RATHER THAN THIRTEEN COPIES. The ref repeats a `plate()` helper; here
 * the shape and size are props, so the day the placeholder treatment changes — or the day it is
 * replaced by real art — there is one file to edit and no chance of eleven of them agreeing and two
 * not.
 */
import React from "react";
import "./packagesBroadsheet.css";

export type SlotShape = "rect" | "disc" | "stamp";

export interface IllustrationSlotProps {
  /** The artist's brief, verbatim from the ref. Newlines are rendered as line breaks. */
  brief: string;
  shape?: SlotShape;
  /** Rendered size. A stamp sizes itself; rect and disc take what they are given. */
  width?: number;
  height?: number;
  /** Drops the ILLUSTRATION label — for slots too small to carry it (the ref's `.tiny`). */
  tiny?: boolean;
  /** For the inventory table and for measurement. */
  id?: string;
}

export const IllustrationSlot: React.FC<IllustrationSlotProps> = ({
  brief, shape = "rect", width, height, tiny, id,
}) => (
  <span
    className={`pkgb-plate pkgb-plate--${shape}${tiny ? " pkgb-plate--tiny" : ""}`}
    style={{ width, height }}
    data-slot={id}
    aria-hidden="true"
  >
    {!tiny && <span className="pkgb-plbl">Illustration</span>}
    <span className="pkgb-pbrief">
      {brief.split("\n").map((line, i, all) => (
        <React.Fragment key={i}>
          {line}
          {i < all.length - 1 && <br />}
        </React.Fragment>
      ))}
    </span>
  </span>
);

/**
 * The Pro marker — a wax seal.
 *
 * ⚠️ SCOPED TO THIS PAGE ONLY (D2). It replaces the `.pkgw-propill` here and nowhere else; whether
 * the app's Pro marker becomes a wax seal everywhere is a separate decision — see F-A. Nothing
 * outside this page imports it, which is what keeps that decision open rather than made by accident.
 */
/*
 * ⚠️ `role="img"` SO THE HEADING'S ACCESSIBLE NAME STAYS A SENTENCE. The seal renders inside the
 * masthead's `<h1>` (it is passed as `titleAdornment`), and as a bare span its letters concatenated
 * onto the title: the heading announced as "Submission packagesPRO", measured. Treating it as an
 * image with a label makes it a separate node, so the name reads as two things rather than one
 * malformed word — and the visible letters stay exactly as drawn.
 */
export const WaxSeal: React.FC = () => (
  <span className="pkgb-wax" role="img" aria-label="Pro" title="Pro">PRO</span>
);
