/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v138 §A — THE STAGE GLYPHS, drawn large: StatusDot's own shapes (open ring, half, full, bullseye,
 * dash) in one ink, on a 40-unit box. A your-move stage carries a dashed outer ring (r 18.6, stroke 1.5, dash
 * 2.6 3.2), which tells requested from sent in black alone.
 *
 * ⚠️ NOT A StatusDot. StatusDot draws a query's status at row size and stays the only drawer of a status in a
 *    row; these are the header's stage marks, at 44px and 20px, where the dashed ring is a fact about the STAGE
 *    (your move), and `StatusDot` is on the do-not-touch list.
 */
import React from "react";
import type { GlyphKey } from "../../../lib/qc138";

const Dashed = () => <circle cx="20" cy="20" r="18.6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.6 3.2" data-qc138="dashed" />;
const Ring = () => <circle cx="20" cy="20" r="13" fill="none" stroke="currentColor" strokeWidth="2.4" />;

export const StageGlyph: React.FC<{ k: GlyphKey | "key"; className?: string }> = ({ k, className }) => (
  <svg className={className} viewBox="0 0 40 40" aria-hidden="true" data-qc138="glyph" data-k={k}>
    {k === "q" ? <Ring /> : null}
    {k === "pr" ? <><Dashed /><Ring /><path d="M20 7A13 13 0 0 0 20 33Z" fill="currentColor" /></> : null}
    {k === "ps" ? <><Ring /><path d="M20 7A13 13 0 0 0 20 33Z" fill="currentColor" /></> : null}
    {k === "fr" ? <><Dashed /><circle cx="20" cy="20" r="14.2" fill="currentColor" /></> : null}
    {k === "fs" ? <circle cx="20" cy="20" r="14.2" fill="currentColor" /> : null}
    {k === "of" ? <><Dashed /><Ring /><circle cx="20" cy="20" r="6" fill="currentColor" /></> : null}
    {k === "cl" ? <><Ring /><path d="M13.5 20h13" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></> : null}
    {k === "key" ? <><Dashed /><Ring /></> : null}
  </svg>
);
