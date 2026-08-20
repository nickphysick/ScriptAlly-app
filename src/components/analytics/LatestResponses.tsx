/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "Latest responses" — what has come back, most recent first.
 *
 * ⚠️ A REAL `<table>`, NOT A GRID OF DIVS. Four columns of the same four things per row is a table
 * by definition, and a screen reader given one can move by column and hear the header for the cell
 * it is on. A `role="table"` reconstruction out of divs is the same markup with more to go wrong.
 *
 * ⚠️ THE CHIPS RENDER `StatusDot`, the app's locked status glyph, rather than a coloured pill of
 * this page's own. The page already draws statuses in the funnel; two status languages on one page
 * is one too many.
 *
 * ⚠️ IT LISTS ONLY RESPONSES WITH A DATE, because a table sorted by "when" cannot hold a row that
 * has no when. A response logged before the activity log existed still counts everywhere a COUNT
 * is stated — it simply cannot take a place in a chronology.
 */
import React from "react";
import { StatusDot } from "../StatusDot";
import { AnalyticsRow, latestResponses } from "../../lib/analytics";
import { shortDateYear } from "./chartPlumbing";
import { useOpenTarget } from "./useOpenTarget";

const LIMIT = 7;

export const LatestResponses: React.FC<{ rows: AnalyticsRow[] }> = ({ rows }) => {
  const responses = latestResponses(rows, LIMIT);
  const open = useOpenTarget();

  if (responses.length === 0) {
    return (
      <div className="an-emptystate">
        <p>
          Nothing has come back in this period. As agents reply, the most recent land here with
          how long each took.
        </p>
      </div>
    );
  }

  return (
    <table className="an-table">
      <thead>
        <tr>
          <th scope="col">Agent</th>
          <th scope="col">Sent</th>
          <th scope="col">Outcome</th>
          <th scope="col">Took</th>
        </tr>
      </thead>
      <tbody>
        {responses.map((r) => (
          /* ⚠️ THE ROW IS CLICKABLE FOR A POINTER AND THE NAME IS A REAL BUTTON FOR EVERYTHING
             ELSE. Putting `role="button"` on the `<tr>` would trade away the table semantics that
             let a screen reader move by column and hear each cell's header — so the row keeps
             being a row, and the door inside it is a control. */
          <tr key={r.queryId} className="an-trow" onClick={open({ kind: "query", queryId: r.queryId })}>
            <td>
              <button type="button" className="an-rowbtn"
                onClick={open({ kind: "query", queryId: r.queryId })}
                aria-label={`Open ${r.agentName} in the Query Centre`}>
                <span className="an-agname">{r.agentName}</span>
                {r.agentSub ? <span className="an-agsub">{r.agentSub}</span> : null}
              </button>
            </td>
            <td className="an-tdate">{r.sentMs === null ? "—" : shortDateYear(r.sentMs)}</td>
            <td>
              <span className="an-chip">
                <StatusDot status={r.dotStatus} overrideSize={13} decorative />
                {r.chipLabel}
              </span>
            </td>
            <td>
              {/* ⚠️ AN EM DASH WHERE THE WAIT IS NOT DERIVABLE — never a zero, which would assert
                  an instant reply the data never recorded. */}
              {r.replyDays === null ? (
                <span className="an-days">—</span>
              ) : (
                <span className="an-days">
                  {r.replyDays}
                  <small> {r.replyDays === 1 ? "day" : "days"}</small>
                </span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

/** The band note: how many are shown, and out of how many when the list is capped. */
export function latestResponsesNote(rows: AnalyticsRow[]): string {
  const all = latestResponses(rows, Number.MAX_SAFE_INTEGER).length;
  if (all === 0) return "";
  /* ⚠️ THE CAP IS STATED. "The most recent 7" reads as everything unless it says otherwise. */
  return all > LIMIT ? `Most recent ${LIMIT} of ${all}` : `${all} in this period`;
}
