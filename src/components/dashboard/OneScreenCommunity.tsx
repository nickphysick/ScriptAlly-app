/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenCommunity — the dashboard's Community tile (community-tile pack P1; empty-state pack).
 *
 * ⚠️ PHASE 1 IS THE EMPTY STATE, AND PRE-LAUNCH THAT IS THE HONEST STATE. There is no cohort yet;
 * the aggregate collection this will read does not exist. So the tile renders one message, always,
 * and no cross-user data is fetched, derived or imagined here.
 *
 * ⚠️ AND WHEN THE FIGURES ARRIVE, THE APPRAISAL LAW LANDS WITH THEM — recorded here now because
 * this tile is where it would break first. A band of other writers' numbers invites a verdict, and
 * the verdict is what the design refuses: no adjectives (ahead, behind, on track, healthy), no
 * ranking or percentile, no colour that changes with the reader's position. The band is shown, the
 * reader's place on it is shown, and no sentence interprets either.
 *
 * ⚠️ THE CENTRED HERO IS BAKED, and the ghost-preview alternative was REJECTED: empty stat tracks
 * read as a data shape, and this app does not display figures it cannot stand behind. An empty
 * state that mimics the populated one is a promise about numbers that do not exist.
 */
import React from "react";
import { Skel } from "./OneScreenDashboard";
import { OneScreenMark } from "./OneScreenMark";
import seedling from "../../assets/shell/new-shoots-icon.png";

/**
 * ⚠️ VERBATIM COPY, and it REPLACED a different verbatim string — the earlier "You're early…"
 * paragraph. Both were stated by their pack; this one is current. No appraisal, no encouragement,
 * no exclamation: nothing else in the app uses one, which is also why the button below is
 * "Spread the word" and not "Spread the word!".
 */
export const COMMUNITY_EMPTY =
  "As our community builds, you'll be able to benchmark your key stats against other writers at a similar stage.";

export const OneScreenCommunity: React.FC<{ loading: boolean }> = ({ loading }) => (
  <div className={`os-card os-comm${loading ? " isload" : ""}`}>
    {loading && <Skel bars={["h", "", ""]} />}
    <div className="os-ahead os-commhead">
      {/* ⚠️ THE SHARED SLOT, NOT A FOURTH COPY. This was a bespoke `.os-commic` span holding a
          lucide `<Users />` at its own size with no plate; the other three bands already shared
          `OneScreenMark`. Reading the map buys the 28px plate, its translucent parchment fill and
          burgundy inset hairline, the swap-ready geometry and the 404 degrade path — and means an
          illustrated Community mark lands the same one-line way as every other header's. */}
      <OneScreenMark name="community" />
      <h2>Community</h2>
      {/* ⚠️ THE BETA CHIP STAYS UNTIL THE COHORTS ARE POPULATED ENOUGH THAT MOST READERS SEE REAL
          FIGURES — it is a statement about the DATA's maturity, not the code's. */}
      <span className="os-commbeta">BETA</span>
    </div>
    {/* ⚠️ THE BODY CENTRES ITSELF AND THE `margin-top: auto` FOOTER IS GONE WITH THE LEFT-ALIGNED
        paragraph it balanced. The tile still FILLS a row whose height the TASKS card sets — but a
        centred column fills by centring, so a spacer would now push the hero off-centre rather
        than hold it in place. The tile must never be the taller card; if it grows past tasks the
        fix is to shrink the seedling, never to stretch tasks. */}
    <div className="os-commbody">
      {/* Decorative: the sentence beneath carries the meaning, so the illustration is announced to
          nobody. `alt=""` AND `aria-hidden` — belt and braces, since a decorative image with a
          filename-derived accessible name is the usual way this leaks. */}
      <img className="os-commseed" src={seedling} alt="" aria-hidden="true" />
      <p className="os-commempty">{COMMUNITY_EMPTY}</p>
      {/* ⚠️ INERT IN PHASE 1, AND `disabled` RATHER THAN A SILENT NO-OP. A button that looks live
          and does nothing is worse than one that says it is not ready: the pack forbids a
          placeholder handler, and an enabled control with no `onClick` is exactly that.
          TODO(phase-2): wire to copy the share URL and confirm through the global toast
          (`useToast`, which recon confirmed exists app-wide) — then drop `disabled`. */}
      <button type="button" className="os-commshare" disabled>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}
             strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="18" cy="5" r="2.6" /><circle cx="6" cy="12" r="2.6" /><circle cx="18" cy="19" r="2.6" />
          <path d="M8.3 10.8l7.4-4.3M8.3 13.2l7.4 4.3" />
        </svg>
        Spread the word
      </button>
    </div>
  </div>
);
