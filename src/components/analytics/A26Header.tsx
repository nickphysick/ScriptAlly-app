/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics v26 §A — the page's header: the shared workspace header (shell/WorkspaceNavyHeader, as Queries, the
 * Contact list and Query letters draw it), with the Archivist in its art column.
 *
 *   headline   "{sent} queries, {replies} replies" ("1 query", "1 reply", "no replies yet"); "Analytics" on day one
 *   by-line    "for {manuscript}"
 *   buttons    "Record a response" (filled) and "How it works" (outline, the page guide); day one: "Log your first query"
 *   right      "Asked to read more" / "{asked} of {sent}" / "Most writers see about 1 in {M}." (the third line only
 *              while SHOW_OUTSIDE_COMPARISON); with no reply yet: "Your oldest query has been out" / "{weeks}" /
 *              "No replies recorded yet."; nothing on day one
 *   slim bar   "Analytics" · "Asked to read more {asked} of {sent}" · "Record a response"
 *
 * ⚠️ NO LOOK OF ITS OWN: every measurement is the shared header's, so its edges and height are Queries'.
 */
import React from "react";
import { WorkspaceNavyHeader, WsnhWords } from "../shell/WorkspaceNavyHeader";
import { wk } from "../../lib/analyticsV26";

/** "27 queries, 10 replies"; "1 query, 1 reply"; "5 queries, no replies yet". */
export function a26Title(sent: number, replies: number): string {
  const q = `${sent} ${sent === 1 ? "query" : "queries"}`;
  return replies === 0 ? `${q}, no replies yet` : `${q}, ${replies} ${replies === 1 ? "reply" : "replies"}`;
}
export const A26_DAY_ONE_TITLE = "Analytics";

export const A26Header: React.FC<{
  loading: boolean;
  /** no queries (day one), or no manuscript at all */
  dayOne: boolean;
  noMs: boolean;
  sent: number;
  replies: number;
  asked: number;
  oldestWeeks: number | null;
  msTitle: string | null;
  /** "Most writers see about 1 in {M}." — null when the outside comparison is off */
  mostOneIn: number | null;
  onRecord: () => void;
  onGuide: () => void;
  onLog: () => void;
}> = ({ loading, dayOne, noMs, sent, replies, asked, oldestWeeks, msTitle, mostOneIn, onRecord, onGuide, onLog }) => {
  const filled = !dayOne && !noMs;
  const title = filled ? a26Title(sent, replies) : A26_DAY_ONE_TITLE;
  const right = !filled ? null : replies > 0 ? (
    <WsnhWords lead="Asked to read more" name={<span data-a26="hd-asked">{asked} of {sent}</span>}
      sub={mostOneIn !== null ? <span data-a26="hd-most">Most writers see about 1 in {mostOneIn}.</span> : undefined} />
  ) : oldestWeeks !== null ? (
    <WsnhWords lead="Your oldest query has been out" name={<span data-a26="hd-oldest">{wk(oldestWeeks)}</span>} sub="No replies recorded yet." />
  ) : null;
  return (
    <WorkspaceNavyHeader page="analytics" art="analytics-header" loading={loading}
      title={<span data-a26="title">{title}</span>}
      forLine={msTitle && !noMs ? { lead: "for", text: msTitle } : null}
      actions={noMs ? null : filled ? <>
        <button type="button" className="qc1531-b qc1531-b--n" data-a26="record" onClick={onRecord} disabled={loading}>Record a response</button>
        <button type="button" className="qc1531-b qc1531-b--g" data-a26="guide" onClick={onGuide} disabled={loading}>How it works</button>
      </> : <>
        <button type="button" className="qc1531-b qc1531-b--n" data-a26="log-first" onClick={onLog} disabled={loading}>Log your first query</button>
        <button type="button" className="qc1531-b qc1531-b--g" data-a26="guide" onClick={onGuide} disabled={loading}>How it works</button>
      </>}
      right={right}
      bar={noMs ? null : filled ? {
        title: "Analytics",
        /* the mock: nothing beside the bar until the first reply */
        aside: replies > 0 ? <><em>Asked to read more</em> <b data-a26="slim-asked">{asked} of {sent}</b></> : null,
        button: { label: "Record a response", onClick: onRecord },
      } : { title: "Analytics", button: { label: "Log your first query", onClick: onLog } }} />
  );
};
