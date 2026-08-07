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
import { Manuscript, Query, User } from "../../types";
import { weekOfQuerying } from "../../lib/dashboardStats";
import { Skel } from "./OneScreenDashboard";

export const OneScreenAuthor: React.FC<{
  loading: boolean;
  queries: Query[];
  manuscripts: Manuscript[];
  currentUser: User | null;
  activeManuscript: Manuscript | null;
  onNavigate: (tab: string, sub?: string) => void;
  now: Date;
}> = ({ loading, queries, manuscripts, currentUser, activeManuscript, onNavigate, now }) => {
  const ms = activeManuscript ?? manuscripts[0] ?? null;
  return (
    <div className={`os-card os-lift os-aut${loading ? " isload" : ""}`}>
      {loading && <Skel bars={["h", "", "grow"]} />}
      {/* §9: before the first send the band says "Day one" — a week number would be a lie */}
      <div className="os-aut-band"><span className="os-pill-o os-aut-wk">{queries.some((x) => x.dateSent) ? `${weekOfQuerying(queries, now)} of querying` : "Day one"}</span></div>
      <div className="os-aut-body">
        <div className="os-aut-pic">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
          {/* TODO(avatar-upload): the + opens Settings, where the profile lives — never inert */}
          <button type="button" className="os-aut-add" title="Add a photo" aria-label="Add a photo" onClick={() => onNavigate("account")}>+</button>
        </div>
        <div className="os-aut-nm">{currentUser?.name ?? ""}</div>
        <div className="os-aut-sub">
          {manuscripts.length === 0
            ? "No manuscript added yet"
            : `Querying ${manuscripts.length === 1 ? "one manuscript" : `${manuscripts.length} manuscripts`}`}
        </div>
        {ms ? (
          <button type="button" className="os-shelf" onClick={() => onNavigate("manuscripts")}>
            {/* TODO(cover-upload): renders the real cover once uploads land; the styled spine is
                the fallback, not a placeholder for a missing feature */}
            <span className="os-cover"><span className="os-ct">{ms.title}</span></span>
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
