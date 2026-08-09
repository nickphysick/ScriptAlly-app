/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenAuthor — the author/manuscript tile, option D "icon hero"
 * (ref design-refs/author-tile-round2.html).
 *
 * ⚠️ NO FRAME AND NO HEADER. Option A's burgundy inset frame, sage band and avatar-in-header are
 * gone: this is ONE centred column, vertically centred as a whole, with the manuscript as the
 * hero and the author as a byline beneath a short rule.
 *
 * ⚠️ THE REF IS DRAWN AT 436px SQUARE; THIS TILE IS 302. Its 136px plate and 30px padding need
 * ~387px of column here and cannot fit. The TYPE sizes are kept as specified (26px title, 16px
 * name — they are the identity); the plate and the spacing are scaled, and the plate shrinks
 * further when a title runs to two lines. Same reconciliation as option A, same reason.
 */
import React from "react";
import { Manuscript, User } from "../../types";
import { Skel } from "./OneScreenDashboard";
import manuscriptIcon from "../../assets/shell/manuscript-icon.png";

export const OneScreenAuthor: React.FC<{
  loading: boolean;
  manuscripts: Manuscript[];
  currentUser: User | null;
  activeManuscript: Manuscript | null;
  onNavigate: (tab: string, sub?: string) => void;
}> = ({ loading, manuscripts, currentUser, activeManuscript, onNavigate }) => {
  const ms = activeManuscript ?? manuscripts[0] ?? null;
  return (
    <div className={`os-card os-lift os-aut${loading ? " isload" : ""}`}>
      {loading && <Skel bars={["h", "", "grow"]} />}

      {ms ? (
        <button type="button" className="os-hero" onClick={() => onNavigate("manuscripts")}>
          <span className="os-msicon"><img src={manuscriptIcon} alt="" /></span>
          {/* ⚠️ THE WRAPPER IS LOAD-BEARING: `-webkit-line-clamp` needs `display:-webkit-box`, and
              a FLEX ITEM's display is blockified — unwrapped, the title collapses to zero height
              and simply is not on screen. Measured on option A; the ref wraps it for this reason. */}
          <span className="os-btw"><span className="os-bt">{ms.title}</span></span>
          <span className="os-genres">
            {[ms.ageCategory, ms.genre].filter(Boolean).map((g) => <span key={String(g)} className="os-g">{g}</span>)}
          </span>
          {typeof ms.wordCount === "number" && ms.wordCount > 0 && (
            <span className="os-wc">{ms.wordCount.toLocaleString("en-GB")} words</span>
          )}
        </button>
      ) : (
        <button type="button" className="os-hero os-hero-add" onClick={() => onNavigate("manuscripts", "Add a manuscript")}>
          <span className="os-msicon ghost" aria-hidden="true"><img src={manuscriptIcon} alt="" /></span>
          <span className="os-btw"><span className="os-bt">+ Add your manuscript</span></span>
        </button>
      )}

      <span className="os-authrule" aria-hidden="true" />

      {/* ⚠️ A REAL AFFORDANCE AT 52px, not decoration — the + goes where the profile lives, the
          same destination option A's badge used. Never a dead badge. */}
      <div className="os-by">
        <span className="os-aut-pic">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
          {/* TODO(avatar-upload): opens Settings, where the profile lives */}
          <button type="button" className="os-aut-add" title="Add a photo" aria-label="Add a photo" onClick={() => onNavigate("account")}>+</button>
        </span>
        <span className="os-byn">by<b>{currentUser?.name ?? ""}</b></span>
      </div>
    </div>
  );
};
