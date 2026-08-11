/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenCommunity — the dashboard's Community tile (community-tile pack, Phase 1).
 *
 * ⚠️ PHASE 1 IS THE EMPTY STATE, AND PRE-LAUNCH THAT IS THE HONEST STATE. There is no cohort yet;
 * the aggregate collection this will read does not exist. So the tile renders one message, always,
 * and no cross-user data is fetched, derived or imagined here. Phases 2–4 add the figures behind
 * it, gated on Nick's go-ahead.
 *
 * ⚠️ AND WHEN THE FIGURES ARRIVE, THE APPRAISAL LAW LANDS WITH THEM — recorded here now because
 * this tile is where it would break first. A band of other writers' numbers invites a verdict, and
 * the verdict is what the design refuses: no adjectives (ahead, behind, on track, healthy), no
 * ranking or percentile, no colour that changes with the reader's position. The band is shown, the
 * reader's place on it is shown, and no sentence interprets either.
 */
import React from "react";
import { Users } from "lucide-react";
import { Skel } from "./OneScreenDashboard";

/**
 * ⚠️ VERBATIM COPY. No appraisal, no encouragement, no exclamation — the pack states this string
 * and the tile's whole restraint is downstream of it. "This tile stays quiet until there are" is
 * the promise the rest of the feature has to keep.
 */
export const COMMUNITY_EMPTY =
  "You're early. Community figures need writers at your stage to compare with. This tile stays quiet until there are.";

export const OneScreenCommunity: React.FC<{ loading: boolean }> = ({ loading }) => (
  <div className={`os-card os-comm${loading ? " isload" : ""}`}>
    {loading && <Skel bars={["h", "", ""]} />}
    {/* The sage band, the same construction as the activity and chart heads — a gradient, a
        hairline base, a monoline mark. Monoline because a control-and-state glyph is monoline in
        this app; the illustrated set is for objects and surfaces. */}
    <div className="os-ahead os-commhead">
      <span className="os-commic" aria-hidden="true"><Users /></span>
      <h2>Community</h2>
      {/* ⚠️ THE BETA CHIP STAYS UNTIL THE COHORTS ARE POPULATED ENOUGH THAT MOST READERS SEE REAL
          FIGURES — it is a statement about the DATA's maturity, not the code's. */}
      <span className="os-commbeta">BETA</span>
    </div>
    <div className="os-commbody">
      <p className="os-commempty">{COMMUNITY_EMPTY}</p>
      {/* ⚠️ `margin-top: auto` LIVES ON THIS FOOTER REGION, and it is how the tile FILLS a row
          whose height the TASKS card sets. The tile must never be the taller card: if it grows
          past tasks it hands dead space back, and the fix is to cut tile density rather than to
          stretch tasks. Empty in Phase 1 — it exists so the body sits to the top and the card
          still fills. */}
      <div className="os-commfoot" aria-hidden="true" />
    </div>
  </div>
);
