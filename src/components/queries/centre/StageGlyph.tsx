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
import type { StageKey } from "../../../lib/qcBandArt";

/* v138.3 §B — the peek's markers draw the ring to the prompt's own values (r 18.2, stroke 1.7, dash 2.6 3.1); the
   header keeps v138 A's as built (r 18.6, stroke 1.5, dash 2.6 3.2) */
const RINGS = { header: { r: 18.6, w: 1.5, dash: "2.6 3.2" }, peek: { r: 18.2, w: 1.7, dash: "2.6 3.1" } } as const;
const Dashed: React.FC<{ ring: keyof typeof RINGS }> = ({ ring }) => (
  <circle cx="20" cy="20" r={RINGS[ring].r} fill="none" stroke="currentColor" strokeWidth={RINGS[ring].w} strokeDasharray={RINGS[ring].dash} data-qc138="dashed" />
);
const Ring = () => <circle cx="20" cy="20" r="13" fill="none" stroke="currentColor" strokeWidth="2.4" />;

/**
 * `dashed` defaults to the stage's own (the header: requested and offer stages); the peek passes it per EVENT, since a
 * stage glyph can hold a status that is not the writer's move (Signed counts under Offer). `ring` picks the dashed
 * ring's dimensions.
 */
export const StageGlyph: React.FC<{ k: StageKey | "key"; className?: string; dashed?: boolean; ring?: keyof typeof RINGS }> = ({ k, className, dashed, ring = "header" }) => {
  const d = dashed ?? (k === "pr" || k === "fr" || k === "rr" || k === "of" || k === "key");
  /* v141 §D — No response is its own drawing (the mock's dashed clock), on its own 24-unit box */
  if (k === "nr") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" data-qc138="glyph" data-k={k}>
        <circle cx="12" cy="12" r="8.5" strokeDasharray="2.6 2.6" /><path d="M12 7.5v5l3 2" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 40 40" aria-hidden="true" data-qc138="glyph" data-k={k}>
      {d ? <Dashed ring={ring} /> : null}
      {k === "q" || k === "key" ? <Ring /> : null}
      {k === "pr" ? <><Ring /><path d="M20 7A13 13 0 0 0 20 33Z" fill="currentColor" /></> : null}
      {k === "ps" ? <><Ring /><path d="M20 7A13 13 0 0 0 20 33Z" fill="currentColor" /></> : null}
      {k === "fr" ? <circle cx="20" cy="20" r="14.2" fill="currentColor" /> : null}
      {k === "fs" ? <circle cx="20" cy="20" r="14.2" fill="currentColor" /> : null}
      {k === "of" ? <><Ring /><circle cx="20" cy="20" r="6" fill="currentColor" /></> : null}
      {k === "cl" ? <><Ring /><path d="M13.5 20h13" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></> : null}
      {/* v141 §D — four statuses that shared a stage's glyph get their own, in the same grammar (lib/qcBandArt) */}
      {k === "rr" || k === "rs" ? <path fillRule="evenodd" fill="currentColor" d="M5.8 20a14.2 14.2 0 1 0 28.4 0a14.2 14.2 0 1 0 -28.4 0ZM12.7 20a7.3 7.3 0 1 0 14.6 0a7.3 7.3 0 1 0 -14.6 0ZM14.9 20a5.1 5.1 0 1 0 10.2 0a5.1 5.1 0 1 0 -10.2 0Z" /> : null}
      {k === "sg" ? <><Ring /><circle cx="20" cy="20" r="6" fill="currentColor" /></> : null}
      {k === "wd" ? <><Ring /><path d="M15.2 24.8l9.6-9.6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></> : null}
    </svg>
  );
};
