/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comps v26, Part B: "What's a comparable title?" A card at the top of the ADD form: open for a
 * writer with no comps on this manuscript yet, folded into one link otherwise. Never in edit mode.
 * Hiding or opening it is for this visit only; nothing is stored.
 *
 * The drawing is the dashboard's own Mentor (`DASH_ART.mentorLooking`), an asset the app already has.
 */
import React from "react";
import { DASH_ART } from "../../../lib/dashArt";
import "./compExplainer.css";

export const EXPLAIN_POINTS: { lead: string; text: string }[] = [
  { lead: "Recent.", text: "Out in the last few years, so it reflects today’s market." },
  { lead: "A fair match.", text: "Similar readers and tone, not just a similar plot." },
  { lead: "Not a household name.", text: "A mega-bestseller says little about your book. A steady seller says more." },
];

/** "What's a comparable title?" Open for a writer with no comps yet; one link otherwise. Never stored. */
export const CompExplainer: React.FC<{ open: boolean; first: boolean; onToggle: (open: boolean) => void }> = ({ open, first, onToggle }) => {
  const art = DASH_ART.mentorLooking;
  if (!open) {
    return (
      <div className="cf-axc" data-cf="explain-link">
        <button type="button" onClick={() => onToggle(true)}><i aria-hidden="true">?</i>What makes a good comp?</button>
      </div>
    );
  }
  return (
    <section className="cf-ax" data-cf="explain" aria-label="What’s a comparable title?">
      <span className="cf-ax-art" aria-hidden="true"><img src={`${art.src}?v=${art.version}`} width={art.width} height={art.height} alt="" /></span>
      <div>
        <p className="cf-ax-h" data-cf="explain-heading">What’s a comparable title?</p>
        <p className="cf-ax-p">A recent book, film or show that shares something real with yours: its readers, its feel, its world. Agents use comps to picture where your book would sit in a shop, and who would buy it.</p>
        <ul>
          {EXPLAIN_POINTS.map((p, i) => (
            <li key={p.lead} data-cf="explain-point"><i aria-hidden="true">{i + 1}</i><span><b>{p.lead}</b> {p.text}</span></li>
          ))}
        </ul>
      </div>
      <div className="cf-axf">
        <span>Two or three in a query letter is usual. Keep more on your shelf to choose from.</span>
        <button type="button" data-cf="explain-hide" onClick={() => onToggle(false)}>{first ? "Got it, hide this" : "Hide"}</button>
      </div>
    </section>
  );
};
