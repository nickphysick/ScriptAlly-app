/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v3 · the nudge-email ask as one line (Phase 2; ref design-refs/dashboard-v3.html, the feed).
 *
 * A bell, "Email me when a nudge is due", Yes and Not now. The same two answers as first visit v2's card (Part G),
 * with the same handlers: Yes writes `notifyPrefs.nudges`, Not now records that it was asked. It sits where the card did.
 */
import React from "react";

export const REMINDER_LINE = "Email me when a nudge is due";
export const REMINDER_YES_SHORT = "Yes";
export const REMINDER_NOT_NOW_SHORT = "Not now";

const Bell = () => (<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16V11a6 6 0 1112 0v5l2 2H4z" /><path d="M10 20a2 2 0 004 0" /></svg>);

export const Dash3Reminder: React.FC<{ onYes: () => void; onNotNow: () => void }> = ({ onYes, onNotNow }) => (
  <section className="d3-mail" data-fv2="reminder-ask" data-d3="reminder" aria-label={REMINDER_LINE}>
    <Bell />
    <span>{REMINDER_LINE}</span>
    <button type="button" data-fv2="reminder-yes" onClick={onYes}>{REMINDER_YES_SHORT}</button>
    <button type="button" className="is-x" data-fv2="reminder-not-now" onClick={onNotNow}>{REMINDER_NOT_NOW_SHORT}</button>
  </section>
);
