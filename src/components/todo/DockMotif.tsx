/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DockMotif — the band's corner illustration (v14 close-the-gap, Phase 2; ref
 * design-refs/todo-workspace-v14.html `.motif`).
 *
 * ⚠️ ONE MOTIF PER BUCKET, AND THE BUCKET CHOOSES IT (`bandMotif`) — so a new task type inherits
 * the mark of the act it performs rather than needing one drawn for it, and the two that share a
 * mark share it because they are one act (a Close and a Fix are both tidying the record).
 *
 * ⚠️ THE FILLS ARE BAKED, NOT TOKENED — the same law the manuscript marks follow. These are
 * illustrations, not themed surfaces: a mark that changed colour with the theme would read as a
 * status signal, and the band already carries the status colour behind it.
 *
 * ⚠️ AND IT IS `aria-hidden` WITH NO TITLE. It says nothing the band's own text does not already
 * say in words; announcing it would make a screen reader read the decoration twice.
 */
import React from "react";
import { MotifKey } from "../../lib/todoHandoff";

const BURG = "#7c3a2a";
const SAGE = "#8a9e88";
const PINKF = "#f5e2da";
const CREAM = "#fdfaf5";

/** Right-aligned, vertically centred, BEHIND the text (`z-index: 1` beside the content's 2), and
 *  clipped by the band's own `overflow: hidden` — which is what makes it a corner motif rather
 *  than a floating illustration. */
const MOTIFS: Record<MotifKey, React.ReactElement> = {
  stack: (
    <svg width="92" height="76" viewBox="0 0 84 70" fill="none">
      <rect x="16" y="26" width="52" height="36" rx="3" fill={CREAM} stroke={BURG} strokeWidth="1.4" />
      <rect x="20" y="18" width="52" height="36" rx="3" fill={PINKF} stroke={BURG} strokeWidth="1.4" />
      <path d="M28 27h30M28 34h36M28 41h24" stroke={BURG} strokeWidth="1.2" strokeLinecap="round" opacity=".55" />
    </svg>
  ),
  laurel: (
    <svg width="86" height="78" viewBox="0 0 78 72" fill="none">
      <circle cx="39" cy="34" r="19" fill="#fdf3ec" stroke={BURG} strokeWidth="1.4" />
      <path d="m31 34 6 6 11-12" stroke={BURG} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 40c-3 8 1 16 8 20M62 40c3 8-1 16-8 20" stroke={SAGE} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M18 47c-2.5.4-4.6-.4-6-2M20 53c-2.5.6-4.8 0-6.5-1.6M24 58c-2.3 1-4.7.8-6.7-.4M60 47c2.5.4 4.6-.4 6-2M58 53c2.5.6 4.8 0 6.5-1.6M54 58c2.3 1 4.7.8 6.7-.4" stroke={SAGE} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  bell: (
    <svg width="78" height="72" viewBox="0 0 70 66" fill="none">
      <path d="M35 10c-9 0-14 7-14 15v9l-5 8h38l-5-8v-9c0-8-5-15-14-15Z" fill={PINKF} stroke={BURG} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M30 46c.6 3 2.4 4.6 5 4.6s4.4-1.6 5-4.6" stroke={BURG} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M13 14c2-3 4.5-5.2 7.6-6.8M57 14c-2-3-4.5-5.2-7.6-6.8" stroke="#c9a89e" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  broom: (
    <svg width="80" height="74" viewBox="0 0 72 68" fill="none">
      <path d="M52 8 32 28" stroke={BURG} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M14 56c2.5-11 9-17.5 18.5-19.5l7 7C37.5 53 31 59.5 20 62l-6-6Z" fill={PINKF} stroke={BURG} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M22 49l6 6M28 43l6 6" stroke={BURG} strokeWidth="1.1" strokeLinecap="round" opacity=".5" />
    </svg>
  ),
  note: (
    <svg width="78" height="72" viewBox="0 0 70 66" fill="none">
      <rect x="12" y="10" width="46" height="46" rx="3" fill="#fdf6ea" stroke={BURG} strokeWidth="1.4" />
      <path d="M46 56v-10h10" fill={PINKF} stroke={BURG} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M20 22h30M20 30h30M20 38h18" stroke="#c9a89e" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
};

export const DockMotif: React.FC<{ motif: MotifKey }> = ({ motif }) => (
  <span className="tdk-motif" aria-hidden>{MOTIFS[motif]}</span>
);

export default DockMotif;
