/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * IMPORT'S DOORS ON A PHONE (Phone app v2, Part 8B; ref overlays.js `PAGES.import`). Only the doors are the phone's:
 * every press is ImportPage's own handler, so `ImportFlow` keeps every screen and rule (the book step, the review gate,
 * the spent Smart Import's own words). Smart import, "Match your own columns" and "Log one by hand". The template's
 * group and its door in the match sheet went on 14 Nov (overnight fixes v1): the template is no longer a way in.
 */
import React, { useState } from "react";
import { MobileSheet } from "../../shell/MobileSheet";
import { TILE_MATCH, TILE_SMART } from "../../../lib/importPage";
import { PI } from "../phoneIcons";
import { PHONE_ART } from "../phoneArt";
import { PhoneArt } from "../PhoneArtSpot";
import "./pagesPhone.css";

const Chev = () => <span className="pa-chev" aria-hidden="true">{PI.chev}</span>;

export const ImportDoorsPhone: React.FC<{
  lede: string; smartAllowed: boolean; smartFact: string;
  onSmart: () => void; onMatch: () => void; onByHand: () => void; footnote: string;
}> = (p) => {
  /* Phone last screens v1, 6B: "Match your own columns" opens this sheet on a phone instead of the
     matcher (which needs a wide screen). Its door is the page's own Smart import handler (the template's door went,
     14 Nov); the matcher and the desktop tile are unchanged. */
  const [matchOpen, setMatchOpen] = useState(false);
  const via = (go: () => void) => () => { setMatchOpen(false); go(); };
  return (<>
  <div className="pa-pg pa-impg" data-pa="import">
    <div className="pa-pgbody">
      <p className="pa-implede" data-pa="imp-lede">{p.lede}</p>
      <div className="pa-card pa-impsmart" data-pa="imp-smart">
        <PhoneArt art={PHONE_ART.importSmart} size={120} className="pa-impart" />
        <b>{TILE_SMART.title.replace(/\.$/, "")}</b>
        <p className="pa-sub">{TILE_SMART.text}</p>
        <button type="button" className="pa-btn pri blk" data-pa="imp-smart-go" disabled={!p.smartAllowed} onClick={p.onSmart}>{PI.upload}{TILE_SMART.action}</button>
        <p className="pa-sub pa-impfact" data-pa="imp-smart-fact">{p.smartFact}</p>
      </div>
      <div className="pa-gl">Other ways in</div>
      <div className="pa-group">
        <button type="button" className="pa-li" data-pa="imp-match" onClick={() => setMatchOpen(true)}><span className="pa-ico">{PI.sliders}</span><span className="pa-lt">{TILE_MATCH.title.replace(/\.$/, "")}<span className="pa-sub">{TILE_MATCH.fact}</span></span><Chev /></button>
        <button type="button" className="pa-li" data-pa="imp-byhand" onClick={p.onByHand}><span className="pa-ico">{PI.plus}</span><span className="pa-lt">Log one by hand</span><Chev /></button>
      </div>
      <p className="pa-sub pa-impfoot">{p.footnote}</p>
    </div>
  </div>
  <MobileSheet open={matchOpen} onClose={() => setMatchOpen(false)} ariaLabel={TILE_MATCH.title.replace(/\.$/, "")} pa={{ height: "auto", drag: false }}>
    <div className="pa-impmatch" data-pa="imp-match-sheet">
      <div className="pa-card pa-imm-card">
        <span className="pa-imm-ph" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 18l5-6 4 4 3-3 4 5" /><circle cx="16" cy="8" r="2" /></svg></span>
        <h2 className="pa-imm-h">Matching columns works best on a computer.</h2>
        <p className="pa-sub">You line up every column of your sheet with what it holds, which needs a wide screen. On your phone, this gets the same result:</p>
      </div>
      <div className="pa-card pa-imm-door">
        <b className="pa-imm-t">{TILE_SMART.title.replace(/\.$/, "")}</b>
        <p className="pa-sub">Any layout. QueryHawk reads it and you check it.</p>
        <button type="button" className="pa-btn pri blk" data-pa="imp-match-smart" disabled={!p.smartAllowed} onClick={via(p.onSmart)}>Import a spreadsheet</button>
      </div>
    </div>
  </MobileSheet>
  </>);
};
