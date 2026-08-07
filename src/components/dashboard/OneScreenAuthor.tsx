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
      {/* ⚠️ NO WEEK NUMBER (v16 §2). The band pill says what is being QUERIED. The week count
          was a second tenure reading beside the header's own, and the two measure from
          different anchors — one of them was always going to look wrong. */}
      <div className="os-aut-band"><span className="os-pill-o os-aut-wk">{authorBandLine(manuscripts.length)}</span></div>
      <div className="os-aut-body">
        <div className="os-aut-pic">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
          {/* TODO(avatar-upload): the + opens Settings, where the profile lives — never inert */}
          <button type="button" className="os-aut-add" title="Add a photo" aria-label="Add a photo" onClick={() => onNavigate("account")}>+</button>
        </div>
        <div className="os-aut-nm">{currentUser?.name ?? ""}</div>
        {ms ? (
          <button type="button" className="os-shelf" onClick={() => onNavigate("manuscripts")}>
            {/* ⚠️ THE HOUSE MANUSCRIPT MARK ON A WHITE PLATE — not a drawn cover. The old spine
                set the title in 6.5px type, which is decoration pretending to be a book. The
                mark is honest about being an icon, and it needs no upload to look right. */}
            <span className="os-msicon"><img src={manuscriptIcon} alt="" /></span>
            <span className="os-bi">
              <span className="os-bt">{ms.title}</span>
              <span className="os-genres">
                {[ms.ageCategory, ms.genre].filter(Boolean).map((g) => <span key={String(g)} className="os-g">{g}</span>)}
              </span>
              {typeof ms.wordCount === "number" && ms.wordCount > 0 && (
                <span className="os-wc">{ms.wordCount.toLocaleString("en-GB")} words</span>
              )}
            </span>
          </button>
        ) : (
          <button type="button" className="os-shelf os-shelf-add" onClick={() => onNavigate("manuscripts", "Add a manuscript")}>
            + Add your manuscript
          </button>
        )}
      </div>
    </div>
  );
};
