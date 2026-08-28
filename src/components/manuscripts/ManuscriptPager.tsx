/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE SHELF PAGER AND THE DEPARTURE — masthead furniture ════════════════════════════════════
 *
 * ⚠️ TWO CONTROLS, TWO PLACES, AND THE SPLIT IS THE POINT. `‹ All manuscripts` LEAVES the book and
 * sits in the masthead's lead row, above the title. The pager ACTS ON the shelf you are inside and
 * sits with the book's other actions. Putting a departure among the operations is how a reader
 * comes to press one meaning and get the other.
 */
import React from "react";

/** ⚠️ ONE HANDLER, ONE CONSTANT. See `ManuscriptBackLink`'s note — this file states no path. */
export const ManuscriptBackLink: React.FC<{ onLeave: () => void }> = ({ onLeave }) => (
  <button type="button" className="msp-backlink" onClick={onLeave}>
    <span aria-hidden="true">‹</span> All manuscripts
  </button>
);

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
