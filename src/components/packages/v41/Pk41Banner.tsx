/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v41 Part B (ref option D, screens 01 and 13) — the founding writer strip: a full-width blush band
 * at the very top of the page sheet, above the header. Only for founding writers (`packagesViaFounding`: the page is
 * open to them through founding access, not a paid plan), and only until they dismiss it; the dismissal is one leaf on
 * the user, so it holds on every device. While it shows, the shell's folder tab turns the strip's colour (pk41.css B,
 * which keys on `[data-pk41-fb]` being mounted on the page that is on screen).
 *
 * "Tell us what you think" opens the app's FeedbackDock. ⚠️ THE DOCK TAKES NO TOPIC: `openFeedback()` has no argument.
 * What it records as the page is the shell's own page name for this route (WorkspaceShell's `setFeedbackPage`), so a
 * message sent from here is already filed against Submission packages.
 */
import React from "react";
import { openFeedback } from "../../../lib/feedbackStore";
import { FOUNDING_ASK, FOUNDING_LEAD, FOUNDING_REST, FOUNDING_TAG } from "../../../lib/packagesV41";

export const FLEDGLING_SRC = "/images/founding/founding-fledgling.png";

export const Pk41Banner: React.FC<{ onDismiss: () => void }> = ({ onDismiss }) => (
  <aside className="p41-fb" aria-label="Founding writer note" data-pk41="banner" data-pk41-fb="">
    <div className="p41-fb-in">
      <img className="p41-fb-img" src={FLEDGLING_SRC} alt="" aria-hidden="true" />
      <span className="p41-fb-tag">{FOUNDING_TAG}</span>
      <p className="p41-fb-tx" data-pk41="banner-text"><b>{FOUNDING_LEAD}</b> <span>{FOUNDING_REST}</span></p>
      <button type="button" className="p41-fb-go" data-pk41="banner-ask" onClick={() => openFeedback()}>{FOUNDING_ASK}</button>
      <button type="button" className="p41-fb-x" aria-label="Dismiss the founding writer note" data-pk41="banner-x" onClick={onDismiss}>✕</button>
    </div>
  </aside>
);
