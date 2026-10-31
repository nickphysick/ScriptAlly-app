/**
 * The analytics consent bar on the public pages.
 *
 * Shown only when a GA measurement id is built in (`.env.production`) and the visitor has not yet
 * answered. Both answers are one press and equally easy: "No thanks" loads nothing; "Accept" loads
 * Google Analytics (see `analytics.ts`). The footer's "Cookie choices" brings it back.
 *
 * ⚠️ IT DOES NOT BLOCK THE PAGE. No scrim, no focus trap: the site works the same whichever way
 * someone answers, or if they never do. It sits at the foot of the window over the ink frame.
 */
import React, { useEffect, useState } from "react";
import "./consentBar.css";
import {
  analyticsAvailable, CONSENT_EVENT, denyAnalytics, grantAnalytics, readConsent,
} from "./analytics";

export const CONSENT_COPY =
  "We'd like to use Google Analytics to count visits and see which pages help. " +
  "It sets cookies, so it only runs if you say yes.";

export const ConsentBar: React.FC<{ onPrivacy: () => void }> = ({ onPrivacy }) => {
  const [open, setOpen] = useState(() => analyticsAvailable() && readConsent() === null);

  useEffect(() => {
    const sync = () => setOpen(analyticsAvailable() && readConsent() === null);
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);

  if (!open) return null;
  return (
    <div className="mk-consent" role="region" aria-label="Cookie choices">
      <p className="mk-consent-text">
        {CONSENT_COPY}{" "}
        <button type="button" className="mk-consent-link" onClick={onPrivacy}>Privacy</button>
      </p>
      <div className="mk-consent-acts">
        <button type="button" className="mk-consent-no" onClick={denyAnalytics}>No thanks</button>
        <button type="button" className="mk-btn mk-btn--cream mk-consent-yes" onClick={grantAnalytics}>
          Accept
        </button>
      </div>
    </div>
  );
};
