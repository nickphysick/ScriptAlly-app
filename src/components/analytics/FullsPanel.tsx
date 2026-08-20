/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "Fulls under consideration" — the whole book, out with an agent, and how long it has been there.
 *
 * ⚠️ FULL SENT ONLY. A full that has been REQUESTED is not yet out and a Revise & Resubmit has come
 * back; neither is under consideration, and counting either would put a manuscript on a desk it is
 * not on. The dwell runs from the full's own send date, taken from the activity log.
 *
 * ⚠️ ITS CLOCK IS SEPARATE FROM THE QUERY HISTOGRAM'S, AND THE FOOTNOTE SAYS SO. Fulls sit for
 * months as a matter of course; folding these waits into the reply distribution would drag the
 * median for the question the writer is actually asking.
 *
 * ⚠️ THE LIST IS LONGEST-FIRST, WHICH IS NOT A RANKING. It is the order in which a reader wants
 * them — the one that has been out longest is the one they are wondering about — and the panel
 * attaches no meaning to being at the top.
 */
import React from "react";
import { StatusDot } from "../StatusDot";
import { QueryStatus } from "../../types";
import { AnalyticsRow, FULLS_NOTE, fullsUnderConsideration } from "../../lib/analytics";
import { IllustrationSlot } from "./IllustrationSlot";
import { shortDateYear } from "./chartPlumbing";
import { useOpenTarget } from "./useOpenTarget";

export const FullsPanel: React.FC<{ rows: AnalyticsRow[]; nowMs: number }> = ({ rows, nowMs }) => {
  const fulls = fullsUnderConsideration(rows, nowMs);
  const open = useOpenTarget();

  if (fulls.length === 0) {
    return (
      <div className="an-emptystate">
        {/* ILLUSTRATION SLOT · fulls empty state · 120×120 */}
        <IllustrationSlot art="post" size="empty" />
        <p>
          No full manuscripts out at the moment. When an agent asks for the whole book, its time
          with them is tracked here.
        </p>
      </div>
    );
  }

  return (
    <>
      {fulls.map((f) => (
        <button type="button" className="an-fullrow" key={f.queryId}
          onClick={open({ kind: "query", queryId: f.queryId })}
          aria-label={`Open ${f.agentName} in the Query Centre — full out ${f.dwellDays} ${f.dwellDays === 1 ? "day" : "days"}`}>
          <span className="an-fi">
            <StatusDot status={QueryStatus.FULL_SENT} overrideSize={30} decorative />
          </span>
          <div className="an-fullname">
            <b>{f.agentName}</b>
            <i>
              {f.agentSub ? `${f.agentSub} · ` : ""}full sent {shortDateYear(f.fullSentMs)}
            </i>
          </div>
          <div className="an-fd">
            <b>{f.dwellDays}</b>
            <i>{f.dwellDays === 1 ? "day with the agent" : "days with the agent"}</i>
          </div>
        </button>
      ))}
      <div className="an-guardnote">{FULLS_NOTE}</div>
    </>
  );
};

/** The band note: how many are out, or nothing at all when none are. */
export function fullsNote(rows: AnalyticsRow[], nowMs: number): string {
  const n = fullsUnderConsideration(rows, nowMs).length;
  return n === 0 ? "" : `${n} full${n === 1 ? "" : "s"} out`;
}
