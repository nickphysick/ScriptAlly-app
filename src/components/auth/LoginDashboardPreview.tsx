/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from "react";
import { StatusDot } from "../StatusDot";

// Static, presentational preview of the dashboard shown in the auth screen's right panel.
// NO Firestore reads, NO auth, placeholder data only. The status glyphs use the real StatusDot
// component (not bespoke SVGs). Kept a clean component boundary so a live preview can replace it.
type Row = { name: string; agency: string; status: string; pill: string; tone: "in" | "out" | "offer" };

const ROWS: Row[] = [
  { name: "Margaret Holloway", agency: "Pemberton Literary", status: "Full Requested", pill: "Full requested", tone: "in" },
  { name: "James Ellis", agency: "Carrow & Vine", status: "Queried", pill: "Queried", tone: "out" },
  { name: "Nadia Okafor", agency: "Birch Literary", status: "Revise & Resubmit", pill: "R&R", tone: "in" },
  { name: "Tom Reeves", agency: "Halcyon Agency", status: "Offer", pill: "Offer ✦", tone: "offer" },
];

export const LoginDashboardPreview: React.FC = () => (
  <div className="browser">
    <div className="browser-bar">
      <div className="tl"><i /><i /><i /></div>
      <div className="addr">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
        app.scriptally.ink
      </div>
    </div>
    <div className="dash">
      <div className="dash-top">
        <div className="dash-brand">
          <div className="dchip">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 5c-4 1-9 4-12 9-1 1.5-1.8 3.4-2 5" />
              <path d="M20 5c1 5-2 11-8 13" />
            </svg>
          </div>
          <span className="dword">ScriptAlly</span>
        </div>
        <div className="dash-av">LS</div>
      </div>
      <div className="dstats">
        <div className="dstat"><div className="n">7</div><div className="l">Active</div></div>
        <div className="dstat"><div className="n">4</div><div className="l">Replies</div></div>
        <div className="dstat accent"><div className="n">41%</div><div className="l">Request rate</div></div>
      </div>
      <div className="dpanel">
        <div className="dpanel-h">The story so far</div>
        {ROWS.map((r) => (
          <div className="drow" key={r.name}>
            <span className="sd"><StatusDot status={r.status} overrideSize={20} /></span>
            <div className="nm"><b>{r.name}</b><span>{r.agency}</span></div>
            <span className={`dpill ${r.tone}`}>{r.pill}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);
