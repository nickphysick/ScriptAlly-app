/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "On the horizon" — the one panel on this page that looks forward.
 *
 * ⚠️ IT IS STILL A REPORT, NOT A PROMPT. It says which stated windows close in the next four weeks
 * and when; it does not tell the writer to nudge, chase or follow up. Whether a closing window is
 * worth acting on depends on the agency, the manuscript and the writer's own nerve, and none of
 * those is something this page can see. Deciding what to do about it is the To-do board's job.
 *
 * ⚠️ AND A WINDOW IS THE AGENCY'S OWN STATED FIGURE, NOT A DEADLINE THIS APP INVENTED. Nothing here
 * hard-codes twelve weeks or any other threshold: a query appears only when its agent record
 * carries a `responseTimeWeeks`, and the date shown is that number of weeks from the send.
 *
 * ⚠️ ALREADY-PAST WINDOWS ARE COUNTED APART FROM THE COUNTDOWN, deliberately. Folding them in
 * would make "closes in 3 days" and "closed a month ago" the same kind of row, and they are not:
 * one is approaching and the other has been and gone.
 */
import React from "react";
import { StatusDot } from "../StatusDot";
import { QueryStatus } from "../../types";
import { AnalyticsRow, HORIZON_DAYS, horizonSet } from "../../lib/analytics";
import { shortDateYear } from "./chartPlumbing";

export const Horizon: React.FC<{ rows: AnalyticsRow[]; nowMs: number }> = ({ rows, nowMs }) => {
  const set = horizonSet(rows, nowMs);

  if (set.soon.length === 0) {
    return (
      <div className="an-horizonempty">
        {set.past > 0
          ? `No stated windows close in the next four weeks. ${set.past} ${set.past === 1 ? "has" : "have"} already passed ${set.past === 1 ? "its" : "theirs"}.`
          : "No stated windows close in the next four weeks. As one approaches, the query appears here with its date."}
      </div>
    );
  }

  return (
    <div className="an-horizonrow">
      {set.soon.map((h) => (
        <div className="an-hcard" key={h.queryId}>
          {/* the query is still out, so it is drawn as what it is */}
          <StatusDot status={QueryStatus.QUERIED} overrideSize={26} decorative />
          <div className="an-hn">
            <b>{h.agentName}</b>
            <i>
              {h.agentSub ? `${h.agentSub} · ` : ""}window closes {shortDateYear(h.closesMs)}
            </i>
          </div>
          <div className="an-hd">
            <b>{h.daysLeft}</b>
            <i>{h.daysLeft === 1 ? "day left" : "days left"}</i>
          </div>
        </div>
      ))}
    </div>
  );
};

/** The band note: how many close soon, and — separately — how many are already past. */
export function horizonNote(rows: AnalyticsRow[], nowMs: number): string {
  const set = horizonSet(rows, nowMs);
  const past = set.past ? `${set.past} already past` : "";
  if (set.soon.length === 0) return past || `Nothing closing in the next ${HORIZON_DAYS} days`;
  const soon = `${set.soon.length} stated ${set.soon.length === 1 ? "window closes" : "windows close"} in the next four weeks`;
  return past ? `${soon} · ${past}` : soon;
}

/** Whether the panel has anything at all to say — a panel with nothing in it is not rendered. */
export const horizonWorthShowing = (rows: AnalyticsRow[], nowMs: number): boolean => {
  const set = horizonSet(rows, nowMs);
  return set.soon.length > 0 || set.past > 0;
};
