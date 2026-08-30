/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE SHELF PAGER — bar furniture ══════════════════════════════════════════════════════════
 *
 * ⚠️ IT LIVES IN THE RECORD BAR, at the far end, opposite the departure — see `record.within` on
 * `WorkspacePageGrid`. The band then reads as one sentence about position: leave the set, which one
 * you are in, move along it.
 *
 * ⚠️ AND `ManuscriptBackLink` IS DELETED FROM THIS FILE, along with the note that used to justify
 * the split. It said the departure belonged in the masthead's lead row and the pager with the
 * book's actions, because putting a departure among operations is how a reader presses one meaning
 * and gets the other. That warning was written for a masthead a record no longer has — but the risk
 * it names survives the move, so the guard moved with it: the two controls sit at opposite ends,
 * and the one that LEAVES is an arrow carrying a word while the one that MOVES is a bare chevron
 * pair around a readout. `.wpg-barback` is the departure now, shared with Query Centre, and a
 * second unrendered implementation of it in this folder is the shape this repo keeps paying for.
 */
import React from "react";

export interface ManuscriptPagerProps {
  /** `1 / 3`, already composed — the shelf's own order, never a second sequence. */
  position: string;
  /** Null at either end: the ends are ends, and the control renders disabled rather than hidden. */
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
}

export const ManuscriptPager: React.FC<ManuscriptPagerProps> = ({ position, onPrev, onNext }) => (
  <div className="msp-pager">
    {/* ⚠️ RENDERED WHEN THEY CANNOT BE USED — dimmed and disabled at one manuscript, so the
        affordance is visible before a second book exists. And NO WRAP-AROUND: wrapping makes the
        two ends indistinguishable from the middle, so a reader cannot tell from the control whether
        they have reached the end of their own shelf. */}
    <button type="button" className="msp-pagerbtn" onClick={() => onPrev?.()}
            disabled={!onPrev} aria-label="Previous manuscript">‹</button>
    {/* ⚠️ THE READOUT IS THE REASON THE PAGER MOVED, not a decoration beside it: `1 / 3` is the
        shelf position the band never stated. */}
    <span className="msp-pagerpos">{position}</span>
    <button type="button" className="msp-pagerbtn" onClick={() => onNext?.()}
            disabled={!onNext} aria-label="Next manuscript">›</button>
  </div>
);
