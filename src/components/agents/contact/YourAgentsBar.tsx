/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE "YOUR AGENTS" BAR (Contact list v14 §3; ref design-refs/contact-list-v14.html `.lban` + `.ctlrow`): the ink
 * head of the workspace panel. Row 1 — the hawk at the card-index box in its art slot, rising above the bar's top
 * edge; "Your agents"; "Showing n of N for {book}"; and two count pills. Row 2 — the list's controls, on white.
 *
 * ⚠️ EACH PILL IS A BUTTON THAT SETS THE LIST'S FILTERS TO EXACTLY ITS OWN SET (§3, lock 6): its number is the
 * count of the rows it produces, because the page derives both from one predicate. The colours are the pack's —
 * blush for "waiting on you", powder blue for "ready to query".
 *
 * ⚠️ THE INK IS #2a3a52 (ruling Q2), v131's band colour, not the prompt's #1f2b3a.
 */
import React from "react";

export interface YourAgentsBarProps {
  shown: number;
  total: number;
  book: string | null;
  you: number;
  ready: number;
  youOn: boolean;
  readyOn: boolean;
  onYou: () => void;
  onReady: () => void;
  art: { src: string; width: number; height: number };
  /** row 2 — the list's controls */
  controls: React.ReactNode;
  /** the "Showing n" figure, as the page renders it (Phase 6 counts it to its new value) */
  shownNode?: React.ReactNode;
}

export const YourAgentsBar: React.FC<YourAgentsBarProps> = ({ shown, total, book, you, ready, youOn, readyOn, onYou, onReady, art, controls, shownNode }) => (
  <div className="cl14-bar" data-cl14="bar">
    <div className="cl14-bar-r1">
      <span className="cl14-art" data-cl14="art" aria-hidden="true">
        <img src={art.src} width={art.width} height={art.height} alt="" />
      </span>
      <div className="cl14-bar-t">
        <h2>Your agents</h2>
        <span className="cl14-bar-k" data-cl14="showing">
          Showing <b data-cl14="shown">{shownNode ?? shown}</b> of <b>{total}</b>{book ? <> for <b>{book}</b></> : null}
        </span>
      </div>
      <span className="cl14-pills">
        <button type="button" className="cl14-pill cl14-pill--you" data-cl14="pill-you" aria-pressed={youOn} onClick={onYou}>
          <b>{you}</b> waiting on you
        </button>
        <button type="button" className="cl14-pill cl14-pill--ready" data-cl14="pill-ready" aria-pressed={readyOn} onClick={onReady}>
          <b>{ready}</b> ready to query
        </button>
      </span>
    </div>
    <div className="cl14-bar-r2">{controls}</div>
  </div>
);
