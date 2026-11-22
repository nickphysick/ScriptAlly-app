/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone style v1, Phase 2 — `#/ps-lab`: every part of the phone style sheet (design-refs/phone-style-v1/), drawn once
 * from phoneStyle.css over fixed sample words, so the PS2 lock (tests/e2e/phoneStyle.measure.ts) can read each part's
 * computed size, radius, shadow, type and padding against the tokens. A review aid, not a page: no data, no auth, no
 * writes. ⚠️ DEV ONLY — App.tsx reaches it behind `import.meta.env.MODE !== "production"`, MODE first.
 * The words here are placeholders, as the sheet's are; nothing on a real screen reads them.
 */
import React from "react";
import { QueryStatus } from "../../types";
import { PsDisc, leadBackground } from "./PsParts";
import { STAGE_COLOURS } from "../../lib/stageColours";
import "./phoneTokens.css";
import "./phoneStyle.css";

const Chev = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
);

export const PsLab: React.FC = () => (
  <div className="pa-layer ps-lab" data-ps="lab" style={{ minHeight: "100vh", background: "var(--pa-page)", paddingBottom: 32 }}>
    <div className="ps-slim" data-ps-part="slim"><span className="ps-slim-t">Today</span></div>
    <div className="ps-tabs" role="tablist" data-ps-part="tabs">
      <button type="button" role="tab" aria-selected="true" className="on" data-ps-part="tab-on">Queries</button>
      <button type="button" role="tab" aria-selected="false">Agents</button>
      <button type="button" role="tab" aria-selected="false">Activity</button>
    </div>

    <div className="ps-tiles" data-ps-part="tiles">
      <button type="button" className="ps-tile navy" data-ps-part="tile-navy"><b>22</b><span>with you</span></button>
      <button type="button" className="ps-tile" data-ps-part="tile"><b>5</b><span>with agents</span></button>
      <button type="button" className="ps-tile q" data-ps-part="tile-q"><b>43</b><span>gone quiet</span></button>
    </div>

    <h2 className="ps-hdg" data-ps-part="hdg">Your move <small>22</small></h2>
    <div className="ps-lead" data-ps-part="lead" style={{ background: leadBackground(QueryStatus.OFFER) }}>
      <div className="ps-lead-who">
        <PsDisc status={QueryStatus.OFFER} />
        <div className="ps-tx"><span className="ps-name">A sample agent</span><span className="ps-sec">Offer</span></div>
        <div className="ps-lead-n" data-ps-part="lead-n"><b>3</b><span className="ps-cap" data-ps-cap="">days</span></div>
      </div>
      <div className="ps-head" data-ps-part="head">A sample headline.</div>
      <button type="button" className="ps-cta" data-ps-part="cta">A sample button</button>
    </div>
    <div className="ps-card" data-ps-part="card">
      <button type="button" className="ps-row" data-ps-part="row">
        <PsDisc status={QueryStatus.FULL_REQUESTED} />
        <span className="ps-tx"><span className="ps-name" data-ps-part="name">A sample agent</span><span className="ps-sec" data-ps-part="sec">Full requested · 1 month ago</span></span>
        <span className="ps-time" data-ps-part="time">15w</span>
      </button>
      <button type="button" className="ps-row press" data-ps-part="row-press">
        <PsDisc status={QueryStatus.PARTIAL_REQUESTED} />
        <span className="ps-tx"><span className="ps-name">A sample agent</span><span className="ps-sec">Partial requested · 5 weeks ago</span></span>
        <span className="ps-time">9w</span>
      </button>
      <button type="button" className="ps-link" data-ps-part="link">All sample queries <Chev /></button>
    </div>

    <h2 className="ps-hdg">Birds-eye rows</h2>
    <div className="ps-card" data-ps-part="ber-card">
      <div className="ps-ber" data-ps-part="ber"><span className="ps-ber-nm">Sample</span><span className="ps-ber-bx"><i data-ps-part="ber-bar" style={{ left: "30%", width: "38%", background: STAGE_COLOURS.queried.mark }} /></span></div>
      <div className="ps-ber"><span className="ps-ber-nm">Sample</span><span className="ps-ber-bx"><i style={{ left: "22%", width: "50%", background: STAGE_COLOURS.queried.mark }} /></span></div>
    </div>

    <h2 className="ps-hdg">Links, chips, the pill</h2>
    <div className="ps-card" style={{ padding: 16 }}>
      <button type="button" className="ps-tlink" data-ps-part="tlink">A sample link</button>
      <span className="ps-chip" data-ps-part="chip">Expected 20 Oct</span>
    </div>
    <div className="ps-card" style={{ background: "var(--ps-navy)", padding: 16, marginTop: 8 }}>
      <span className="ps-need" data-ps-part="need"><i aria-hidden="true" />Sample need you</span>
    </div>

    <h2 className="ps-hdg">The snackbar, loading</h2>
    <div style={{ margin: "0 16px" }}><div className="ps-snack" data-ps-part="snack">Logged<b>Undo</b></div></div>
    <div className="ps-card" style={{ marginTop: 8 }} data-ps-part="skel-card">
      <div className="ps-skel" data-ps-part="skel"><i style={{ width: 40, height: 40 }} /><i style={{ width: 160, height: 14 }} /></div>
    </div>
  </div>
);
