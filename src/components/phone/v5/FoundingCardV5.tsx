/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v5 — THE FOUNDING WRITER CARD, moved off Today's Activity tab (Phase C) onto Profile (ProfileV5, Phase G).
 * Unchanged from v4's Today: the rank road (lib/foundingStats, lib/foundingBand), the next step and the three compose
 * buttons. Phase G: each opens the phone's feedback sheet (FeedbackSheetV5) on its kind, "About: Profile". Founding
 * writers only (a waitlist place on file).
 */
import React from "react";
import { cardTier, useFoundingStats } from "../../../lib/foundingStats";
import { roadFill } from "../../../lib/foundingBand";
import { COMPOSE, RANK_NAMES, nextStep } from "../../../lib/foundingCard";
import { feedbackAbout } from "../../../lib/phoneV5";
import { openFeedbackSheet } from "./FeedbackSheetV5";
import { RANK_HEADS } from "../v4/V4Parts";
import "../v4/phoneV4.css";

export const FoundingCardV5: React.FC<{ uid: string | null }> = ({ uid }) => {
  const { loading, stats } = useFoundingStats(uid);
  if (loading || stats.foundingNo == null) return null;
  const tier = cardTier(stats);
  const fill = roadFill(tier, stats.contributions);
  return (
    <div className="pa4-found" data-pa4="founding" data-pa5="founding" data-tier={tier}>
      <div className="pa4-s" style={{ color: "var(--pa-body)", marginBottom: 8 }}>Founding writer</div>
      <h2 className="pa4-h" style={{ marginBottom: 24 }}>Your feedback shapes QueryHawk</h2>
      <div className="pa4-road" aria-label={`You’re at ${RANK_NAMES[tier]}`}>
        <i />
        {fill != null ? <i className="f" style={{ width: `calc((100% - 48px) * ${fill / 4})` }} /> : null}
        {RANK_HEADS.map((src, k) => (
          <div key={src} className={k + 1 === tier ? "on" : k + 1 < tier ? "got" : ""}>
            <img src={src} alt="" />
            <div className="pa4-s" style={{ marginTop: 8, whiteSpace: "nowrap", ...(k + 1 === tier ? { color: "var(--pa-ink)", fontWeight: 600 } : {}) }}>{k + 1 === tier || (tier < 1 && k === 0) ? RANK_NAMES[k + 1] : ""}</div>
          </div>
        ))}
      </div>
      <p className="pa4-b pa4-body" style={{ marginBottom: 16 }}>{nextStep(stats)}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {COMPOSE.map((x) => <button key={x.key} type="button" className="pa4-fb" data-pa4="fb" data-k={x.key} onClick={() => openFeedbackSheet(feedbackAbout("/you"), x.key)}>{x.label}</button>)}
      </div>
    </div>
  );
};
