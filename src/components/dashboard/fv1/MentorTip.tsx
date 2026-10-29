/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD FIRST VISIT v1 — THE MENTOR SPEAKING (Part A3; ref pane 01, 03).
 *
 * Under the set-up card: the Mentor standing (an art slot, a placeholder until the drawing is supplied) and,
 * beside him, a white speech bubble whose tail points at him. "Top tip" with "{i} of {n}", the tip, and ‹ ›.
 *
 * ⚠️ THE TIPS ARE `DASH_TIPS` (lib/dashTips) AND NOTHING ELSE — editing one never touches this file.
 * ⚠️ THE BUBBLE CLAMPS TO FOUR LINES ONLY WHERE THE COLUMN IS SHORT: the page never scrolls, so on a short
 * window (the `.fv1-tipt` clamp in fv1.css) the tip is cut at four lines and "More" opens it in full, in
 * place. Anywhere it fits there is no clamp and no "More".
 */
import React, { useLayoutEffect, useRef, useState } from "react";
import { DASH_TIPS } from "../../../lib/dashTips";
import { ArtSlot } from "../../todo/ArtSlot";

export interface MentorTipProps {
  loading: boolean;
  index: number;
  onStep: (d: number) => void;
}

export const MentorTip: React.FC<MentorTipProps> = ({ loading, index, onStep }) => {
  const n = DASH_TIPS.length;
  const tip = DASH_TIPS[Math.min(Math.max(0, index), n - 1)];
  const textRef = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [cut, setCut] = useState(false);
  /* a new tip starts clamped again */
  useLayoutEffect(() => { setOpen(false); }, [index]);
  /* "More" only when the clamp actually hides something: the box's scroll height past its own height */
  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return undefined;
    const measure = () => setCut(!open && el.scrollHeight - el.clientHeight > 1);
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [index, open, loading]);
  return (
    <div className={`fv1-mentor${loading ? " is-loading" : ""}`} data-fv1="mentor" data-loading={loading ? "1" : "0"}>
      <ArtSlot name="dash-mentor-standing" className="fv1-mentorart" />
      <div className="fv1-bub" data-fv1="tip" role="group" aria-label="Top tip" aria-roledescription="tip">
        <div className="fv1-bubt">
          <p className="fv1-th"><span className="fv1-thl">Top tip</span> <span className="fv1-tipn" data-fv1="tip-pos">{index + 1} of {n}</span></p>
          <p ref={textRef} className={`fv1-tipt${open ? " is-open" : ""}`} data-fv1="tip-text" data-tip={index} aria-live="polite">
            <b>{tip.lead}</b> {tip.rest}
          </p>
          {(cut || open) && (
            <button type="button" className="fv1-more" data-fv1="tip-more" aria-expanded={open} onClick={() => setOpen((o) => !o)}>{open ? "Less" : "More"}</button>
          )}
        </div>
        <div className="fv1-arw">
          <button type="button" className="fv1-tipb" aria-label="Previous tip" data-fv1="tip-prev" disabled={loading} onClick={() => onStep(-1)}>‹</button>
          <button type="button" className="fv1-tipb" aria-label="Next tip" data-fv1="tip-next" disabled={loading} onClick={() => onStep(1)}>›</button>
        </div>
      </div>
    </div>
  );
};
