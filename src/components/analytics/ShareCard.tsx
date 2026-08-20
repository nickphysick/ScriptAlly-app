/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The share card — the journey, as one thing a writer might want to keep.
 *
 * ⚠️ IT STATES THE SAME FIGURES AS THE PANEL IT OPENS FROM, from the same functions. `funnelStages`
 * and `funnelHeadline` are imported rather than recomputed, so the card and the panel above it
 * cannot disagree about the page they are both describing — including the sample guard, which
 * applies here exactly as it does there.
 *
 * ⚠️ AND IT SAYS NOTHING THE PAGE DOES NOT. No "great progress", no comparison to anyone else's
 * numbers. It is the writer's own four figures, their manuscript's title and a date.
 *
 * ⚠️ THE DIALOG IS A REAL ONE: `role="dialog"`, `aria-modal`, labelled by its own heading, closed
 * by Escape and by a click on the backdrop, with focus moved into it on open and returned to the
 * Share button on close. A div with a high z-index is not a dialog, and a keyboard user left
 * behind the scrim is stuck.
 */
import React from "react";
import { StatusDot } from "../StatusDot";
import { AnalyticsRow, funnelStages } from "../../lib/analytics";
import { funnelHeadline } from "./JourneyFunnel";
import { shortDateYear } from "./chartPlumbing";

export const ShareCard: React.FC<{
  rows: AnalyticsRow[];
  manuscriptTitle: string;
  nowMs: number;
  onClose: () => void;
}> = ({ rows, manuscriptTitle, nowMs, onClose }) => {
  const stages = funnelStages(rows);
  const cardRef = React.useRef<HTMLDivElement>(null);

  /* ⚠️ ESCAPE IS HANDLED HERE AND NOT SWALLOWED ELSEWHERE. The card is the topmost thing on the
     page while it is open, so it is the right owner of the key; it stops propagation so a page
     behind it cannot also act on the same press. */
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey, true);
    cardRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  return (
    <div className="an-shareov" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        className="an-sharecard"
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="an-share-title"
      >
        <h3 id="an-share-title">{manuscriptTitle} — the journey so far</h3>
        <div className="an-ssub">{funnelHeadline(rows)}</div>

        <div className="an-sfunnel">
          {stages.map((s) => (
            <div className="an-sfs" key={s.key}>
              <StatusDot status={s.dotStatus} overrideSize={30} decorative />
              <div className="an-sn">{s.count}</div>
              <div className="an-sl">{s.name}</div>
            </div>
          ))}
        </div>

        <div className="an-swm">
          <span>Tracked with ScriptAlly</span>
          <span>{shortDateYear(nowMs)}</span>
        </div>

        <div className="an-sactions">
          {/* ⚠️ THE PNG EXPORT IS NOT BUILT AND THE BUTTON SAYS SO rather than producing nothing.
              Rasterising this card needs either a canvas library or a server-side renderer, and
              adding a dependency was out of scope for this build.
              TODO(analytics-share-png): export the card as a PNG. */}
          <button type="button" className="an-sbtn" disabled title="Downloading the card is not built yet">
            Download PNG
          </button>
          <button type="button" className="an-sbtn an-sbtn--go" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};
