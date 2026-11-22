/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD FIRST VISIT v2, Part G — THE NUDGE-EMAIL ASK (ref design-refs/dashboard-first-visit-v2/, screens 11–12).
 *
 * In the feed, under the first query's row, once per account: a bell, "Want an email when a nudge is due?", the
 * sentence naming the agent, and Yes, email me / Not now. Yes writes `notifyPrefs.nudges` (one leaf) and the card
 * becomes one line with "Change in Settings"; Not now records that it was asked, and nothing shows.
 */
import React from "react";
import { REMINDER } from "../../../lib/dashFirstVisit";

const Bell = () => (<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16V11a6 6 0 1112 0v5l2 2H4z" /><path d="M10 20a2 2 0 004 0" /></svg>);

export const ReminderAsk: React.FC<{ agentFirst: string; onYes: () => void; onNotNow: () => void }> = ({ agentFirst, onYes, onNotNow }) => (
  <section className="fv2-ask" data-fv2="reminder-ask" aria-label={REMINDER.title}>
    <span className="fv2-askbell"><Bell /></span>
    <div className="fv2-askw">
      <b>{REMINDER.title}</b>
      <p>{REMINDER.text(agentFirst)}</p>
      <div className="fv2-askrow">
        <button type="button" className="fv2-askyes" data-fv2="reminder-yes" onClick={onYes}>{REMINDER.yes}</button>
        <button type="button" className="fv2-askno" data-fv2="reminder-not-now" onClick={onNotNow}>{REMINDER.notNow}</button>
      </div>
    </div>
  </section>
);

export const ReminderDone: React.FC<{ onSettings: () => void }> = ({ onSettings }) => (
  <div className="fv2-askdone" data-fv2="reminder-done" role="status">
    <span className="fv2-askbell"><Bell /></span>
    <span className="fv2-askdt">{REMINDER.done}</span>
    <button type="button" className="fv2-askset" data-fv2="reminder-settings" onClick={onSettings}>{REMINDER.settings}</button>
  </div>
);
