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
 * no exclamation: nothing else in the app uses one.
 *
 * ⚠️ AND IT IS NOW THE TILE'S ONLY WORDS. The share button that sat beneath it is REMOVED — see the
 * note on the body below. A sentence that was written to sit above a call to action is carrying the
 * whole tile on its own, so it must keep reading as a statement rather than a lead-in.
 */
/* ⚠️ SHORTENED TO THE REF'S OWN SENTENCE (v26). The old line opened "As our community builds,
   you'll be able to…" — a lead-in that a full-width strip had room for and a 360px tile does not:
   it wrapped to three lines and made the tile 113.5px against the ref's 94.6. The fact is
   unchanged and still stated as a fact rather than a promise; what went is the preamble. ONE
   sentence still, for one feature, in one component. */
export const COMMUNITY_EMPTY =
  "Benchmark your key stats against writers at a similar stage.";

/**
 * ⚠️ TWO LAYOUTS, ONE COMPONENT AND ONE SET OF WORDS (ref v22, Phase 3).
 *
 * As a column card it competed for height with the work and had to be told not to be the taller
 * card; as a STRIP under both columns it states what it is on one row and gets out of the way.
 * What it says is identical in both, which is the argument for a layout prop over a second
 * component: a fork here would be two surfaces free to disagree about a feature that is one
 * sentence long.
 */
export const OneScreenCommunity: React.FC<{ loading: boolean; strip?: boolean; tile?: boolean }> = ({ loading, strip = false, tile = false }) =>
  /* ⚠️ THE TILE IS v26's, AND IT REPLACES THE STRIP RATHER THAN JOINING IT. v22 put Community in a
     full-width band under both columns; v26 puts it back in the right column, beneath Activity, at
     the column's own 360px. Same one sentence, same one component — a fork here would be two
     surfaces free to disagree about a feature that is one sentence long. */
  tile ? (
    <div className={`os-card os-comtile${loading ? " isload" : ""}`} data-probe="community-tile">
      <span className="os-commbeta">Beta</span>
      {/* ⚠️ THE REAL PLANT, AT 84px — NOT `OneScreenMark` (v29, Phase 6). The tile was drawing the
          header-mark slot's 40px monoline placeholder while the card variant of this same component
          rendered the finished asset a few lines below. Two branches of one component, one of them
          on the placeholder: the tile is what ships, so the tile gets the artwork.
          ⚠️ AND THE REF'S SVG IS NOT PORTED. The ref draws its own inline plant because a mockup has
          no asset pipeline; ours is a committed PNG, and porting the placeholder over the finished
          thing would be shipping the mockup's stand-in on top of the real one.
          Decorative, so `alt=""` AND `aria-hidden` — a decorative image with a filename-derived
          accessible name is the usual way this leaks. */}
      <img className="os-commseed" src={seedling} alt="" aria-hidden="true" />
      <div className="os-comtiletx">
        <h4>Community</h4>
        <p>{COMMUNITY_EMPTY}</p>
      </div>
    </div>
  ) : strip ? (
    <div className={`os-comstrip${loading ? " isload" : ""}`} data-probe="community-strip">
      <OneScreenMark name="community" />
      <div className="os-comstriptx">
        <h2>Community</h2>
        <p>{COMMUNITY_EMPTY}</p>
      </div>
      {/* ⚠️ STILL A STATEMENT ABOUT THE DATA'S MATURITY, NOT THE CODE'S — it stays until the
          cohorts are populated enough that most readers see real figures. */}
      <span className="os-commbeta">BETA</span>
    </div>
  ) : (
  <div className={`os-card os-comm${loading ? " isload" : ""}`} data-probe="community-card">
    {loading && <Skel bars={["h", "", ""]} />}
    {/* ⚠️ NO BAND (dashboard redesign, Phase 7) — matching every other card. `.os-ahead` still
        supplies the header's GEOMETRY (its 51px height and its padding, so four headers agree
        structurally rather than by four values kept in step by hand); what it no longer supplies is
        a fill, because Phase 2 took the gradient and the hairline off the class itself.

        ⚠️ AND THE BETA PILL SITS ON THE CARD NOW, which is a change of ground rather than of
        meaning: it is still a statement about the DATA's maturity, not the code's, and it stays
        until the cohorts are populated enough that most readers see real figures. */}
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
        fix is to shrink the seedling, never to stretch tasks.

        ⚠️ THE SHARE BUTTON IS REMOVED, AND THE CENTRING NEEDED NO CHANGE TO SURVIVE IT — which is
        the point of centring rather than spacing. `justify-content: center` centres whatever the
        column contains, so dropping a child re-centres the remaining two by construction; a
        `margin-top: auto` footer would have left the pair pinned where the three used to sit.
        (Browser-verified after the removal, not assumed: the seedling+copy block is centred in the
        body box to within a pixel.) `.os-commshare` went with it, rule and element together —
        a leftover rule is how a deleted control comes back. */}
    <div className="os-commbody">
      {/* Decorative: the sentence beneath carries the meaning, so the illustration is announced to
          nobody. `alt=""` AND `aria-hidden` — belt and braces, since a decorative image with a
          filename-derived accessible name is the usual way this leaks. */}
      <img className="os-commseed" src={seedling} alt="" aria-hidden="true" />
      <p className="os-commempty">{COMMUNITY_EMPTY}</p>
    </div>
  </div>
);
