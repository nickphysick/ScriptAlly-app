/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenAuthor — the author/manuscript tile (v16 §Phase 1–2; ref design-refs/dashboard-v16.html).
 *
 * ⚠️ IT LIVES IN THE MAIN COLUMN NOW, beside the chart in the fixed 302px row — not in the rail.
 * The rail's job narrowed to goals and the activity feed, and the tile went where the eye starts.
 */
import React from "react";
import { Manuscript, User } from "../../types";
import { Skel } from "./OneScreenDashboard";
import manuscriptIcon from "../../assets/shell/manuscript-icon.png";

/** The band pill states what is being queried — never a week number (v16 §2). */
export const authorBandLine = (n: number): string =>
  n === 0 ? "No manuscript yet" : n === 1 ? "Querying one manuscript" : `Querying ${n} manuscripts`;

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
      {/* ⚠️ A REAL CLIPPING CONTAINER, not an overlay ::before border (MountCard canon). The
          parchment rim is the OUTER card's 6px padding; this child carries the burgundy line and
          the `overflow:hidden` that makes the sage band meet it edge to edge. */}
      <div className="os-aut-frame">
      {/* ⚠️ NO WEEK NUMBER (v16 §2). The band pill says what is being QUERIED. The week count
          was a second tenure reading beside the header's own, and the two measure from
          different anchors — one of them was always going to look wrong. */}
        {/* the band holds the AUTHOR — portrait, name, and what they are querying */}
        <div className="os-aut-band">
          <span className="os-aut-pic">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            {/* TODO(avatar-upload): the + opens Settings, where the profile lives — never inert */}
            <button type="button" className="os-aut-add" title="Add a photo" aria-label="Add a photo" onClick={() => onNavigate("account")}>+</button>
          </span>
          <span className="os-aut-who">
            <span className="os-aut-nm">{currentUser?.name ?? ""}</span>
            {/* ⚠️ NO WEEK NUMBER (v16 §2) — a second tenure reading beside the header's own, and
                the two measure from different anchors. */}
            <span className="os-aut-sub">{authorBandLine(manuscripts.length)}</span>
          </span>
        </div>
      <div className="os-aut-body">
        {ms ? (
          /* ⚠️ CENTRED AND EVENLY GAPPED, which is the whole fix: the body is a centred column
              with `justify-content:center`, so at ANY tile height the content sits together
              rather than leaving a hole in the middle. */
          <button type="button" className="os-shelf" onClick={() => onNavigate("manuscripts")}>
            <span className="os-msicon"><img src={manuscriptIcon} alt="" /></span>
            {/* ⚠️ THE WRAPPER IS LOAD-BEARING. `-webkit-line-clamp` needs `display:-webkit-box`,
                and a FLEX ITEM's display is blockified — as a direct child of the shelf the title
                computed to `flow-root`, the clamp died and it collapsed to ZERO HEIGHT (measured:
                the title simply was not on screen). The ref wraps it for the same reason. */}
            <span className="os-btw"><span className="os-bt">{ms.title}</span></span>
            <span className="os-genres">
              {[ms.ageCategory, ms.genre].filter(Boolean).map((g) => <span key={String(g)} className="os-g">{g}</span>)}
            </span>
            {typeof ms.wordCount === "number" && ms.wordCount > 0 && (
              <span className="os-wc">{ms.wordCount.toLocaleString("en-GB")} words</span>
            )}
          </button>
        ) : (
          <button type="button" className="os-shelf os-shelf-add" onClick={() => onNavigate("manuscripts", "Add a manuscript")}>
            <span className="os-msicon ghost" aria-hidden="true"><img src={manuscriptIcon} alt="" /></span>
            <span className="os-btw"><span className="os-bt">+ Add your manuscript</span></span>
          </button>
        )}
      </div>
      </div>
    </div>
  );
};
