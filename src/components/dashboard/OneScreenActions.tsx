/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenActions — the quick-actions card (v33, 18 Sep; ref design-refs/dashboard-v33.html).
 *
 * No header at all since the v34 mockup (19 Sep) — the card is named for assistive tech only. One tile — "Log a query", with the quill — fills
 * what the two lines beneath it leave; "Record a response" and "Add an agent" are plain rows with a
 * hairline between them. Every control is an existing capture (`lib/dashActions`).
 */
import React from "react";
import { invokeCapture } from "../shell/railNav";
import { DASH_ART, artUrl } from "../../lib/dashArt";
import { QUICK_ACTIONS } from "../../lib/dashActions";
import { OneScreenPanel } from "./OneScreenPanel";

/** The ref's 16px arrow — `currentColor`, so it is ink on the tile and ink on the rows. */
const Arrow: React.FC = () => (
  <svg className="os-qaar" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const OneScreenActions: React.FC<{
  loading: boolean;
  onNavigate: (tab: string, sub?: string) => void;
}> = ({ loading, onNavigate }) => {
  const main = QUICK_ACTIONS.filter((a) => a.rank === "main");
  const minor = QUICK_ACTIONS.filter((a) => a.rank === "minor");
  return (
    /* ⚠️ NO HEADER (the v34 mockup, 19 Sep). The eyebrow and its sand band are gone; the tile starts at
       the top of the frame. The card has no visible name now, so it carries an accessible one. */
    <OneScreenPanel
      variant="os-qa" probe="quick-actions" loading={loading} skel={["grow", "", ""]}
      label="Quick actions"
    >
      {main.map((a) => (
        <button
          key={a.key} type="button" className="os-qahero" data-action={a.key} data-probe="qa-hero"
          onClick={() => invokeCapture(a.capture, onNavigate)}
        >
          {/* ⚠️ CENTRED, 16px DOWN, AND `calc(100% - 78px)` TALL — sized off the TILE, so the quill
              grows and shrinks with the row and never reaches the label beneath it. */}
          <img
            className="os-qaquill" src={artUrl(DASH_ART.quill)} width={DASH_ART.quill.width} height={DASH_ART.quill.height}
            alt="" decoding="async" data-probe="qa-quill"
          />
          <b className="os-qaherolab">{a.label}</b>
          <Arrow />
        </button>
      ))}
      <div className="os-qaminor">
        {minor.map((a) => (
          <button
            key={a.key} type="button" className="os-qarow" data-action={a.key}
            onClick={() => invokeCapture(a.capture, onNavigate)}
          >
            <span className="os-qarowlab">{a.label}</span>
            <Arrow />
          </button>
        ))}
      </div>
    </OneScreenPanel>
  );
};
