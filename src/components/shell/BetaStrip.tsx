/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The beta strip — one honest sentence above the workspace (ref:
 * design-refs/scriptally-beta-pack.html, exhibit 02).
 *
 * ⚠️ IT SITS OUTSIDE THE PAGE GRID AND TAKES NO PART IN THE HEADER'S ARITHMETIC. The workspace
 * header's collapse and its scroll-invariance padding are computed inside `.wpg`; this strip is a
 * sibling of the whole shell, so `--wpg-reclaim-pad` and the collapse trigger cannot see it. That
 * separation is the condition this phase was allowed under, not an implementation detail.
 *
 * ⚠️ DISMISSAL IS PER SESSION. A beta notice dismissed in March should be back next time the app
 * opens: what it says is still true, and the known-issues link is what stops the same three faults
 * being reported over and over.
 *
 * ⚠️ NO MODAL, EVER. The thing being said is "expect rough edges" — a sentence that stops the app
 * to say it makes the beta sound more alarming than it is.
 */

import React, { useState } from "react";
import {
  BETA_MODE, BETA_PILL, BETA_STRIP_LEAD, BETA_STRIP_REPORT_LINK, BETA_STRIP_KNOWN_LINK,
  BETA_STRIP_DISMISSED_KEY,
} from "../../lib/beta";

const readDismissed = (): boolean => {
  try { return window.sessionStorage.getItem(BETA_STRIP_DISMISSED_KEY) === "1"; } catch { return false; }
};

export const BetaStrip: React.FC<{
  /** Opens the feedback dock — the same panel the dock's own button opens. */
  onReport: () => void;
  /** Known issues. Absent while there is nowhere to send them — see the render. */
  onKnownIssues?: () => void;
}> = ({ onReport, onKnownIssues }) => {
  const [dismissed, setDismissed] = useState(readDismissed);

  if (!BETA_MODE || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try { window.sessionStorage.setItem(BETA_STRIP_DISMISSED_KEY, "1"); } catch { /* private mode */ }
  };

  return (
    <div className="sa-betastrip" role="note">
      <span className="sa-betapill">{BETA_PILL}</span>
      <p>
        {BETA_STRIP_LEAD}
        <button type="button" onClick={onReport}>{BETA_STRIP_REPORT_LINK}</button>
        {/* ⚠️ THE KNOWN-ISSUES LINK RENDERS ONLY WHEN IT HAS SOMEWHERE TO GO. There is no issues
            page yet; a link to nothing teaches a beta user that the strip is decoration, which is
            the one thing it cannot afford to be. The ref draws it, so the slot exists — but an
            absent link is honest and a dead one is not. */}
        {onKnownIssues ? (
          <> . <button type="button" onClick={onKnownIssues}>{BETA_STRIP_KNOWN_LINK}</button>.</>
        ) : (
          "."
        )}
      </p>
      <button type="button" className="sa-betax" onClick={dismiss} aria-label="Dismiss">×</button>
    </div>
  );
};
