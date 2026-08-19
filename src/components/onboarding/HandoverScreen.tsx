/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The handover — the seam at the end of onboarding (ref:
 * design-refs/scriptally-onboarding-chrome-options.html, option E).
 *
 * ⚠️ IT REPORTS WHAT WAS CAPTURED AND NAMES WHERE YOU ARE GOING. Those are the two jobs. It does
 * not congratulate, it does not celebrate, and it carries no illustration — a writer who has just
 * entered their querying history has done admin, and being applauded for it is the app forming a
 * view about their position.
 *
 * ⚠️ IT NEVER RENDERS WITH NOTHING TO REPORT. `shouldHandOver` is checked by the caller; a tally of
 * zeroes is not a quiet version of this screen, it is a different screen that does not exist.
 */

import React from "react";
import { OnboardingCard, InboxMotif } from "./chrome";
import {
  HANDOVER_EYEBROW, HANDOVER_GHOST, HANDOVER_HEADING, HANDOVER_PRIMARY, HANDOVER_SUB,
  HandoverTally, handoverDestinationNote, handoverTiles,
} from "../../lib/onboardingHandover";

export const HandoverScreen: React.FC<{
  tally: HandoverTally;
  /** The named destination — the Query Centre. */
  onOpenQueryCentre: () => void;
  /** The quieter second exit. */
  onDashboard: () => void;
}> = ({ tally, onOpenQueryCentre, onDashboard }) => {
  const tiles = handoverTiles(tally);
  const note = handoverDestinationNote(tally.queries);

  return (
    <OnboardingCard
      pre={HANDOVER_EYEBROW}
      name={HANDOVER_HEADING}
      sub={HANDOVER_SUB}
      motif={<InboxMotif />}
      primaryLabel={HANDOVER_PRIMARY}
      onPrimary={onOpenQueryCentre}
    >
      {/* ⚠️ ONLY THE TILES THAT HAVE A NUMBER. A zero rendered proudly beside two real figures is
          the app remarking on what did not happen. */}
      <div className="ob-tally">
        {tiles.map((t) => (
          <div className="ob-tal" key={t.label}>
            <div className="ob-taln">{t.n}</div>
            <div className="ob-tall">{t.label}</div>
          </div>
        ))}
      </div>

      <div className="ob-next">
        <span className="ob-nextrule" aria-hidden="true" />
        <p><strong>{note.lead}</strong>{note.rest}</p>
      </div>

      {/* The second exit. Ghost, because the named destination is the one that follows from what
          was just captured — but leaving for the dashboard is a real choice, not a trap door. */}
      <button type="button" className="ob-handghost" onClick={onDashboard}>
        {HANDOVER_GHOST}
      </button>
    </OnboardingCard>
  );
};
